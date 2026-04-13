package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mmt/multicast-tester/internal/model"
)

type HistoryStore struct {
	db *sql.DB
}

func NewHistoryStore(db *sql.DB) *HistoryStore {
	return &HistoryStore{db: db}
}

type HistoryQuery struct {
	Direction string
	Format    string
	SessionID string
	Search    string
	Page      int
	PageSize  int
}

type HistoryResult struct {
	Total    int                   `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"pageSize"`
	Records  []model.MessageRecord `json:"records"`
}

func (s *HistoryStore) Save(r *model.MessageRecord) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	if r.Timestamp.IsZero() {
		r.Timestamp = time.Now().UTC()
	}
	_, err := s.db.Exec(
		`INSERT INTO messages (id, session_id, direction, timestamp, source_addr, dest_addr, format, content, raw_hex, size_bytes)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`,
		r.ID, r.SessionID, r.Direction, r.Timestamp.Format(time.RFC3339Nano),
		r.SourceAddr, r.DestAddr, r.Format, r.Content, r.RawHex, r.SizeBytes,
	)
	if err == nil {
		s.pruneIfNeeded()
	}
	return err
}

// pruneIfNeeded deletes oldest records beyond the historyMaxRecords setting.
func (s *HistoryStore) pruneIfNeeded() {
	maxStr := s.GetSetting("historyMaxRecords", "10000")
	max, err := strconv.Atoi(maxStr)
	if err != nil || max <= 0 {
		return
	}
	// Keep the N newest; delete anything older.
	s.db.Exec(`DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY timestamp DESC LIMIT ?)`, max)
}

func (s *HistoryStore) Query(q HistoryQuery) (*HistoryResult, error) {
	if q.PageSize <= 0 {
		q.PageSize = 50
	}
	if q.Page <= 0 {
		q.Page = 1
	}

	where, args := buildWhere(q)
	countSQL := "SELECT COUNT(*) FROM messages" + where
	var total int
	if err := s.db.QueryRow(countSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	offset := (q.Page - 1) * q.PageSize
	querySQL := fmt.Sprintf(
		"SELECT id, session_id, direction, timestamp, source_addr, dest_addr, format, content, raw_hex, size_bytes FROM messages%s ORDER BY timestamp DESC LIMIT %d OFFSET %d",
		where, q.PageSize, offset,
	)
	rows, err := s.db.Query(querySQL, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.MessageRecord
	for rows.Next() {
		var r model.MessageRecord
		var ts string
		if err := rows.Scan(&r.ID, &r.SessionID, &r.Direction, &ts, &r.SourceAddr, &r.DestAddr, &r.Format, &r.Content, &r.RawHex, &r.SizeBytes); err != nil {
			return nil, err
		}
		r.Timestamp, _ = time.Parse(time.RFC3339Nano, ts)
		records = append(records, r)
	}
	if records == nil {
		records = []model.MessageRecord{}
	}
	return &HistoryResult{
		Total:    total,
		Page:     q.Page,
		PageSize: q.PageSize,
		Records:  records,
	}, rows.Err()
}

func (s *HistoryStore) Export() ([]model.MessageRecord, error) {
	rows, err := s.db.Query(`SELECT id, session_id, direction, timestamp, source_addr, dest_addr, format, content, raw_hex, size_bytes FROM messages ORDER BY timestamp DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var records []model.MessageRecord
	for rows.Next() {
		var r model.MessageRecord
		var ts string
		rows.Scan(&r.ID, &r.SessionID, &r.Direction, &ts, &r.SourceAddr, &r.DestAddr, &r.Format, &r.Content, &r.RawHex, &r.SizeBytes)
		r.Timestamp, _ = time.Parse(time.RFC3339Nano, ts)
		records = append(records, r)
	}
	if records == nil {
		records = []model.MessageRecord{}
	}
	return records, rows.Err()
}

func (s *HistoryStore) Clear() error {
	_, err := s.db.Exec(`DELETE FROM messages`)
	return err
}

func buildWhere(q HistoryQuery) (string, []any) {
	var conds []string
	var args []any
	if q.Direction != "" {
		conds = append(conds, "direction = ?")
		args = append(args, q.Direction)
	}
	if q.Format != "" {
		conds = append(conds, "format = ?")
		args = append(args, q.Format)
	}
	if q.SessionID != "" {
		conds = append(conds, "session_id = ?")
		args = append(args, q.SessionID)
	}
	if q.Search != "" {
		conds = append(conds, "content LIKE ?")
		args = append(args, "%"+q.Search+"%")
	}
	if len(conds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

func (s *HistoryStore) GetSetting(key, def string) string {
	var val string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&val)
	if err != nil {
		return def
	}
	return val
}

func (s *HistoryStore) SetSetting(key, value string) error {
	_, err := s.db.Exec(`INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)`, key, value)
	return err
}

func (s *HistoryStore) GetAllSettings() (map[string]string, error) {
	rows, err := s.db.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string]string{}
	for rows.Next() {
		var k, v string
		rows.Scan(&k, &v)
		m[k] = v
	}
	return m, nil
}

func (s *HistoryStore) ExportJSON() ([]byte, error) {
	records, err := s.Export()
	if err != nil {
		return nil, err
	}
	return json.MarshalIndent(records, "", "  ")
}
