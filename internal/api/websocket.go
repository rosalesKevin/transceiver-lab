package api

import (
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mmt/multicast-tester/internal/model"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
}

type wsClient struct {
	conn   *websocket.Conn
	send   chan []byte
	topic  string // "receive" or "sessions"
}

// Hub manages WebSocket clients and broadcasts messages.
type Hub struct {
	mu      sync.RWMutex
	clients map[*wsClient]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*wsClient]struct{})}
}

func (h *Hub) register(c *wsClient) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) unregister(c *wsClient) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

func (h *Hub) broadcast(topic string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.topic == topic {
			select {
			case c.send <- data:
			default:
				// slow client — drop
			}
		}
	}
}

// BroadcastMessage implements engine.MessageBroadcaster.
func (h *Hub) BroadcastMessage(r model.MessageRecord) {
	h.broadcast("receive", map[string]any{
		"type":      "rx_message",
		"sessionId": r.SessionID,
		"timestamp": r.Timestamp.Format(time.RFC3339Nano),
		"source":    r.SourceAddr,
		"format":    r.Format,
		"raw":       base64.StdEncoding.EncodeToString([]byte(r.Content)),
		"rawHex":    r.RawHex,
		"content":   r.Content,
		"sizeBytes": r.SizeBytes,
	})
}

// BroadcastSessionStatus implements engine.StatusBroadcaster.
func (h *Hub) BroadcastSessionStatus(status model.SessionStatus) {
	h.broadcast("sessions", map[string]any{
		"type":   "session_status",
		"status": status,
	})
}

// ServeReceive handles /ws/receive connections.
func (h *Hub) ServeReceive(w http.ResponseWriter, r *http.Request) {
	h.serveWS(w, r, "receive")
}

// ServeSessions handles /ws/sessions connections.
func (h *Hub) ServeSessions(w http.ResponseWriter, r *http.Request) {
	h.serveWS(w, r, "sessions")
}

func (h *Hub) serveWS(w http.ResponseWriter, r *http.Request, topic string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("ws upgrade", "err", err)
		return
	}
	client := &wsClient{conn: conn, send: make(chan []byte, 256), topic: topic}
	h.register(client)
	go client.writePump(h)
	client.readPump(h) // blocks until disconnect
}

func (c *wsClient) readPump(h *Hub) {
	defer func() {
		h.unregister(c)
		c.conn.Close()
	}()
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *wsClient) writePump(h *Hub) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
