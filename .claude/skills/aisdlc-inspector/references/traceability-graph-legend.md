# 360° Traceability Graph Legend

## Node Statuses
- `COMPLIANT`: All upstream citations and downstream test/code links are valid and drift-free.
- `ORPHAN`: Missing upstream justification or downstream implementation/verification link.
- `DRIFT`: Upstream SHA-256 citation digest no longer matches the referenced artifact.

## UX Rule (Report First, Question After)
Always render the full technical report (Header, File Location, Summary, Upstream ↗️, Downstream ↘️, Numbered Items) before prompting for the next navigation step.
