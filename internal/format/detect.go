package format

import "bytes"

// Detect auto-detects the format of a message payload.
// Returns "cot", "json", "vmf", or "unknown".
func Detect(data []byte) string {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return "unknown"
	}
	// CoT: XML starting with < or <?xml
	if trimmed[0] == '<' {
		return "cot"
	}
	// JSON: starts with { or [
	if trimmed[0] == '{' || trimmed[0] == '[' {
		return "json"
	}
	// VMF: binary (non-printable chars dominate)
	printable := 0
	for _, b := range trimmed {
		if b >= 0x20 && b < 0x7f {
			printable++
		}
	}
	if float64(printable)/float64(len(trimmed)) < 0.7 {
		return "vmf"
	}
	return "unknown"
}
