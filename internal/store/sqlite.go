package store

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1) // SQLite single-writer
	if err := migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS templates (
		id          TEXT PRIMARY KEY,
		name        TEXT NOT NULL,
		format      TEXT NOT NULL,
		content     TEXT NOT NULL,
		tags        TEXT NOT NULL DEFAULT '[]',
		created_at  DATETIME NOT NULL,
		updated_at  DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS messages (
		id           TEXT PRIMARY KEY,
		session_id   TEXT NOT NULL DEFAULT '',
		direction    TEXT NOT NULL,
		timestamp    DATETIME NOT NULL,
		source_addr  TEXT NOT NULL DEFAULT '',
		dest_addr    TEXT NOT NULL DEFAULT '',
		format       TEXT NOT NULL DEFAULT '',
		content      TEXT NOT NULL DEFAULT '',
		raw_hex      TEXT NOT NULL DEFAULT '',
		size_bytes   INTEGER NOT NULL DEFAULT 0
	);

	CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
	CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
	CREATE INDEX IF NOT EXISTS idx_messages_format ON messages(format);

	CREATE TABLE IF NOT EXISTS settings (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`
	_, err := db.Exec(schema)
	return err
}
