package model

import "time"

type Template struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Format    string    `json:"format"` // "cot", "json", "vmf"
	Content   string    `json:"content"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
