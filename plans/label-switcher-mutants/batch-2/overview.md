<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: design and record the discriminating site rows

One task. At the end, the labels recorder writes the new `sites/LabelDummySwitcher/spaceEfficient-*` rows, the ref
is re-recorded by script (append-only, D4), and every new row replays green.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-oracle-rows.md) | New site rows in `LayeredLabelsVectors.java`; cold re-record; append-only proof; the `rowCounts.sites` literal | orchestrator | `tools/vectors/LayeredLabelsVectors.java`, `test/golden/refs/java/layered-labels.json`, `src/alg/layered/LayeredLabelsVectors.test.ts` (line 123 only), plan files | T1 | [x] |

Gate: `npx vitest run src/alg/layered/LayeredLabelsVectors.test.ts` green with the sweep dirs off; the append-only
script reports 0 changed pre-existing rows.
