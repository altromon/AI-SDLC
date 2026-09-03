// Package telemetry implementa la validación cinemática en Go (BR-TELEMETRY-VALIDITY)
package telemetry

import "math"

const (
	EarthRadiusKm       = 6371.0
	MaxPhysicalSpeedMps = 45.0
)

// Coordinates representa una posición espacial del UAV
type Coordinates struct {
	Latitude  float64
	Longitude float64
	Altitude  float64
}

// CalculateHaversineDistanceKm calcula la distancia geodésica en kilómetros
func CalculateHaversineDistanceKm(from, to Coordinates) float64 {
	dLat := (to.Latitude - from.Latitude) * math.Pi / 180.0
	dLon := (to.Longitude - from.Longitude) * math.Pi / 180.0
	lat1 := from.Latitude * math.Pi / 180.0
	lat2 := to.Latitude * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1)*math.Cos(lat2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return EarthRadiusKm * c
}

// ValidateKinematics verifica los límites físicos de velocidad del dron
func ValidateKinematics(distanceKm, timeDeltaSeconds float64) bool {
	if timeDeltaSeconds <= 0 {
		return false
	}
	speedMps := (distanceKm * 1000.0) / timeDeltaSeconds
	return speedMps <= MaxPhysicalSpeedMps
}
