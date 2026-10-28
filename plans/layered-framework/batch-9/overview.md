<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — Docs, roadmap, summary

One task in the main session; then the landing regroup (stop 13).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T12 | Architecture doc and runbook, conformance, port map, inventory, overview, roadmap revision, notes, summary | main session | see [T12](T12-docs-and-roadmap.md#write-set) | T11 | [x] |

The batch is done when T12's acceptance criteria pass, `npm run docs:build` is green and the mission-end gates
(including both `regen-goldens.sh` sets) leave `test/golden/refs/` byte-identical.
