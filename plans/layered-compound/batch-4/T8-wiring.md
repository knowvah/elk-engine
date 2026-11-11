<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Wiring, unstaging, pre-approved assertions

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): wire compound graph layout and the node resizer`
Scratch: `$TMPDIR/7h/T8/`.

## Context

Mission 7h, H7, H11, H12. After batch 3 every 7h class exists, but `doCompoundLayout` still throws at the staged facade, and the
`HIERARCHICAL_NODE_RESIZER` arm throws. This task flips both. The landed tests that assert the staged behaviour change only as
H7 lists, each journaled as an `ad13` row with its old and new form.

## Task

1. `CompoundGraphPreprocessor.process` → `processCompoundGraphPreprocessor(this, graph, monitor)`;
   `CompoundGraphPostprocessor.process` → `processCompoundGraphPostprocessor(graph, monitor)`. Replace the facades' staged
   Javadoc with the Java's class Javadoc and `@see`.
2. `IntermediateProcessorStrategyCreate.ts:264`: return `new HierarchicalNodeResizingProcessor()`.
3. Remove line 2 (`// @staged 7h`) of `CrossHierarchyEdge.ts` and the two facades, and empty `test/architecture/staged-classes.json`
   to `[]`. If `staged-classes.fitness.test.ts` rejects an empty list, adapt it minimally (H7) so that it still checks marker and
   row agreement.
4. H7's changes, and only these: `IntermediateProcessorStrategy.test.ts` (tally 59 ported / 0 pending, titles);
   `CompoundGraphPreprocessor.test.ts` and `CompoundGraphPostprocessor.test.ts` (tests of the facade: the `process` delegation
   compared with one `models` row each); `ElkLayered.test.ts:243-275` (the staged-throw case becomes a completed compound layout
   compared with a `layered-compound.json` row, and the spies on staged classes go); `LayeredLayoutProvider.test.ts`
   (`COMPOUND_STAGED_MESSAGE` cases become completed layouts compared with rows); `test/helpers/layered-site-replay.ts:206-325`
   (`compareProvider`/`isCompoundProviderRow`: the `include-children*` provider rows compare their recorded `layout` and `elk`; the
   staged-calls expectation becomes `['doCompoundLayout']` with no throw) and the matching comment of `LayeredSiteVectors.test.ts:9`.
   Then fix the "U until 7h" header comments in `src/alg/layered/p3order/*.test.ts` and `greedyswitch/SwitchDecider.test.ts`
   (comments only: "proven by `layered-compound.json` rows").
5. Enable any T5/T6/T7 row tests deferred until wiring, and run them through the real driver now, with no spies.
6. Run the fresh-process import check and the entry-point fitness test (F10). A temporal-dead-zone failure is resolved by the E1
   recipe, never by entry-order imports (stop 15).

## Write-set

`src/alg/layered/compound/{CompoundGraphPreprocessor,CompoundGraphPostprocessor,CrossHierarchyEdge}{,.test}.ts`,
`src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`, `IntermediateProcessorStrategy.test.ts`,
`test/architecture/staged-classes.json` (and `staged-classes.fitness.test.ts` only per step 3), `src/alg/layered/ElkLayered.test.ts`,
`src/alg/layered/LayeredLayoutProvider.test.ts`, `test/helpers/layered-site-replay.ts`, `src/alg/layered/LayeredSiteVectors.test.ts`,
comment lines of `src/alg/layered/p3order/*.test.ts` and `src/alg/layered/intermediate/greedyswitch/SwitchDecider.test.ts`,
T5–T7's test files (step 5).

## Read-set

`decisions.md` H7, H11, F10; `plans/layered-labels/batch-3/T11-wiring.md` and `plans/layered-loops-wrapping-compaction/batch-6/T15-wiring.md`
(the precedent wiring tasks); the H7 line ranges; T2's helpers.

## Acceptance criteria

- Given a compound graph with `INCLUDE_CHILDREN`, when `RecursiveGraphLayoutEngine` lays it out, then it completes and equals
  its `layered-compound.json` `full` row at AD-4.
- Given the `include-children*` site rows, when replayed, then their recorded `layout` and `elk` match.
- Given `IntermediateProcessorStrategy.test.ts`, then it reports 59 arms ported and 0 pending; `staged-classes.json` is `[]`.
- Given `git diff` of this commit, then every changed assertion is in H7's list and has an `ad13` journal row.
- Given the README gates (coverage included, run by the orchestrator), then they are green.

## Observability / Rollback

N/A. Reversible (revert the commit restores the staged state).
