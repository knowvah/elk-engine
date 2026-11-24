<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: record the rows, prove the arms per row

The orchestrator runs this batch. Both recorder runs are JVM runs. T5 and T6 write different recorders and refs, so
they can run one after the other in either order. T7 needs both.

| Task | Writes | Owner |
| ---- | ------ | ----- |
| [T5](T5-record-order.md) | `tools/vectors/LayeredOrderVectors.java` (`SCENARIOS` additions), `test/golden/refs/java/layered-order.json` | orchestrator |
| [T6](T6-record-compound.md) | `tools/vectors/LayeredCompoundVectors.java` (`SITE_n`, `SITE_ROWS`), `test/golden/refs/java/layered-compound.json`, `test/helpers/layered-compound-site-arms.json` | orchestrator |
| [T7](T7-arm-proofs.md) | `tools/vectors/compound-site-arms.mjs`, `test/helpers/layered-order-search-arms.json`, `src/alg/layered/LayeredOrderVectors.test.ts` (one new test) | orchestrator |

If batch 2 found no row for a recorder, skip that recorder's task and journal the skip. If it found no row at all,
skip batch 3.

One commit per task. Gate after each: the replay test of the ref
(`npx vitest run src/alg/layered/LayeredOrderVectors.test.ts` or `LayeredCompoundSites.test.ts`
`LayeredCompoundVectors.test.ts`), the D5 diff, `npm run typecheck`, `npx prettier --check <changed files>`.

Status: [x] T5 · [x] T6 · [x] T7

**Withheld (2026-11-23).** T5, T6 and T7 were carried out and committed, then taken back out of the tree: the ten rows need three
pinned row-id lists of existing tests extended (AD-13, stop 4; issue #156, `needs-ruling`). The work is in
[`withheld/record-rows.patch`](../withheld/record-rows.patch) and in the per-task history under the pre-squash tag.
