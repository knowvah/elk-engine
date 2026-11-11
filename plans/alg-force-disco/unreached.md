<!-- SPDX-License-Identifier: EPL-2.0 -->

# Unreached branches of mission alg-force-disco (8b)

Stop condition 7: every branch of `src/alg/force/**` and `src/alg/disco/**` that no scenario, replay row or unit test reaches is
either provably dead from the Java (a `U` row below, with its Java line) or listed under "Neither reached nor proven dead".
Measured by T12 with `npx vitest run src/alg/force src/alg/disco test/melk/force-disco-options.test.ts --coverage` restricted to
the two bundles: 302 branches, 298 reached, the 4 not reached are rows 7, 8, 12 and 16 of the table.

## `U` rows

"Unit test" says whether a colocated test forces the arm (by calling the private member directly or forging an input) despite the
arm being dead through the public API.

| # | Task | Java file:line | Reason | Unit test |
|---|------|----------------|--------|-----------|
| 1 | T1 | recorder scope (FD1): an edge without a target; hierarchical `stops` rows | ELK JSON import rejects an edge without a target; the reflective drive is flat, so `hier` rows are `full` only. No code branch. | n/a |
| 2 | T1 | `F/stress/StressMajorization.java` `computeNewPosition` zero-distance arm | Left to replay-alone coverage; T12 coverage shows the branch reached (the stress directory is at 100 % branches). | yes (reached) |
| 3 | T2 | `alg.common` `PlanarGrid.weaklyIntersectsArea` inside `PolyominoCompactor` (FD1 packing-phase throw) | About 48,000 seeded `ext` graphs did not reach it (extensions lie inside their polyomino box; the grid is twice the sum of sizes). The landed `alg.common` rows reach it with hand-made triples. No row in this bundle. | no (lives in `alg.common`) |
| 4 | T6 | `F/graph/FBendpoint.java:53` (`"b_" + hashCode()` arm of `toString`) | The constructor dereferences the final `edge` at `:40`, so the `null` edge arm cannot be reached. Not ported (comment in `FBendpoint.ts`). | no (no TS branch) |
| 5 | T6 | `F/ComponentsProcessor.java` `split`, `separate == null` arm | `SEPARATE_CONNECTED_COMPONENTS` defaults to `true`; `getProperty` never returns null. Kept as `separate === null \|\| separate`. | no (operand never evaluated; no uncovered counter) |
| 6 | T6 | `F/ElkGraphImporter.java:134-135` `elemMap.get` null arms in `transformEdge` | A non-hierarchical edge's nodes share the parent whose children `transformNodes` mapped. | no |
| 7 | T8 | `F/ForceLayoutProvider.java:96` (`else` of `randomSeed != null`, `new Random(1)`) | `RANDOM_SEED` defaults to 1 and `getProperty` never returns null. Kept. `ForceLayoutProvider.ts:82-83`. | no |
| 8 | T8 | `F/model/AbstractForceModel.java:200` (`-2` arm of `uVector == vVector ? -2 : 2`) | `uVector` and `vVector` are two distinct objects, so reference equality is always false. `AbstractForceModel.ts:187`. | no |
| 9 | T8 | `F/model/AbstractForceModel.java:189-196` (`triedForBendPoints = true`) | Dead write (issue #69); no branch. | n/a |
| 10 | T9 | `D/DisCoLayoutProvider.java:78-79` (`default` arm and its `System.out.println`) | `CompactionStrategy` has one value. | yes (forged strategy) |
| 11 | T9 | `D/transform/ElkGraphTransformer.java:294` (`IllegalArgumentException` for a shape that is no node, label or port) | Unreachable by type. | yes (fake shape, `ElkGraphTransformer.test.ts`) |
| 12 | T9 | `D/transform/ElkGraphTransformer.java:737` (`JUNCTION_POINTS != null` false arm) | The default is a non-null empty chain; `setProperty(.., null)` removes the entry and the default is read back. `OffsetApplier.ts:40`. | no |
| 13 | T9 | `D/DisCoPolyominoCompactor.java:187` (`denominator == 0.0`) | Through `compact`, `denominator = 2 * (upperBound * numOfComps - 1.0)` with `100 * n - 1 == 0` has no integer solution. | yes (`computeCellSize` called with upperBound 1 and one component) |
| 14 | T9 | `D/transform/ElkGraphComponentsProcessor.java:211` (`adjacentNodes != null` false arm) | Every child of the layout node has an incidence entry. | yes (`dfs` called on a node without an entry) |
| 15 | T10 | `F/stress/StressMajorization.java:261` (final `else` throw of `getOther`) | `connectedEdges.get(u)` holds only edges incident to `u`. | yes (message pinned) |
| 16 | T12 | `D/transform/ElkGraphTransformer.java:499-500` (`componentEdge == null` false arm of `importElkEdges`) | An edge reaches `elementMapping` only through `importElkEdge` (same hierarchy level) or `importExtension` (`:434`). `getSourceNode`/`getTargetNode` require a simple edge (one source, one target; `ElkGraphUtil.getSourceNode` throws otherwise, and `ElkGraphComponentsProcessor.computeIncidences` calls them on every incident edge first), so an edge touches at most one node of the layout level, except a same-level edge, whose two nodes are joined by `computeIncidences` (`:99-120`, `:145-150`) into one component. `edgeSet` is a hash set per component, so an edge is visited once. `ElkGraphTransformer.ts:423` (implicit else of `componentEdge === undefined`). | no |

Rows 7, 8, 12 and 16 are the four branches the coverage run reports as not reached; every other row is either reached through a
unit test, has no TypeScript branch, or concerns a recorder item.

## Neither reached nor proven dead

None. After T12 the four unreached branches (`ForceLayoutProvider.ts:82`, `AbstractForceModel.ts:187`, `OffsetApplier.ts:40`,
`ElkGraphTransformer.ts:423`) are rows 7, 8, 12 and 16 above. Row 16's argument is a reading of the Java, not a vector: the
orchestrator may want a second look.
