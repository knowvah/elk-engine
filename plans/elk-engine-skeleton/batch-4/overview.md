<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Goldens, conformance doc, roadmap

After Batches 3a and 3b. T16 and T18 are independent; T17 needs T16.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T16 | Oracle golden refs + CI test | typescript-pro | tools/oracle/regen-goldens.sh, test/golden/refs/elk/*.json, test/golden/oracle-refs.test.ts | T7, T11, T12 | [ ] |
| T17 | Conformance doc + oracle runbook | documentation-engineer | docs/conformance.md | T11, T16 | [ ] |
| T18 | Follow-on mission roadmap | documentation-engineer | plans/roadmap.md | T13, T14, T15 | [ ] |

After the batch: run all gates, update `.agent-notes/`, merge the branch
(see README "Mission end").
