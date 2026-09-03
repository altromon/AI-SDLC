# 📊 Informe Automático de Calidad de Software Multilenguaje (Polyglot Scorecard)

> **Generado automáticamente a partir del código fuente.**
> Fecha de Generación: **2026-09-03T14:47:43.243Z** | Modo de Política: **STRICT**
> Ecosistemas Detectados: **TypeScript, Go, Python**

---

## 1. Resumen Ejecutivo & Calificación Global

| Métrica Clave | Valor Obtenido | Umbral de Calidad | Estado |
| :--- | :---: | :---: | :---: |
| **Calificación Global (SQALE Rating)** | **`Rating B`** | Min. Rating B | 🟢 EXCELENTE |
| **Veredicto del Release Gate** | **AUTORIZADO (PASS)** | 100% Sin Infracciones | ✅ APROBADO |
| **Complejidad Ciclomática Máxima (Peak CC)** | **4** | $\le 15$ por función | ✅ CONFORME |
| **Complejidad Ciclomática Promedio** | **1.5** | $\le 5.0$ recomendado | ✅ ÓPTIMO |
| **Índice de Mantenibilidad Promedio (MI)** | **66.1 / 100** | $\ge 50.0$ | ✅ CONFORME |
| **Reglas de Código Incumplidas (Code Smells)** | **0** | 0 toleradas | ✅ CERO DEFECTOS |
| **Módulos / Archivos Analizados** | **6** | - | ℹ️ |
| **Funciones / Métodos Analizados** | **13** | - | ℹ️ |
| **Líneas de Código Efectivo (SLOC)** | **114** | - | ℹ️ |

---

## 2. Distribución de Complejidad Ciclomática (McCabe)

```text
  [1 - 5]   Baja / Simple (Óptimo)       : █████████████ (13 funciones)
  [6 - 10]  Moderada (Aceptable)         :  (0 funciones)
  [> 10]    Alta / Riesgosa (BLOQUEADA)  :  (0 funciones)
```

---

## 3. Desglose Detallado por Módulo, Lenguaje y Función

| Archivo Fuente | Lenguaje | Función / Método | SLOC | Ciclomática (CC) | Cognitiva | Mantenibilidad (0-100) | Veredicto | Observaciones |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `src\telemetry\gateway.ts` | **TypeScript** | `constructor` | 3 | 1 | 0 | 81.9 | ✅ PASS | Conforme |
| `src\telemetry\gateway.ts` | **TypeScript** | `verifyTlsPeer` | 6 | 4 | 3 | 68.8 | ✅ PASS | Conforme |
| `src\telemetry\kinematics.ts` | **TypeScript** | `calculateHaversineDistanceKm` | 11 | 1 | 0 | 59.5 | ✅ PASS | Conforme |
| `src\telemetry\kinematics.ts` | **TypeScript** | `degreesToRadians` | 3 | 1 | 0 | 78.7 | ✅ PASS | Conforme |
| `src\telemetry\kinematics.ts` | **TypeScript** | `validateKinematics` | 2 | 1 | 0 | 85 | ✅ PASS | Conforme |
| `src\telemetry_go\kinematics.go` | **Go** | `CalculateHaversineDistanceKm` | 10 | 1 | 0 | 60.2 | ✅ PASS | Conforme |
| `src\telemetry_go\kinematics.go` | **Go** | `ValidateKinematics` | 7 | 2 | 3 | 68.4 | ✅ PASS | Conforme |
| `src\telemetry_python\kinematics.py` | **Python** | `calculate_haversine_distance_km` | 9 | 1 | 0 | 61.4 | ✅ PASS | Conforme |
| `src\telemetry_python\kinematics.py` | **Python** | `validate_telemetry_frame` | 15 | 4 | 3 | 55 | ✅ PASS | Conforme |
| `tests\benchmarks\latency_benchmark.spec.ts` | **TypeScript** | `debe procesar 10.000 ráfagas en p99.9 < 50ms` | 5 | 1 | 0 | 69.2 | ✅ PASS | Conforme |
| `tests\unit\telemetry_gateway.spec.ts` | **TypeScript** | `debe rechazar conexión sin certificado mTLS válido` | 13 | 1 | 0 | 58.1 | ✅ PASS | Conforme |
| `tests\unit\telemetry_gateway.spec.ts` | **TypeScript** | `debe aceptar tramas con cinemática coherente` | 12 | 1 | 0 | 59.2 | ✅ PASS | Conforme |
| `tests\unit\telemetry_gateway.spec.ts` | **TypeScript** | `debe descartar tramas con salto cinemático imposible` | 18 | 1 | 0 | 53.8 | ✅ PASS | Conforme |

---

## 4. Conclusiones y Acciones Recomendadas
El código generado cumple rigurosamente con los umbrales de mantenibilidad, no presenta código muerto ni violaciones de tipado, y mantiene la complejidad dentro de los límites matemáticos permitidos.
**El incremento o release está autorizado para su fusión e integración en la rama principal.**