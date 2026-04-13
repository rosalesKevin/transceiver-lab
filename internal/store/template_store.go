package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mmt/multicast-tester/internal/model"
)

type TemplateStore struct {
	db *sql.DB
}

func NewTemplateStore(db *sql.DB) *TemplateStore {
	return &TemplateStore{db: db}
}

func (s *TemplateStore) List() ([]model.Template, error) {
	rows, err := s.db.Query(`SELECT id, name, format, content, tags, created_at, updated_at FROM templates ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []model.Template
	for rows.Next() {
		var t model.Template
		var tagsJSON string
		var createdAt, updatedAt string
		if err := rows.Scan(&t.ID, &t.Name, &t.Format, &t.Content, &tagsJSON, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(tagsJSON), &t.Tags)
		t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		if t.Tags == nil {
			t.Tags = []string{}
		}
		templates = append(templates, t)
	}
	if templates == nil {
		templates = []model.Template{}
	}
	return templates, rows.Err()
}

func (s *TemplateStore) Get(id string) (*model.Template, error) {
	var t model.Template
	var tagsJSON, createdAt, updatedAt string
	err := s.db.QueryRow(`SELECT id, name, format, content, tags, created_at, updated_at FROM templates WHERE id = ?`, id).
		Scan(&t.ID, &t.Name, &t.Format, &t.Content, &tagsJSON, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(tagsJSON), &t.Tags)
	t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	if t.Tags == nil {
		t.Tags = []string{}
	}
	return &t, nil
}

func (s *TemplateStore) Create(t *model.Template) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	if t.Tags == nil {
		t.Tags = []string{}
	}
	tagsJSON, _ := json.Marshal(t.Tags)
	_, err := s.db.Exec(
		`INSERT INTO templates (id, name, format, content, tags, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
		t.ID, t.Name, t.Format, t.Content, string(tagsJSON),
		now.Format(time.RFC3339), now.Format(time.RFC3339),
	)
	return err
}

func (s *TemplateStore) Update(t *model.Template) error {
	t.UpdatedAt = time.Now().UTC()
	tagsJSON, _ := json.Marshal(t.Tags)
	res, err := s.db.Exec(
		`UPDATE templates SET name=?, format=?, content=?, tags=?, updated_at=? WHERE id=?`,
		t.Name, t.Format, t.Content, string(tagsJSON), t.UpdatedAt.Format(time.RFC3339), t.ID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("template not found")
	}
	return nil
}

func (s *TemplateStore) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM templates WHERE id = ?`, id)
	return err
}

func (s *TemplateStore) SeedDefaults() error {
	count := 0
	s.db.QueryRow(`SELECT COUNT(*) FROM templates`).Scan(&count)
	if count > 0 {
		return nil
	}

	defaults := []model.Template{
		{
			Name:   "CoT Position Report",
			Format: "cot",
			Tags:   []string{"cot", "starter"},
			Content: strings.TrimSpace(`<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="MMT-{{uuid}}" type="a-f-G-U-C"
      time="{{timestamp}}" start="{{timestamp}}" stale="{{timestamp}}" how="m-g">
  <point lat="37.7749" lon="-122.4194" hae="0" ce="10" le="10"/>
  <detail>
    <contact callsign="ALPHA-1"/>
    <__group name="Cyan" role="Team Lead"/>
    <status readiness="true"/>
    <track course="90.0" speed="5.0"/>
    <remarks>Position report from MMT</remarks>
  </detail>
</event>`),
		},
		{
			Name:    "JSON Position Report",
			Format:  "json",
			Tags:    []string{"json", "starter"},
			Content: `{"header":{"msgType":"POSITION_REPORT","senderId":"UNIT-ALPHA","timestamp":"{{timestamp}}","classification":"UNCLASSIFIED"},"body":{"latitude":37.7749,"longitude":-122.4194,"altitude":0,"heading":90,"speed":5.0,"status":"MOVING"}}`,
		},
		{
			Name:    "JSON Status Update",
			Format:  "json",
			Tags:    []string{"json", "starter"},
			Content: `{"header":{"msgType":"STATUS_UPDATE","senderId":"UNIT-ALPHA","timestamp":"{{timestamp}}"},"body":{"status":"NOMINAL","seq":{{seq}}}}`,
		},
		{
			Name:    "VMF Basic",
			Format:  "vmf",
			Tags:    []string{"vmf", "starter"},
			Content: `4d4d5400 0001 0000`,
		},
	}

	for i := range defaults {
		if err := s.Create(&defaults[i]); err != nil {
			return err
		}
	}
	return nil
}
