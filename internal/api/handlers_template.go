package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/mmt/multicast-tester/internal/model"
)

func (s *Server) listTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := s.templateStore.List()
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, templates)
}

func (s *Server) createTemplate(w http.ResponseWriter, r *http.Request) {
	var t model.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		jsonError(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	if t.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if err := s.templateStore.Create(&t); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, t)
}

func (s *Server) getTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	t, err := s.templateStore.Get(id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if t == nil {
		jsonError(w, "template not found", http.StatusNotFound)
		return
	}
	jsonOK(w, t)
}

func (s *Server) updateTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t model.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		jsonError(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	t.ID = id
	if err := s.templateStore.Update(&t); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, t)
}

func (s *Server) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.templateStore.Delete(id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
