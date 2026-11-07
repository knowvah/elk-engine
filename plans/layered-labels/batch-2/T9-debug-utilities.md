<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `DotDebugUtil`, `JsonDebugUtil`, `DebugUtil` unstaged

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the dot and json debug utilities`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T9/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. L4 applies.

## Context

Mission 7f2, G1, G3, G11, F1, F10, F11. `DotDebugUtil` (233 Java lines) and `JsonDebugUtil` (653) build the debug strings that
`DebugUtil` (123, staged in TS: `src/alg/layered/DebugUtil.ts`, every overload throws naming `DotDebugUtil` and 7f2) hands to
`monitor.logGraph(..., LoggedGraphType.DOT|JSON)`. Callers behind `monitor.isLoggingEnabled()`: `ElkLayered` (`:252,:267,:293,:606,:620`)
and `LinearSegmentsNodePlacer`. `JsonDebugUtil.writeProperties` iterates `getAllProperties()` (`J/JsonDebugUtil.java:566-595`, call
sites `:277,:432,:484,:546`), an identity-keyed `HashMap` whose order is G3's pre-decided case.

## Task

1. `src/alg/layered/DotDebugUtil.ts` from `J/DotDebugUtil.java:35-233`: `createDebugGraph(lgraph)` (`:57`), the segment-graph
   overload (`:~90-125`, suffixed name), the hypernode overload (`:128-157`), `writeLayer` (`:159-233`).
2. `src/alg/layered/JsonDebugUtil.ts` from `J/JsonDebugUtil.java:44-653`: the three `createDebugGraph` overloads (`:60`, `:~83`, `:145`),
   `calculateGraphSize` (`:206`), `calculateMinMaxPositions` (`:234`), `beginGraph`/`writeLgraph`/`endGraph` (`:269-370`), node,
   edge, port and property writers (`:377-595`), `getValueRepresentation` (`:597`), `getNodeName` (`:626`). Split behind a facade at
   Java method boundaries (it exceeds 500 lines): prefixed files per section; `StringWriter` becomes a string accumulator
   (`+=` is fine in TS).
3. **G3:** `writeProperties` writes `getAllProperties()` in **insertion order** (AD-10); journal the AD-10 row naming
   `JsonDebugUtil.java:573`. The DOT output has no properties and compares exactly. Every other part of the JSON equals the Java
   byte for byte.
4. **Numbers into strings:** the Java concatenates `double` and `float` values; JS prints `1` where Java prints `1.0`. Use the landed
   `toString` of `src/java/lang/DoubleToString.ts` for every `double`; `float` values go through `Float32` first.
5. `DebugUtil.ts`: replace the three throwing overloads with the Java bodies (`J/DebugUtil.java:48-121`): tags `slotIndex + "-" + name`,
   `"segment graph"`, `debugPrefix + " - " + label`; DOT then JSON through `monitor.logGraph(string, tag, LoggedGraphType.*)`
   (`src/core/util/BasicProgressMonitor.ts:294`). The hypernode list type becomes `readonly HyperEdgeSegment[]`
   (`src/alg/layered/p5edges/orthogonal/HyperEdgeSegment.ts`, landed 7e). Names stay `logDebugGraphSlot`, `logDebugGraphSegments`,
   `logDebugGraphHyperedges`. **Keep the header marker `// @staged 7f2`** until T11 removes it with the `staged-classes.json` row
   (the fitness test requires agreement, G11).
6. **G11, the only three assertion changes of this task**, each journaled old and new: `src/alg/layered/DebugUtil.test.ts` (the three
   throw tests become tests of the real logged strings: tag, DOT and JSON entries of `monitor.getLoggedGraphs()`) and the
   `DotDebugUtil is ported in mission 7f2` literal in `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts:433-441` (the case
   asserts the logged segment graph instead of the throw), and the logging case of
   `src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts:121-122` (it pins the `DebugUtil` throw; it now asserts the logged
   graphs, with the count and tags of `J/intermediate/ConstraintsPostprocessor.java:45,71`). Any other changed assertion is stop 3.
7. Replay every `logged` row's strings through T2's comparator (`compareLogged`): DOT exact, JSON per G3. Respect the limits
   (30 NLOC, CCN 10, 5 params); `npm run complexity` after the first full write.

## Write-set

`src/alg/layered/{DotDebugUtil,JsonDebugUtil,DebugUtil}*.ts` and their colocated tests,
`src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts` and `src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts`
(G11, one case each).

## Read-set

`J/{DotDebugUtil,JsonDebugUtil,DebugUtil}.java`, `src/core/util/{BasicProgressMonitor,LoggedGraph}.ts`,
`src/java/lang/DoubleToString.ts:157-165`, `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts:425-445`,
`src/alg/layered/DebugUtil.test.ts`, `test/helpers/layered-labels-replay-logged.ts`, `decisions.md` G1, G3, G11, F10, F11, F16.

## Architecture decisions

G1, G3 (property order, comparator), G11 (three assertion changes), F10, F11, AD-10.

## Interface contract (consumed by T11, T12)

`DebugUtil.logDebugGraphSlot/Segments/Hyperedges` log DOT then JSON as the Java; `DotDebugUtil.createDebugGraph*` and
`JsonDebugUtil.createDebugGraph*` return strings; no `UnsupportedOperationException` remains.

## Acceptance criteria

- Given a `logged` row, when its DOT string is produced, then it equals the row exactly.
- Given a `logged` row, when its JSON string is produced, then it equals the row except property order inside property lists (G3).
- Given a graph with a double `1.0` coordinate, when written, then the string reads `1.0` as the Java prints it.
- Given `git diff`, when read, then the only changed assertions are the three of G11 and the journal lists each old and new.

## Observability / Rollback

The logging path becomes real: `monitor.logGraph` now receives DOT and JSON strings behind `isLoggingEnabled()`, observable
through `getLoggedGraphs()` and checked by the `logged` rows (G3). Reversible: revert the commit (the throws return with it).
