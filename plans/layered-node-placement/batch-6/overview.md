<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Anchored unit tests

Two parallel tasks after T11 (7c's batch 8): one colocated case per S and J item of `unreached.md`, literals equal to
a `layered-placement.json` row (6c D1), comment `// oracle: <row id>; <Java file:line>`. Write-sets are disjoint by
directory; the tasks never edit a `src/` non-test file (a port defect found here is a stop with a diagnosis).
`sites/*` rows are branch probes: `BasicNodePlacementTest.test.ts` stays restricted to pipeline rows and is not in
either write-set. Each task uses a private scratchpad subdirectory (`<scratch>/T12a`, `<scratch>/T12b`): the session
scratchpad is shared between parallel agents (`.agent-notes/layered-crossing-min.md`).

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T12a | Placer and processor anchored tests ([brief](T12a-placer-tests.md)) | typescript-pro | src/alg/layered/p4nodes/*.test.ts (not bk/, not BasicNodePlacementTest.test.ts), src/alg/layered/intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,InLayerConstraintProcessor,HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.test.ts | T11 | [x] |
| T12b | Brandes-Köpf anchored tests ([brief](T12b-bk-tests.md)) | typescript-pro | src/alg/layered/p4nodes/bk/*.test.ts | T11 | [x] |

The batch is done when every S row is anchored, the README gates are green and per-class branch coverage is ≥ 90 %
except U-explained shortfalls (else stop 10). Agents never run `npm run coverage` and never commit.
