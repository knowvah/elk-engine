<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: #32 — unsized end labels run with assertions off

## Context

#112 row #32, option 2: `EndLabelPreprocessor.java:377` asserts that an end label's cell rectangle is non-empty; a label
without a size gives an empty cell, and the JVM throws under `-ea` on such models (`labelStacking_down_up.elkt`). The
recorded rows pin what a JVM without `-ea` does. 170 tests in 12 files replay them (#112 table). Decisions
[D2](../decisions.md#d2-the-32-predicate-hasunsizedendlabelroot-elknode-boolean),
[D3](../decisions.md#d3-where-the-32-rows-are-wrapped), [D6](../decisions.md#d6-one-new-test-per-site-with-assertions-on).

## Write-set

- `test/helpers/unsized-end-labels.ts` (new: `hasUnsizedEndLabel`, `withEndLabelRule`), `test/helpers/unsized-end-labels.test.ts`
- The runner files `census.md` names for #32 (expected: `layered-labels-replay-ops.ts`, `layered-labels-replay-full.ts`,
  `layered-routing-replay-ops.ts`, `layered-compound-replay-run.ts`, `layered-compound-replay-stops.ts`,
  `layered-loops-replay-rows.ts`, all under `test/helpers/`)
- `src/alg/layered/intermediate/EndLabelPreprocessor.test.ts` (one new test only)

## Read-set

`census.md` (#32 table); `test/helpers/with-assertions.ts`; `src/alg/layered/graph/transform/ElkGraphImporterEdges.ts:110-130`;
`src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:100-125`; each runner function the census names, by
symbol (`find_symbol`), not whole files.

## Interface

```ts
export function hasUnsizedEndLabel(root: ElkNode): boolean;
export function withEndLabelRule<T>(root: ElkNode, body: () => T): T; // predicate ? withAssertions(false, body) : body()
```

## Steps

1. `unsized-end-labels.test.ts` first (TDD): a graph with no labels → false; a sized HEAD label → false; a `TAIL` label
   of width 0, and one of height 0 → true; an unsized CENTER label → false; an unsized HEAD label on an edge inside a
   nested node → true; `withEndLabelRule` turns assertions off only inside `body` and restores the state (read back
   with `assertionsEnabled()`).
2. Implement D2. Wrap the laying-out step of each census runner in `withEndLabelRule(root, …)`, where `root` is the
   prepared root that step lays out.
3. Count per D3 with a temporary counter (removed before handing back): distinct tests among the 12 files that run a
   step with the predicate true. Report the predicate text, the count and, if not 170, the differing tests with the
   mechanism.
4. New test in `EndLabelPreprocessor.test.ts`: a census row (or `labelStacking_down_up`'s row) replayed inside
   `withAssertions(true, …)` throws `AssertionError` with message `''`.
5. Run the 12 files and the runner helpers' own tests in both modes; report per-file counts against the T2 baseline.

## Acceptance criteria

- Given the 12 files of #112, when they run with assertions on, then all pass with the T2 per-file counts.
- Given the counter, when the 12 files run, then the count of selected tests is reported (expected 170) and every #32
  census test is among them.
- Given a model with only sized end labels, when replayed, then assertions stay on for its whole run.
- Given the new test, when run in either mode, then it observes `AssertionError` from `EndLabelPreprocessorPlacement`.

## Observability / rollback

N/A — test code only. Reversible.
