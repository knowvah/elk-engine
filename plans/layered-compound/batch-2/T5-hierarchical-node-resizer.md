<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `HierarchicalNodeResizingProcessor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port hierarchical node resizing processor`
Scratch: `$TMPDIR/7h/T5/`.

## Context

Mission 7h, H1, H11. `J/intermediate/HierarchicalNodeResizingProcessor.java` (229 lines) is the last pending arm
(`HIERARCHICAL_NODE_RESIZER`, added after P5 for nested graphs by `J/GraphConfigurator.java:78`). Its arm throws
`notPorted('HierarchicalNodeResizingProcessor', '7h')` at `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts:264`
until T8. Its `resizeGraph`/`resizeGraphNoReallyIMeanIt` (`:132-229`) are a **separate copy** of `ElkLayered.java:675-772`
(landed as `src/alg/layered/ElkLayeredResize.ts`). The copies differ: the processor has no `NODE_SIZE_FIXED_GRAPH_SIZE` guard
(`ElkLayered.java:702` versus `HierarchicalNodeResizingProcessor.java:163`), and its comments differ. Keep method boundaries:
port the processor's own copy and do not import `ElkLayeredResize.ts` (CLAUDE.md, "keep method boundaries").

## Task

1. Port the class at `src/alg/layered/intermediate/HierarchicalNodeResizingProcessor.ts` with `/** @see … */` and every
   branch: `process`, `graphLayoutToNode`, `isNested`, `resizeGraph`, `resizeGraphNoReallyIMeanIt`.
2. Leave the enum arm untouched (T8 wires it). Add the class to the entry-point lists (F10).
3. Tests: replay the T1 `models` stops that follow `HierarchicalNodeResizingProcessor` on a nested graph. Restore the preceding
   stop's tree, call `process` on that nested graph, and compare with `expected.tree` via T2's helpers. If restoring is
   infeasible before T8, run the hierarchical driver with the enum's `create` spied to return this class for the arm. Under H11
   the compound facades still throw, so that route is possible only after T6 and T7. In that case, keep this task's row tests as
   `describe` blocks that T9 enables, and journal it. Structure checks from the Java go in this task in either case.

## Write-set

`src/alg/layered/intermediate/HierarchicalNodeResizingProcessor{,.test}.ts`; the entry-point list file of F10 (journal it).

## Read-set

`J/intermediate/HierarchicalNodeResizingProcessor.java`, `J/ElkLayered.java:675-772`, `src/alg/layered/ElkLayeredResize.ts`,
`src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts:250-270`, T2's helpers, `decisions.md` H11, F10, F11, F16.

## Interface contract (consumed by T8)

`new HierarchicalNodeResizingProcessor()` implementing `ILayoutProcessor<LGraph>`.

## Acceptance criteria

- Given each T1 resizer stop, when the processor runs on the restored nested graph, then `expected.tree` matches at AD-4.
- Given a graph with `NODE_SIZE_FIXED_GRAPH_SIZE` true, when resized by this processor, then it is resized anyway (the Java has
  no guard here), as a recorded row shows. If no row has this, T12 lists it as an S scenario.
- Given the enum arm, when created before T8, then it still throws naming 7h.

## Observability / Rollback

N/A. Reversible.
