package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/mmt/multicast-tester/internal/model"
)

type sessionState int

const (
	stateIdle    sessionState = iota
	stateRunning sessionState = iota
	statePaused  sessionState = iota
	stateStopped sessionState = iota
)

func (s sessionState) String() string {
	switch s {
	case stateIdle:
		return "idle"
	case stateRunning:
		return "running"
	case statePaused:
		return "paused"
	case stateStopped:
		return "stopped"
	default:
		return "unknown"
	}
}

type Session struct {
	mu        sync.Mutex
	config    model.SessionConfig
	state     sessionState
	sender    *Sender
	receiver  *Receiver
	cancel    context.CancelFunc
	startedAt time.Time
	hub       ReceiverHub
	store     MessageSaver
}

func NewSession(cfg model.SessionConfig, hub ReceiverHub, store MessageSaver) *Session {
	return &Session{
		config: cfg,
		state:  stateIdle,
		hub:    hub,
		store:  store,
	}
}

func (s *Session) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state == stateRunning {
		return fmt.Errorf("session already running")
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel
	s.startedAt = time.Now()
	s.state = stateRunning

	var err error
	if s.config.Mode == "send" {
		s.sender, err = NewSender(&s.config, s.hub, s.store)
		if err != nil {
			cancel()
			s.state = stateIdle
			return err
		}
		if s.config.SendMode == "periodic" {
			go s.sender.RunPeriodic(ctx)
		} else {
			go func() {
				s.sender.RunOneShot(ctx)
				s.mu.Lock()
				s.state = stateStopped
				s.mu.Unlock()
			}()
		}
	} else {
		s.receiver, err = NewReceiver(&s.config, s.hub, s.store)
		if err != nil {
			cancel()
			s.state = stateIdle
			return err
		}
		go s.receiver.Listen(ctx)
	}

	return nil
}

func (s *Session) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		s.cancel()
	}
	if s.sender != nil {
		s.sender.Close()
		s.sender = nil
	}
	if s.receiver != nil {
		s.receiver.Close()
		s.receiver = nil
	}
	s.state = stateStopped
}

func (s *Session) Pause() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state != stateRunning {
		return
	}
	s.state = statePaused
	if s.cancel != nil {
		s.cancel()
		s.cancel = nil
	}
	// Close transport so the port is freed; Resume reopens it.
	if s.sender != nil {
		s.sender.Close()
		s.sender = nil
	}
	if s.receiver != nil {
		s.receiver.Close()
		s.receiver = nil
	}
}

func (s *Session) Resume() error {
	s.mu.Lock()
	if s.state != statePaused {
		s.mu.Unlock()
		return fmt.Errorf("session not paused")
	}
	s.state = stateIdle
	s.mu.Unlock()
	// Start() acquires its own lock — must NOT hold lock here.
	return s.Start()
}

func (s *Session) Status() model.SessionStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	status := model.SessionStatus{
		ID:    s.config.ID,
		Name:  s.config.Name,
		State: s.state.String(),
		Mode:  s.config.Mode,
	}
	if !s.startedAt.IsZero() {
		status.StartedAt = s.startedAt.Format(time.RFC3339)
	}
	if s.sender != nil {
		status.Sent, status.BytesSent = s.sender.Stats()
	}
	if s.receiver != nil {
		status.Received, status.BytesRecv = s.receiver.Stats()
	}
	return status
}

func (s *Session) Config() model.SessionConfig {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.config
}
