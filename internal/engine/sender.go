package engine

import (
	"context"
	"encoding/hex"
	"fmt"
	"net"
	"strings"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/mmt/multicast-tester/internal/model"
	"github.com/mmt/multicast-tester/internal/netutil"
)

type SendStats struct {
	Sent      int64
	BytesSent int64
	LastTx    time.Time
	StartedAt time.Time
}

type Sender struct {
	config *model.SessionConfig
	conn   *net.UDPConn
	stats  SendStats
	sent   atomic.Int64
	bytes  atomic.Int64
	hub    StatusBroadcaster
	store  MessageSaver
}

type StatusBroadcaster interface {
	BroadcastSessionStatus(status model.SessionStatus)
}

type MessageSaver interface {
	Save(r *model.MessageRecord) error
}

func NewSender(cfg *model.SessionConfig, hub StatusBroadcaster, store MessageSaver) (*Sender, error) {
	conn, err := netutil.DialMulticast(cfg.InterfaceName, cfg.MulticastAddr, cfg.Port, cfg.TTL, cfg.Loopback)
	if err != nil {
		return nil, fmt.Errorf("dial multicast: %w", err)
	}
	return &Sender{
		config: cfg,
		conn:   conn,
		hub:    hub,
		store:  store,
	}, nil
}

func (s *Sender) RunOneShot(ctx context.Context) error {
	data := []byte(renderMessage(s.config.Content, 0))
	n, err := netutil.SendTo(s.conn, data, s.config.MulticastAddr, s.config.Port)
	if err != nil {
		return err
	}
	s.recordTx(data, n)
	return nil
}

func (s *Sender) RunPeriodic(ctx context.Context) {
	interval := time.Duration(s.config.IntervalMs) * time.Millisecond
	if interval < 100*time.Millisecond {
		interval = 100 * time.Millisecond
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	s.stats.StartedAt = time.Now()
	seq := uint64(0)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			content := s.config.Content
			if s.config.DynamicFields {
				content = renderMessage(content, seq)
			}
			data := []byte(content)
			n, err := netutil.SendTo(s.conn, data, s.config.MulticastAddr, s.config.Port)
			if err == nil {
				s.recordTx(data, n)
				s.broadcastStatus()
			}
			seq++
		}
	}
}

func (s *Sender) Close() {
	if s.conn != nil {
		s.conn.Close()
	}
}

func (s *Sender) Stats() (sent int64, bytes int64) {
	return s.sent.Load(), s.bytes.Load()
}

func (s *Sender) recordTx(data []byte, n int) {
	s.sent.Add(1)
	s.bytes.Add(int64(n))
	dest := fmt.Sprintf("%s:%d", s.config.MulticastAddr, s.config.Port)
	if s.store != nil {
		s.store.Save(&model.MessageRecord{
			SessionID: s.config.ID,
			Direction: "tx",
			Timestamp: time.Now().UTC(),
			DestAddr:  dest,
			Format:    s.config.Format,
			Content:   string(data),
			RawHex:    hex.EncodeToString(data),
			SizeBytes: n,
		})
	}
}

func (s *Sender) broadcastStatus() {
	if s.hub == nil {
		return
	}
	sent := s.sent.Load()
	bytes := s.bytes.Load()
	s.hub.BroadcastSessionStatus(model.SessionStatus{
		ID:        s.config.ID,
		Name:      s.config.Name,
		State:     "running",
		Mode:      "send",
		Sent:      sent,
		BytesSent: bytes,
	})
}

// renderMessage replaces dynamic field placeholders.
func renderMessage(content string, seq uint64) string {
	now := time.Now().UTC().Format(time.RFC3339)
	content = strings.ReplaceAll(content, "{{timestamp}}", now)
	content = strings.ReplaceAll(content, "{{seq}}", fmt.Sprintf("%d", seq))
	content = strings.ReplaceAll(content, "{{uuid}}", uuid.NewString())
	return content
}
