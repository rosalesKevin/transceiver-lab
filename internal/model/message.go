package model

import "time"

type MessageRecord struct {
	ID         string    `json:"id"`
	SessionID  string    `json:"sessionId"`
	Direction  string    `json:"direction"` // "tx" or "rx"
	Timestamp  time.Time `json:"timestamp"`
	SourceAddr string    `json:"sourceAddr"`
	DestAddr   string    `json:"destAddr"`
	Format     string    `json:"format"`
	Content    string    `json:"content"`
	RawHex     string    `json:"rawHex"`
	SizeBytes  int       `json:"sizeBytes"`
}
