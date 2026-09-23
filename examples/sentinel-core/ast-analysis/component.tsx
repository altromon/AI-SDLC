import React, { useState } from 'react';

export interface TelemetryProps {
  deviceId: string;
  samplingRate: number;
}

export function TelemetryDashboard({ deviceId, samplingRate }: TelemetryProps) {
  const [streamActive, setStreamActive] = useState(false);
  const [metrics, setMetrics] = useState<{ p99: number }>({ p99: 45 });

  const handleToggle = () => {
    // Template with nested braces inside interpolation
    const logTag = `device-${deviceId}-${{ mode: 'realtime' }}`;
    if (samplingRate > 1000) {
      setStreamActive(!streamActive);
      console.log(logTag);
    }
  };

  return (
    <div className="telemetry-panel" style={{ padding: 16, backgroundColor: streamActive ? '#e6fffa' : '#fff5f5' }}>
      <h3>Dashboard: {deviceId}</h3>
      <p>Latency p99: {metrics.p99}ms</p>
      <button onClick={handleToggle}>
        {streamActive ? 'Stop Ingest' : 'Start Ingest'}
      </button>
    </div>
  );
}
