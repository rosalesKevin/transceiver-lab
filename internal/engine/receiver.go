package engine

import (
	"context"
	"encoding/hex"
	"net"
	"sync/atomic"
	"time"

	"github.com/mmt/multicast-tester/internal/format"
	"github.com/mmt/multicast-tester/internal/model"
	"github.com/mmt/multicast-tester/internal/netutil"
)

type MessageBroadcaster interface {
	BroadcastMessage(r model.MessageRecord)
}

type ReceiverHub interface {
	StatusBroadcaster
	MessageBroadcaster
}

type Receiver struct {
	config *model.SessionConfig
	conn   *net.UDPConn
	recv   atomic.Int64
	bytes  atomic.Int64
	hub    ReceiverHub
	store  MessageSaver
}

func NewReceiver(cfg *model.SessionConfig, hub ReceiverHub, store MessageSaver) (*Receiver, error) {
	conn, err := netutil.JoinMulticast(cfg.InterfaceName, cfg.MulticastAddr, cfg.Port)
	if err != nil {
		return nil, err
	}
	return &Receiver{
		config: cfg,
		conn:   conn,
		hub:    hub,
		store:  store,
	}, nil
}

func (r *Receiver) Listen(ctx context.Context) {
	buf := make([]byte, 65535)
	for {
		r.conn.SetReadDeadline(time.Now().Add(1 * time.Second))
		n, src, err := r.conn.ReadFromUDP(buf)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			continue // timeout, retry
		}
		data := make([]byte, n)
		copy(data, buf[:n])

		fmt := format.Detect(data)
		record := model.MessageRecord{
			SessionID:  r.config.ID,
			Direction:  "rx",
			Timestamp:  time.Now().UTC(),
			SourceAddr: src.String(),
			Format:     fmt,
			Content:    string(data),
			RawHex:     hex.EncodeToString(data),
			SizeBytes:  n,
		}

		r.recv.Add(1)
		r.bytes.Add(int64(n))

		if r.store != nil {
			r.store.Save(&record)
		}
		if r.hub != nil {
			r.hub.BroadcastMessage(record)
			r.hub.BroadcastSessionStatus(model.SessionStatus{
				ID:        r.config.ID,
				Name:      r.config.Name,
				State:     "running",
				Mode:      "receive",
				Received:  r.recv.Load(),
				BytesRecv: r.bytes.Load(),
			})
		}
	}
}

func (r *Receiver) Close() {
	if r.conn != nil {
		r.conn.Close()
	}
}

func (r *Receiver) Stats() (recv int64, bytes int64) {
	return r.recv.Load(), r.bytes.Load()
}
