package gateway

import (
	"errors"
	"fmt"
)

// ProcessIngestMessage handles high-throughput telemetry frames
// Note: comment contains braces { and } to verify scanner resilience
func ProcessIngestMessage(payload string, priority int) (string, error) {
	sampleJson := "{ \"stream\": \"live\", \"qos\": 1 }"
	if len(payload) == 0 {
		return sampleJson, errors.New("empty payload")
	}

	if priority > 5 {
		formatted := fmt.Sprintf("PRIORITY: %s", payload)
		return formatted, nil
	}

	return payload, nil
}
