<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Stage classes, enum tally, `7f2` naming

**Agent:** main session · **Commit:** `feat(T2): stage compaction and compound classes, name 7f2 in stages`

## Context

Mission 7f (README), F1, F9, L1. The driver constructs a `ComponentsProcessor` and two compound processors, the row placers
construct `ComponentsCompactor`; those classes belong to 7g and 7h. The deferred arms and stages must name the brief that
really ports them.

## Task

1. `src/alg/layered/components/ComponentsCompactor.ts` `// @staged 7g`: only the members `SimpleRowGraphPlacer.java:85`,
   `ComponentGroupGraphPlacer.java:122` and `ComponentGroupModelOrderGraphPlacer.java:134` reference, each throwing
   `UnsupportedOperationException('ComponentsCompactor is ported in mission 7g')`; `@see`.
2. `src/alg/layered/compound/CompoundGraphPreprocessor.ts` and `CompoundGraphPostprocessor.ts` `// @staged 7h`: implement
   `ILayoutProcessor<LGraph>`, `process` throws naming 7h; `@see`.
3. `test/architecture/staged-classes.fitness.test.ts:22`: widen `MARKER` to accept `7f2` (F9). `staged-classes.json`: three
   new rows; `DebugUtil.ts` and `LabelDummySwitcher.ts` move to `7f2`, sorted by path. `ElkLayered.ts` stays until T8.
4. `src/alg/layered/DebugUtil.ts`: marker, comments and the three `notPorted('DotDebugUtil', '7f')` calls name `7f2`;
   `src/alg/layered/intermediate/LabelDummySwitcher.ts:2,11,23` likewise. F9 assertion changes, journaled with old and new:
   `src/alg/layered/DebugUtil.test.ts:9`, the message literal in `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts`.
5. `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`: the twelve F1 label and comment arms call
   `notPorted(…, '7f2')`, `HIERARCHICAL_NODE_RESIZER` `notPorted(…, '7h')`; the six arms of this brief keep `'7f'` until T8.
   `IntermediateProcessorStrategy.test.ts` `ARMS` and the tally `it` move the same way (F9): `{ '7b': 10, '7c': 10, '7d': 5,
   '7e': 6, '7f': 6, '7f2': 12, '7g': 9, '7h': 1 }`. Ported and pending counts unchanged at this task.
6. Small structural tests for the three stages (message, `instanceof UnsupportedOperationException`).

## Write-set

`src/alg/layered/components/ComponentsCompactor.{ts,test.ts}`, `src/alg/layered/compound/CompoundGraph{Pre,Post}processor.{ts,test.ts}`,
`test/architecture/staged-classes.{json,fitness.test.ts}`, `src/alg/layered/intermediate/{IntermediateProcessorStrategyCreate,LabelDummySwitcher}.ts`,
`src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts`, `src/alg/layered/DebugUtil.{ts,test.ts}`,
`src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts`, `plans/layered-pipeline/decision-journal.md`.

## Read-set

`J/components/{SimpleRowGraphPlacer.java:80-90,ComponentGroupGraphPlacer.java:115-130,ComponentGroupModelOrderGraphPlacer.java:128-140,
ComponentsCompactor.java:62-110}`, `J/compound/CompoundGraph{Pre,Post}processor.java` (headers),
`src/alg/layered/compound/CrossHierarchyEdge.ts` (stage pattern), `test/architecture/staged-classes.fitness.test.ts:1-60`,
`decisions.md` F1, F9.

## Architecture decisions

F1 (stages, tally), F9 (the assertion changes), L1.

## Interface contract (consumed by T4, T8)

`ComponentsCompactor` public members as the three call sites use them; `CompoundGraphPreprocessor` and
`CompoundGraphPostprocessor` constructible with no arguments, `process` throwing naming 7h.

## Acceptance criteria

- Given the staged-classes fitness test, when run, then it passes with `7f2` and the three new rows.
- Given `IntermediateProcessorStrategy.test.ts`, when run, then the tally equals F1 and each throwing arm names its mission.
- Given `DebugUtil.logDebugGraphSlot`, when called, then it throws `DotDebugUtil is ported in mission 7f2`.
- Given `git diff`, when read, then the only changed assertions are F9's; the journal lists old and new.

## Observability / Rollback

N/A — no new observable operations. Reversible.
