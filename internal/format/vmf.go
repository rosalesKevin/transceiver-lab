package format

import (
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"strings"
)

// VMFHeader represents the fixed VMF header.
type VMFHeader struct {
	Magic   uint32
	MsgType uint16
	BodyLen uint16
}

const VMFMagic = 0x4d4d5400 // "MMT\0"

// ParseVMF parses a raw VMF binary message.
func ParseVMF(data []byte) (*VMFHeader, []byte, error) {
	if len(data) < 8 {
		return nil, nil, fmt.Errorf("vmf message too short: %d bytes (need 8)", len(data))
	}
	hdr := &VMFHeader{
		Magic:   binary.BigEndian.Uint32(data[0:4]),
		MsgType: binary.BigEndian.Uint16(data[4:6]),
		BodyLen: binary.BigEndian.Uint16(data[6:8]),
	}
	bodyEnd := 8 + int(hdr.BodyLen)
	if bodyEnd > len(data) {
		bodyEnd = len(data)
	}
	return hdr, data[8:bodyEnd], nil
}

// BuildVMF constructs a VMF binary message.
func BuildVMF(msgType uint16, body []byte) []byte {
	out := make([]byte, 8+len(body))
	binary.BigEndian.PutUint32(out[0:4], VMFMagic)
	binary.BigEndian.PutUint16(out[4:6], msgType)
	binary.BigEndian.PutUint16(out[6:8], uint16(len(body)))
	copy(out[8:], body)
	return out
}

// HexStringToBytes converts a hex string (with optional spaces) to bytes.
func HexStringToBytes(s string) ([]byte, error) {
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\r", "")
	return hex.DecodeString(s)
}

// BytesToHexDump returns a formatted hex dump string.
func BytesToHexDump(data []byte) string {
	var sb strings.Builder
	for i := 0; i < len(data); i += 16 {
		end := i + 16
		if end > len(data) {
			end = len(data)
		}
		chunk := data[i:end]
		fmt.Fprintf(&sb, "%04x  ", i)
		for j, b := range chunk {
			fmt.Fprintf(&sb, "%02x ", b)
			if j == 7 {
				sb.WriteString(" ")
			}
		}
		// Padding
		for j := len(chunk); j < 16; j++ {
			sb.WriteString("   ")
			if j == 7 {
				sb.WriteString(" ")
			}
		}
		sb.WriteString(" |")
		for _, b := range chunk {
			if b >= 0x20 && b < 0x7f {
				sb.WriteByte(b)
			} else {
				sb.WriteByte('.')
			}
		}
		sb.WriteString("|\n")
	}
	return sb.String()
}
