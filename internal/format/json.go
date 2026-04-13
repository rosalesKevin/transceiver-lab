package format

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/xeipuuv/gojsonschema"
)

// ValidateJSON checks if data is valid JSON.
func ValidateJSON(data []byte) error {
	var v any
	return json.Unmarshal(data, &v)
}

// ValidateJSONSchema validates JSON data against a JSON Schema string.
func ValidateJSONSchema(data []byte, schemaStr string) error {
	schemaLoader := gojsonschema.NewStringLoader(schemaStr)
	dataLoader := gojsonschema.NewBytesLoader(data)
	result, err := gojsonschema.Validate(schemaLoader, dataLoader)
	if err != nil {
		return fmt.Errorf("schema validation error: %w", err)
	}
	if !result.Valid() {
		var errs []string
		for _, e := range result.Errors() {
			errs = append(errs, e.String())
		}
		return fmt.Errorf("validation failed: %s", strings.Join(errs, "; "))
	}
	return nil
}
