# 01. Introducción y Objetivos de SentinelCore (arc42 Sec. 1)

## 1. Visión del Sistema
SentinelCore es una plataforma de software distribuida para la supervisión y control del espacio aéreo de flotas de vehículos aéreos autónomos no tripulados (UAVs / Drones). Su misión es garantizar la separación segura entre aeronaves en tiempo real y prevenir colisiones mediante el procesamiento inmediato de telemetría geospacial.

## 2. Objetivos de Calidad Prioritarios (Cita canónica ProductShape)
1. **Latencia Crítica**: Procesamiento de tramas en menos de 50ms (`QR-LATENCY-REALTIME`).
2. **Seguridad Absoluta contra Suplantación**: Cero tolerancia a telemetría forjada mediante autenticación mTLS obligatoria (`SEC-REQ-MTLS-STREAM`).
3. **Cumplimiento Legal y Licencias**: Código libre de contaminación viral (GPL/AGPL) y costes comerciales optimizados (`license-policy.yaml`).

## 3. Stakeholders y Actores Principales
- **Operadores de Vuelo**: `ACT-DRONE-OPERATOR`.
- **Aeronaves Autónomas**: `ACT-AUTONOMOUS-UAV`.
