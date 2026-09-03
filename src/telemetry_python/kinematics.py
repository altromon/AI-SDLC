"""
SentinelCore: Módulo de Validación Cinemática en Python (BR-TELEMETRY-VALIDITY)
"""

import math
from typing import Optional, Dict, Any

EARTH_RADIUS_KM = 6371.0
MAX_PHYSICAL_SPEED_MPS = 45.0


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica entre dos puntos."""
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)

    a = math.sin(d_lat / 2) ** 2 + math.sin(d_lon / 2) ** 2 * math.cos(r_lat1) * math.cos(r_lat2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def validate_telemetry_frame(prev_frame: Optional[Dict[str, Any]], current_frame: Dict[str, Any]) -> Dict[str, Any]:
    """Valida la coherencia temporal y cinemática de la trama."""
    if not prev_frame:
        return {"valid": True, "error": None, "speed": current_frame.get("speed", 0.0)}

    dt = (current_frame["timestamp"] - prev_frame["timestamp"]) / 1000.0
    if dt <= 0:
        return {"valid": False, "error": "INVALID_TIMESTAMP_SEQUENCE", "speed": 0.0}

    dist_km = calculate_haversine_distance_km(
        prev_frame["lat"], prev_frame["lon"],
        current_frame["lat"], current_frame["lon"]
    )
    speed_mps = (dist_km * 1000.0) / dt

    if speed_mps > MAX_PHYSICAL_SPEED_MPS:
        return {"valid": False, "error": "NACK-INVALID-KINEMATICS", "speed": speed_mps}

    return {"valid": True, "error": None, "speed": speed_mps}
