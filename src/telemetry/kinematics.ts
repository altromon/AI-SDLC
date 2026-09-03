/**
 * ==============================================================================
 * SentinelCore: Módulo de Validación Cinemática (BR-TELEMETRY-VALIDITY)
 * ==============================================================================
 * Verifica que las trayectorias reportadas por los drones respeten los límites
 * físicos de velocidad y aceleración para detectar suplantación o sensores defectuosos.
 * ==============================================================================
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}

export interface TelemetryFrame {
  droneId: string;
  timestampMs: number;
  position: Coordinates;
  speedMps: number;
}

export interface ValidationResult {
  isValid: boolean;
  errorCode: string | null;
  distanceDeltaKm: number;
  computedSpeedMps: number;
}

const EARTH_RADIUS_KM = 6371.0;
const MAX_PHYSICAL_SPEED_MPS = 45.0; // 162 km/h límite físico UAV

/**
 * Calcula la distancia ortodrómica entre dos coordenadas geodésicas (Haversine).
 */
export function calculateHaversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = degreesToRadians(to.latitude - from.latitude);
  const dLon = degreesToRadians(to.longitude - from.longitude);

  const lat1Rad = degreesToRadians(from.latitude);
  const lat2Rad = degreesToRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Valida si una nueva trama telemétrica es físicamente coherente respecto a la anterior.
 */
export function validateKinematics(
  previousFrame: TelemetryFrame | null,
  currentFrame: TelemetryFrame
): ValidationResult {
  if (!previousFrame) {
    return {
      isValid: true,
      errorCode: null,
      distanceDeltaKm: 0,
      computedSpeedMps: currentFrame.speedMps
    };
  }

  const timeDeltaSeconds = (currentFrame.timestampMs - previousFrame.timestampMs) / 1000.0;
  if (timeDeltaSeconds <= 0) {
    return {
      isValid: false,
      errorCode: 'INVALID_TIMESTAMP_SEQUENCE',
      distanceDeltaKm: 0,
      computedSpeedMps: 0
    };
  }

  const distanceKm = calculateHaversineDistanceKm(previousFrame.position, currentFrame.position);
  const distanceMeters = distanceKm * 1000.0;
  const computedSpeedMps = distanceMeters / timeDeltaSeconds;

  if (computedSpeedMps > MAX_PHYSICAL_SPEED_MPS) {
    return {
      isValid: false,
      errorCode: 'NACK-INVALID-KINEMATICS',
      distanceDeltaKm: distanceKm,
      computedSpeedMps
    };
  }

  return {
    isValid: true,
    errorCode: null,
    distanceDeltaKm: distanceKm,
    computedSpeedMps
  };
}
