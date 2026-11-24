<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: radial items R-a to R-d → `radial-extra.json`

## Context

`radial.json` (309 rows, counts pinned) does not reach two arms (R-a, R-b), and its recorded fields do not observe two
mutants (R-c, R-d). 8a's scratch runs found that R-a and R-b already agree with the oracle. The T1 rows of the journal
give the exact mutants and the baseline coverage. Follow the batch 2 common rules ([overview.md](overview.md)).

## Task

1. Per item, in order R-a, R-b, R-c, R-d, within D4's budget: build the smallest ELK JSON input that reaches the arm or
   distinguishes the mutant. Confirm it on the oracle with a probe, and screen it with the TS engine.
   - R-a: a tree with `org.eclipse.elk.radial.radius` in [-2, 0), e.g. -1, full and stops.
   - R-b: `compactor=RADIAL_COMPACTION` with `sorter=ID`. Add `POLAR_COORDINATE` with `POSITION` on every node if it is cheap.
   - R-c: `sorter=POLAR_COORDINATE`, `POSITION` set so that one node sits exactly at angle 0 from its parent
     (`position.y + nodeOffsetY == 0`, x > 0). Read the comparator's callers for `nodeOffsetY` and `radialOffset`.
   - R-d: two boxes exactly touching after a compaction step. Use integer sizes, spacing and positions on an axis through
     the root (items.md lead). If it is not found in budget, journal the closest approach (the smallest gap seen).
2. Add the inputs to `RadialVectors.java` as a second plan writing `radial-extra.json` after `radial.json` (D2). Use the
   scenario builders the first plan uses (`binary`, `multi`, `positions`, `orderIds`, `opts`, `plus`). Update the header's
   output contract and `radial-vectors.sh`'s comments to name the new file.
3. Record (common rules). Then write `src/alg/radial/RadialExtraVectors.test.ts` (D3): every full, stops and throws row of the
   new file at the AD-4 bar, with a `rowCounts` assertion in literal numbers.
4. D4 evidence per item: scoped coverage of the new test alone for R-a and R-b, and `mutate.sh` for R-c and R-d against
   `RadialExtraVectors.test.ts` and `RadialVectors.test.ts`.

## Write-set

`tools/vectors/RadialVectors.java`, `tools/vectors/radial-vectors.sh` (comments only), `test/golden/refs/java/radial-extra.json`,
`src/alg/radial/RadialExtraVectors.test.ts`, `test/helpers/radial-replay-rows.ts` (a path helper only).

## Read-set

[items.md](../items.md) rows R-a to R-d; `tools/vectors/RadialVectors.java` header (lines 1-175) and `main` (around 1427);
`src/alg/radial/RadialVectors.test.ts:1-60`; `test/helpers/radial-replay-rows.ts:100-120, 270-300`; `test/helpers/radial-replay-run.ts`;
the Java and TS sites in [items.md](../items.md); `plans/alg-trees/unreached.md` § radial.

## Interface contracts

Output: `radial-extra.json`, the row and header contract of `radial.json` (the recorder header), ids `<group>/<family>/<name>`
unique within the file. T5 consumes the report table and the row counts.

## Acceptance criteria

- Given the recorder change, when it runs cold twice, then `radial.json` is `cmp`-equal to the committed file and
  `radial-extra.json` is `cmp`-equal between the runs.
- Given `RadialExtraVectors.test.ts`, when run, then every row passes at the AD-4 bar and the row counts match.
- Given R-a and R-b with outcome 1, when the new test runs alone with scoped coverage, then the arm at the named TS line is taken.
- Given R-c and R-d with outcome 1, when `mutate.sh` applies the T1 mutant, then `RadialExtraVectors.test.ts` reports
  `killed`, `RadialVectors.test.ts` reports `survived`, and the file is restored.
- Given any item without outcome 1, when the report is written, then it holds the proof (outcome 3) or the closest approach (outcome 4).

## Quality bar

`npx vitest run src/alg/radial test/helpers/radial-*` green; `npm run typecheck`; `npx prettier --check` on the changed TS.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (additive).
