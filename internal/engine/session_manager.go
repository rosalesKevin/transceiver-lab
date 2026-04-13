package engine

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/mmt/multicast-tester/internal/model"
)

type SessionManager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	hub      ReceiverHub
	store    MessageSaver
}

func NewSessionManager(hub ReceiverHub, store MessageSaver) *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*Session),
		hub:      hub,
		store:    store,
	}
}

func (m *SessionManager) Create(cfg model.SessionConfig) (*Session, error) {
	if cfg.ID == "" {
		cfg.ID = uuid.NewString()
	}
	// Defaults
	if cfg.TTL == 0 {
		cfg.TTL = 32
	}
	if cfg.Port == 0 {
		cfg.Port = 6969
	}
	if cfg.MulticastAddr == "" {
		cfg.MulticastAddr = "239.2.3.1"
	}

	sess := NewSession(cfg, m.hub, m.store)

	m.mu.Lock()
	m.sessions[cfg.ID] = sess
	m.mu.Unlock()

	return sess, nil
}

func (m *SessionManager) Get(id string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	sess, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session %q not found", id)
	}
	return sess, nil
}

func (m *SessionManager) List() []model.SessionStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var statuses []model.SessionStatus
	for _, sess := range m.sessions {
		statuses = append(statuses, sess.Status())
	}
	if statuses == nil {
		statuses = []model.SessionStatus{}
	}
	return statuses
}

func (m *SessionManager) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	sess, ok := m.sessions[id]
	if !ok {
		return fmt.Errorf("session %q not found", id)
	}
	sess.Stop()
	delete(m.sessions, id)
	return nil
}

func (m *SessionManager) StopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, sess := range m.sessions {
		sess.Stop()
	}
}
