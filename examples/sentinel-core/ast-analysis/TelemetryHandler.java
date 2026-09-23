package com.aisdlc.telemetry;

public class TelemetryHandler {
    private final String fallbackJson = "{ \"status\": \"UNKNOWN\" }";

    public boolean validateEvent(String eventType, long timestamp) {
        // Checking { brackets } inside comments
        if (eventType == null || eventType.isEmpty()) {
            return false;
        }

        if (timestamp > 0) {
            return true;
        }

        return false;
    }
}
