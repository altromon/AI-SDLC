---
id: SEC-ENC-DMZ-INGEST
type: security-enclave
title: Enclave Perimetral de Ingesta Segura (DMZ Ingestion Enclave)
status: active
trust-level: "zero-trust-boundary"
isolation: "network-namespace-and-mtls"
---

# SEC-ENC-DMZ-INGEST: Enclave Perimetral de Ingesta

## 1. Definición del Perímetro
Zona desmilitarizada aislada a nivel de red (Kubernetes NetworkPolicy estricta) donde residen los balanceadores de carga y los pods del Gateway de Ingesta. Ningún pod de este enclave tiene acceso directo a la base de datos central ni al plano de control; únicamente puede publicar eventos validados en el broker interno de Kafka.
