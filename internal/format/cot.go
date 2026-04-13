package format

import (
	"fmt"
	"strings"
	"time"

	"github.com/beevik/etree"
	"github.com/google/uuid"
)

// CotEvent represents a parsed CoT event.
type CotEvent struct {
	Version string  `json:"version"`
	UID     string  `json:"uid"`
	Type    string  `json:"type"`
	Time    string  `json:"time"`
	Start   string  `json:"start"`
	Stale   string  `json:"stale"`
	How     string  `json:"how"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`
	Hae     float64 `json:"hae"`
	Ce      float64 `json:"ce"`
	Le      float64 `json:"le"`
	Detail  string  `json:"detail"` // raw XML of <detail> subtree
}

// ParseCoT parses a CoT XML message.
func ParseCoT(data []byte) (*CotEvent, error) {
	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(data); err != nil {
		return nil, fmt.Errorf("parse cot xml: %w", err)
	}
	event := doc.FindElement("//event")
	if event == nil {
		return nil, fmt.Errorf("no <event> element found")
	}

	cot := &CotEvent{
		Version: event.SelectAttrValue("version", "2.0"),
		UID:     event.SelectAttrValue("uid", ""),
		Type:    event.SelectAttrValue("type", ""),
		Time:    event.SelectAttrValue("time", ""),
		Start:   event.SelectAttrValue("start", ""),
		Stale:   event.SelectAttrValue("stale", ""),
		How:     event.SelectAttrValue("how", ""),
	}

	if pt := event.FindElement("point"); pt != nil {
		fmt.Sscanf(pt.SelectAttrValue("lat", "0"), "%f", &cot.Lat)
		fmt.Sscanf(pt.SelectAttrValue("lon", "0"), "%f", &cot.Lon)
		fmt.Sscanf(pt.SelectAttrValue("hae", "0"), "%f", &cot.Hae)
		fmt.Sscanf(pt.SelectAttrValue("ce", "9999999"), "%f", &cot.Ce)
		fmt.Sscanf(pt.SelectAttrValue("le", "9999999"), "%f", &cot.Le)
	}

	if detail := event.FindElement("detail"); detail != nil {
		d := etree.NewDocument()
		d.SetRoot(detail.Copy())
		raw, _ := d.WriteToString()
		cot.Detail = raw
	}

	return cot, nil
}

// BuildCoT constructs a CoT XML message.
func BuildCoT(uid, cotType, how string, lat, lon, hae, ce, le float64, staleMinutes int, detail string) string {
	if uid == "" {
		uid = "MMT-" + uuid.NewString()[:8]
	}
	now := time.Now().UTC()
	stale := now.Add(time.Duration(staleMinutes) * time.Minute)
	ts := now.Format("2006-01-02T15:04:05.000Z")
	staleStr := stale.Format("2006-01-02T15:04:05.000Z")

	if detail == "" {
		detail = "<detail/>"
	}

	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="%s" type="%s" time="%s" start="%s" stale="%s" how="%s">
  <point lat="%.7f" lon="%.7f" hae="%.1f" ce="%.1f" le="%.1f"/>
  %s
</event>`, uid, cotType, ts, ts, staleStr, how, lat, lon, hae, ce, le, detail)
}

// ValidateCoT validates CoT XML structure.
func ValidateCoT(data []byte) error {
	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(data); err != nil {
		return fmt.Errorf("invalid XML: %w", err)
	}
	event := doc.FindElement("//event")
	if event == nil {
		return fmt.Errorf("missing <event> element")
	}
	if strings.TrimSpace(event.SelectAttrValue("uid", "")) == "" {
		return fmt.Errorf("event missing uid attribute")
	}
	if strings.TrimSpace(event.SelectAttrValue("type", "")) == "" {
		return fmt.Errorf("event missing type attribute")
	}
	if event.FindElement("point") == nil {
		return fmt.Errorf("event missing <point> element")
	}
	return nil
}
