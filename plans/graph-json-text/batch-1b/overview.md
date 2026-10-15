<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1b — Curated refs and vendored inputs

One task after T1: the ~30 curated inputs (D8) across D2's tiers, their oracle parse refs, and the inputs vendored
into the repo so the curated test (written in T13) runs in CI without elk-models.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | Curated list, `regen-elkj-refs.sh` (convert + vendor + parse refs) | tooling-engineer | test/corpus/elkj-curated.json, tools/oracle/regen-elkj-refs.sh, test/corpus/elkj-curated/**, test/golden/refs/elkj-parse/**, .gitattributes | T1 | [ ] |

Batch done when the script run twice leaves the repo byte-identical and the README gates are green.
