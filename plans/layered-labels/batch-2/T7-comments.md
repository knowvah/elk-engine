<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `CommentPreprocessor`, `CommentNodeMarginCalculator`, `CommentPostprocessor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the three comment processors`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T7/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. No assertion the Java lacks in a ported suite. L4 applies.

## Context

Mission 7f2, G1, F1, F10, F11. Comment boxes (`COMMENT_BOX`) are removed from the graph before layering and re-attached to their
node afterwards. `CommentPreprocessor` (234 Java lines) detaches them into `TOP_COMMENTS`/`BOTTOM_COMMENTS`;
`CommentNodeMarginCalculator` (111) widens node margins for them; `CommentPostprocessor` (186) places them and routes their edges.
Four `tests/layered` models carry comment boxes. Arms `COMMENT_PREPROCESSOR`, `COMMENT_NODE_MARGIN_CALCULATOR`,
`COMMENT_POSTPROCESSOR` (`IntermediateProcessorStrategyCreate.ts:68,172,210`) throw until T11. None of the three calls
`DebugUtil` (`CommentPreprocessor.java:110-112` only calls `monitor.log`).

## Task

1. `CommentPreprocessor.ts` from `J/intermediate/CommentPreprocessor.java:52-234`: `process` (`:55-115`: iterator removal of comment
   nodes at `:61`, the single-connection tests at `:69-82`, the reversed-edge pass at `:88-108`, the log line at `:110`),
   `processBox` (`:125-205`, with the port-constraint scan at `:128-145`, the label scan at `:147-157`, and the four
   `topFirst`/`onlyTop`/`onlyBottom` arms at `:159-205`), the edge-removal helper (`:209-222`), `removeHierarchicalPortDummyNode`
   (`:224-234`). `Lists.newArrayList()` becomes `[]`. The `nodeIter.remove()` mutation during iteration keeps the Java's
   order (iterate a snapshot with an index, or the landed list iterator).
2. `CommentNodeMarginCalculator.ts` from `J/intermediate/CommentNodeMarginCalculator.java:45-111`: `process` (`:48-60`) and
   `processComments` (`:62-111`).
3. `CommentPostprocessor.ts` from `J/intermediate/CommentPostprocessor.java:51-186`: `process` (`:54-87`), the private overload
   (`:89-167`, distinct top and bottom passes), `getBoxPort` (`:169-186`) as a suffixed name for the overload.
4. **Numeric (F11):** every `double` stays `number`; `getDegree()` equality tests are `Int32`-safe; the unboxing audit on
   `COMMENT_BOX`, `PORT_CONSTRAINTS`, `TOP_COMMENTS`, `BOTTOM_COMMENTS` reads (null-default ones get an explicit check).
5. **Containers (F11):** none is hashed; the comment lists are insertion-ordered arrays as in Java.
6. Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params): sections behind a facade (P1), Java order kept;
   `npm run complexity` after the first full write of each file.
7. Replay every `scenarios/Comment{Preprocessor,NodeMarginCalculator,Postprocessor}/*` row and the `models` rows stopping at the
   three arms, with the classes injected; each of the four arms of `processBox` and both box ports gets a row (T1's scenarios).
8. Port nothing of `CommentPostprocessorTest` (T13b) or the `NodeMarginCalculatorTest` hook (T13c).

## Write-set

`src/alg/layered/intermediate/Comment{Preprocessor,NodeMarginCalculator,Postprocessor}*.ts` and their colocated tests.

## Read-set

`J/intermediate/Comment{Preprocessor,NodeMarginCalculator,Postprocessor}.java`, `src/alg/layered/options/InternalProperties.ts`
(`TOP_COMMENTS`, `BOTTOM_COMMENTS`), `src/alg/layered/graph/{LGraph,LNode,LPort,LEdge,Layer}.ts` (accessors only),
`test/helpers/layered-labels-replay-*.ts`, `decisions.md` G1, F1, F10, F11, F16.

## Architecture decisions

G1, F1, F10 (E1 recipe), F11 (idioms), AD-10 (no hashed iteration here).

## Interface contract (consumed by T11)

`new CommentPreprocessor()`, `new CommentNodeMarginCalculator()`, `new CommentPostprocessor()`, each with
`process(graph, monitor)`; `CommentNodeMarginCalculator` exposes what `NodeMarginCalculatorTest` calls (T13c).

## Acceptance criteria

- Given a comment-box row, when `CommentPreprocessor` is replayed, then `TOP_COMMENTS` and `BOTTOM_COMMENTS` hold the row's boxes in order.
- Given a `scenarios/CommentPostprocessor/*` row, when replayed, then box positions and edge bend points equal the row (AD-4).
- Given a node with comment boxes wider than the node, when the margin calculator runs, then the margins equal the row's.
- Given a fresh process, when each new module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
