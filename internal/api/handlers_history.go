package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/mmt/multicast-tester/internal/store"
)

func (s *Server) queryHistory(w http.ResponseWriter, r *http.Request) {
	q := store.HistoryQuery{
		Direction: r.URL.Query().Get("direction"),
		Format:    r.URL.Query().Get("format"),
		SessionID: r.URL.Query().Get("sessionId"),
		Search:    r.URL.Query().Get("search"),
	}
	if p := r.URL.Query().Get("page"); p != "" {
		q.Page, _ = strconv.Atoi(p)
	}
	if ps := r.URL.Query().Get("pageSize"); ps != "" {
		q.PageSize, _ = strconv.Atoi(ps)
	}

	result, err := s.historyStore.Query(q)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, result)
}

func (s *Server) exportHistory(w http.ResponseWriter, r *http.Request) {
	data, err := s.historyStore.ExportJSON()
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="mmt-history.json"`)
	w.Write(data)
}

func (s *Server) clearHistory(w http.ResponseWriter, r *http.Request) {
	if err := s.historyStore.Clear(); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.historyStore.GetAllSettings()
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, settings)
}

func (s *Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	var settings map[string]string
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		jsonError(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	for k, v := range settings {
		if err := s.historyStore.SetSetting(k, v); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}
