<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `InteractiveLayeredGraphVisitor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port the interactive layered graph visitor`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T10/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim, including odd loops. L4 applies.

## Context

Mission 7f2, G1, G5, F10, F11. `InteractiveLayeredGraphVisitor` (956 Java lines, `J/InteractiveLayeredGraphVisitor.java`,
package root) implements `IGraphElementVisitor` (`src/core/util/IGraphElementVisitor.ts`, landed). It has no caller in the plugins
(`.agent-notes/layered-labels-planning.md`): consumers apply it manually or through `DiagramLayoutEngine` (out of scope), and
`Layered.melk` documents `layerChoiceConstraint`/`positionChoiceConstraint` through it. Rows follow the Java's two-run protocol
(G5): lay out, apply the visitor, lay out again; the `interactive` op of T1 and T2 drives it.

## Task

1. `src/alg/layered/InteractiveLayeredGraphVisitor.ts` from `J/InteractiveLayeredGraphVisitor.java:59-956`, symbols in Java order:
   the constants (`PSEUDO_POSITION_SPACING` and `LAST_LAYER_INDEX`, both `Integer.MAX_VALUE`, `:69,:77`), `visit` (`:84`, root
   nodes only), `setInteractiveOptionsAndPseudoPositions` (`:97`), `setCoordinates` (`:132`), `calcLayerNodes` (`:151`) and its
   helpers (`:207-360`, constraint chains and layer fill), `getEdgeTargetsOrSources`-style neighbour search (`:363-428`),
   `initialLayers` (`:430`), `setCoordinateInLayoutDirection` (`:476`, the four `Direction` arms), position-constraint handling
   (`:525-680`), `swapNodes` (`:730`), the circle check (`:781-835`), `setInteractiveStrategies` (`:865`), `getElkNode` (`:882`),
   `getChainByLayerNodes` (`:898`), `getChainByAllNodes` (`:934`). Read each helper's name from the Java; `@see` on every symbol.
2. **Keep the Java's quirks:** `setCoordinates(root)` and `setInteractiveStrategies(root)` run **inside** the loop over
   `root.getChildren()` (`:103-122`), once per child; `LayeredOptions.ALGORITHM_ID.endsWith(algorithm)` (`:100`) is an `endsWith`
   on the option id, not an equality; the layer-constraint switch has no default arm. Preserve all three, with a comment naming the line.
3. **Numeric (F11, the hazard of this class):** `PSEUDO_POSITION_SPACING = Integer.MAX_VALUE` is an `int` added to and multiplied
   in `double` and `int` expressions: apply `Int32` wrapping exactly where Java's static types make the operation `int`; the
   `position + node.getWidth() / 2 >= nextPosition` comparisons (`:487`, `:493`, `:499`, `:505`) are `double`. Boxed-compare
   audit on `Integer` choice constraints (C6, stop 16 when provenance cannot be proven fresh or shared).
4. **Recursion (F11):** the helpers `getChainByLayerNodes`, `getChainByAllNodes` and the swap logic loop; a true recursion gets an
   explicit stack, proven against a verbatim recursive twin on a deep chain under `--pool=forks --execArgv=--jitless`
   (stop 7 on overflow or divergence). `ArrayList.contains` uses identity (`equals` of `ElkNode` is identity).
5. Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params): the class is large, so sections behind a facade in prefixed
   files (the constraint translation, layer calculation, position calculation, chains), Java order kept; run
   `npm run complexity` after the first full write.
6. Replay every `scenarios/InteractiveLayeredGraphVisitor/*` row and the `full/interactive/*` rows through T2's `interactive` op:
   each `LayerConstraint` arm (`NONE`, `FIRST`, `LAST`, others), each `Direction`, chains with `inLayerSuccOf`/`inLayerPredOf`,
   a circle (`:811`), nodes with and without a position choice.

## Write-set

`src/alg/layered/InteractiveLayeredGraphVisitor*.ts` and their colocated tests.

## Read-set

`J/InteractiveLayeredGraphVisitor.java`, `src/core/util/IGraphElementVisitor.ts`, `src/graph/**` (ElkGraph accessors only),
`src/alg/layered/options/LayeredOptions.ts` (`LAYERING_LAYER_CHOICE_CONSTRAINT`, `CROSSING_MINIMIZATION_*`),
`src/java/lang/Int32.ts`, `test/helpers/layered-labels-replay-ops.ts`, `decisions.md` G1, G5, F10, F11, F16.

## Architecture decisions

G1, G5 (ported whole, two-run protocol), F10, F11 (idioms, explicit stacks), AD-10.

## Interface contract (consumed by T12, T17b)

`new InteractiveLayeredGraphVisitor()` with `visit(element: ElkGraphElement): void` and the two exported constants.

## Acceptance criteria

- Given an `interactive` row, when replayed (layout, visit, layout), then the second layout equals the row (AD-4).
- Given a node with `layerConstraint=LAST` and no choice constraint, when visited, then its choice constraint is `Integer.MAX_VALUE`.
- Given a root with several children, when visited, then `setCoordinates` has run once per child as in Java.
- Given a fresh process, when the module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
