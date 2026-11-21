# Doctor & Migrate Safety Reference

## Migration File Classifications
- `UP_TO_DATE`: Local file matches canonical SHA-256 (LF-normalized).
- `CLEAN_UPDATE`: Local file matches base or is missing; safely updated/created.
- `LOCAL_OVERRIDE_PRESERVED`: Local customization detected; preserved with exit code `1` unless `--force` is passed.
- `CONFLICT`: Structural corruption detected (exit code `2`).

## Safety Guardrails
- Mutating migrations are blocked on protected branches (`main`, `master`, `release/*`) with `ERR_PROTECTED_BRANCH_MIGRATION`.
- Backups are written to `.backup/migration-<timestamp>-<rand>/` with automatic rollback on failure.
- Policy Ratchet blocks relaxing stricter thresholds in `quality-policy.yaml` / `privacy-policy.yaml` without `--allow-policy-downgrade`.
