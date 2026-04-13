package model

type SessionConfig struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Mode          string `json:"mode"`          // "send" or "receive"
	MulticastAddr string `json:"multicastAddr"` // e.g. "239.2.3.1"
	Port          int    `json:"port"`
	InterfaceName string `json:"interfaceName"`
	TTL           int    `json:"ttl"`
	Loopback      bool   `json:"loopback"`
	Format        string `json:"format"`        // "cot", "json", "vmf"
	Content       string `json:"content"`       // Message to send
	SendMode      string `json:"sendMode"`      // "oneshot", "periodic"
	IntervalMs    int    `json:"intervalMs"`    // Milliseconds between sends
	DynamicFields bool   `json:"dynamicFields"` // Enable {{timestamp}} etc.
}

type SessionStatus struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	State     string `json:"state"` // "idle","running","paused","stopped"
	Mode      string `json:"mode"`
	Sent      int64  `json:"sent"`
	Received  int64  `json:"received"`
	BytesSent int64  `json:"bytesSent"`
	BytesRecv int64  `json:"bytesRecv"`
	StartedAt string `json:"startedAt,omitempty"`
	LastTx    string `json:"lastTx,omitempty"`
	LastRx    string `json:"lastRx,omitempty"`
	Error     string `json:"error,omitempty"`
}
