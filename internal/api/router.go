package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/mmt/multicast-tester/internal/engine"
	"github.com/mmt/multicast-tester/internal/store"
)

type Server struct {
	hub            *Hub
	sessionManager *engine.SessionManager
	templateStore  *store.TemplateStore
	historyStore   *store.HistoryStore
}

func NewServer(
	hub *Hub,
	sm *engine.SessionManager,
	ts *store.TemplateStore,
	hs *store.HistoryStore,
) *Server {
	return &Server{
		hub:            hub,
		sessionManager: sm,
		templateStore:  ts,
		historyStore:   hs,
	}
}

func (s *Server) Router(staticFS http.FileSystem) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// WebSocket
	r.Get("/ws/receive", s.hub.ServeReceive)
	r.Get("/ws/sessions", s.hub.ServeSessions)

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		// Templates
		r.Get("/templates", s.listTemplates)
		r.Post("/templates", s.createTemplate)
		r.Get("/templates/{id}", s.getTemplate)
		r.Put("/templates/{id}", s.updateTemplate)
		r.Delete("/templates/{id}", s.deleteTemplate)

		// Sessions
		r.Get("/sessions", s.listSessions)
		r.Post("/sessions", s.createSession)
		r.Get("/sessions/{id}", s.getSession)
		r.Post("/sessions/{id}/start", s.startSession)
		r.Post("/sessions/{id}/pause", s.pauseSession)
		r.Post("/sessions/{id}/resume", s.resumeSession)
		r.Post("/sessions/{id}/stop", s.stopSession)
		r.Delete("/sessions/{id}", s.deleteSession)

		// Network
		r.Get("/network/interfaces", s.listInterfaces)
		r.Post("/send", s.oneShotSend)

		// History
		r.Get("/history", s.queryHistory)
		r.Get("/history/export", s.exportHistory)
		r.Delete("/history", s.clearHistory)

		// Settings
		r.Get("/settings", s.getSettings)
		r.Put("/settings", s.updateSettings)
	})

	// SPA — serve static files, fallback to index.html
	r.Handle("/*", http.FileServer(staticFS))

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
