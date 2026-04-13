package api

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/mmt/multicast-tester/internal/model"
	"github.com/mmt/multicast-tester/internal/netutil"
)

func (s *Server) listInterfaces(w http.ResponseWriter, r *http.Request) {
	ifaces, err := netutil.ListInterfaces()
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, ifaces)
}

type oneShotRequest struct {
	MulticastAddr string `json:"multicastAddr"`
	Port          int    `json:"port"`
	InterfaceName string `json:"interfaceName"`
	TTL           int    `json:"ttl"`
	Loopback      bool   `json:"loopback"`
	Format        string `json:"format"`
	Content       string `json:"content"`
}

func (s *Server) oneShotSend(w http.ResponseWriter, r *http.Request) {
	var req oneShotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	if req.MulticastAddr == "" {
		req.MulticastAddr = "239.2.3.1"
	}
	if req.Port == 0 {
		req.Port = 6969
	}
	if req.TTL == 0 {
		req.TTL = 32
	}

	conn, err := netutil.DialMulticast(req.InterfaceName, req.MulticastAddr, req.Port, req.TTL, req.Loopback)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	data := []byte(req.Content)
	n, err := netutil.SendTo(conn, data, req.MulticastAddr, req.Port)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.historyStore.Save(&model.MessageRecord{
		Direction: "tx",
		Timestamp: time.Now().UTC(),
		DestAddr:  req.MulticastAddr,
		Format:    req.Format,
		Content:   req.Content,
		RawHex:    hex.EncodeToString(data),
		SizeBytes: n,
	})

	jsonOK(w, map[string]any{
		"sent":      n,
		"dest":      req.MulticastAddr,
		"port":      req.Port,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
