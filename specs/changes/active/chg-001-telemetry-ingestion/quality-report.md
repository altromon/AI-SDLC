# 📊 Informe Automático de Calidad de Software (Quality Scorecard)

> **Generado automáticamente a partir del código fuente.**
> Fecha de Generación: **2026-09-03T14:39:10.966Z** | Modo de Política: **STRICT**

---

## 1. Resumen Ejecutivo & Calificación Global

| Métrica Clave | Valor Obtenido | Umbral de Calidad | Estado |
| :--- | :---: | :---: | :---: |
| **Calificación Global (SQALE Rating)** | **`Rating B`** | Min. Rating B | 🟢 EXCELENTE |
| **Veredicto del Release Gate** | **AUTORIZADO (PASS)** | 100% Sin Infracciones | ✅ APROBADO |
| **Complejidad Ciclomática Máxima (Peak CC)** | **4** | $\le 15$ por función | ✅ CONFORME |
| **Complejidad Ciclomática Promedio** | **1.6** | $\le 5.0$ recomendado | ✅ ÓPTIMO |
| **Índice de Mantenibilidad Promedio (MI)** | **74.8 / 100** | $\ge 50.0$ | ✅ CONFORME |
| **Reglas de Código Incumplidas (Code Smells)** | **0** | 0 toleradas | ✅ CERO DEFECTOS |
| **Módulos / Archivos Analizados** | **2** | - | ℹ️ |
| **Funciones / Métodos Analizados** | **5** | - | ℹ️ |
| **Líneas de Código Efectivo (SLOC)** | **25** | - | ℹ️ |

---

## 2. Distribución de Complejidad Ciclomática (McCabe)

```text
  [1 - 5]   Baja / Simple (Óptimo)       : █████ (5 funciones)
  [6 - 10]  Moderada (Aceptable)         :  (0 funciones)
  [> 10]    Alta / Riesgosa (BLOQUEADA)  :  (0 funciones)
```

---

## 3. Desglose Detallado por Módulo y Función

| Archivo Fuente | Función / Método | SLOC | Ciclomática (CC) | Cognitiva | Mantenibilidad (0-100) | Veredicto | Observaciones |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `src/telemetry/gateway.ts` | `constructor` | 3 | 1 | 0 | 81.9 | ✅ PASS | Conforme |
| `src/telemetry/gateway.ts` | `verifyTlsPeer` | 6 | 4 | 3 | 68.8 | ✅ PASS | Conforme |
| `src/telemetry/kinematics.ts` | `calculateHaversineDistanceKm` | 11 | 1 | 0 | 59.5 | ✅ PASS | Conforme |
| `src/telemetry/kinematics.ts` | `degreesToRadians` | 3 | 1 | 0 | 78.7 | ✅ PASS | Conforme |
| `src/telemetry/kinematics.ts` | `validateKinematics` | 2 | 1 | 0 | 85 | ✅ PASS | Conforme |

---

## 4. Conclusiones y Acciones Recomendadas
El código generado cumple rigurosamente con los umbrales de mantenibilidad, no presenta código muerto ni violaciones de tipado, y mantiene la complejidad dentro de los límites matemáticos permitidos.
**El incremento o release está autorizado para su fusión e integración en la rama principal.**
