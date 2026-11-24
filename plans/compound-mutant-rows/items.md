<!-- SPDX-License-Identifier: EPL-2.0 -->

# compound-mutant-rows: items

The authoritative list of what issue #60 asks for. Every graph has root options `elk.direction=RIGHT` and
`hierarchyHandling=INCLUDE_CHILDREN`, nodes 30 by 30 and ports 4 by 4, unless the row says otherwise. "Sc4" is
`SITE_3` of `tools/vectors/LayeredCompoundVectors.java` (`sites/CompoundGraphPreprocessor/deepOutMerged`).

The 7h mutant table (`$TMPDIR/7h/T15/mutants.md`) is gone. T1 rebuilds each mutant at the arm its graph targets and
fills the **Mutant** column with the exact one-token change, marked *reconstructed*. T5 fills **Outcome** (D6).

| Item | Mutants (7h ids) | Target arm (TS, at planning `e30d1c5c`) | Row id(s), proposed | Shape | Group | Mutant | Outcome |
| ---- | ---------------- | --------------------------------------- | ------------------- | ----- | ----- | ------ | ------- |
| I1 | G18 | `CompoundGraphPreprocessorDummies.ts:162-175`, the merge arm of `introduceHierarchicalEdgeSegment` (incoming side) | `sites/CompoundGraphPreprocessor/mergeInDeep` | `c{d{x}}`, `x` owns port `xp` (WEST); edges `a1->xp`, `a2->xp` from two nodes outside `c` (mirror of Sc4) | sites run | G18d (*reconstructed*, see below) | 1 recorded: `sites/CompoundGraphPreprocessor/mergeInDeep`; G18d killed (journal T2, mutants row) |
| I2 | D10 | same function, `!mergeExternalPorts` operand (`:162`) | `sites/CompoundGraphPreprocessor/mergeOffOut` | Sc4 (`xp` EAST, edges to `b1`, `b2`) with `mergeHierarchyEdges=false` on `c` and `d` | sites run | D10 (*reconstructed*, see below) | 1 recorded: `…/mergeOffOut`; D10 killed (T2) |
| I3 | D15 | the thickness merge, `:169-174` | `models/<inline id>/0--CompoundGraphPreprocessor/thickness` (D3) | Sc4 with `elk.edge.thickness` 1 on `e1` and 3 on `e2` | models, stop 0 | D15a, D15b (*reconstructed*, see below) | 1 recorded, as a `sites` row: `sites/CompoundGraphPreprocessor/mergedThickness`; D15a, D15b killed (T3). The `models` form is withheld (stop 4, #165) |
| I4 | D14 | the `parentEndPort` arms, `:152-157` | `sites/CompoundGraphPreprocessor/{outThenParent,parentThenOut,inThenParent,parentThenIn}` | `c{d{x[xp]}}`, port `cp` (EAST) or `cq` (WEST) on `c`; `xp` has one edge to `cp` (or from `cq`) and one to `b` (or from `a`) outside `c` | sites run | D14a (D14b, D14c equivalent) (*reconstructed*, see below) | 1 recorded: `…/outThenParent`, `parentThenOut`, `inThenParent`, `parentThenIn`; D14a killed (T2). D14b, D14c: equivalent |
| I5 | D32, D33, D36, D39, D40, D44 | `calculateNetFlow` and its two vote helpers, `:273-340` | `sites/CompoundGraphPreprocessor/{flowInside,flowPlain,flowYoInactive,flowInsideRev,flowPlainRev}` | `c{x}`, FREE port constraints, ports `p1`, `p2` without a side; inside edges `p1->x`, `x->p1`, `x->p2`, `p2->x`; one self loop of `c`: `p1->p2` with `insideSelfLoops.yo=true` and `insideSelfLoops.activate=true` on `c` (`flowInside`), without `yo` (`flowPlain`), with `yo` but no `activate` (`flowYoInactive`), and `p2->p1` (`flowInsideRev`, `flowPlainRev`) | sites run | F1, F7-F10, F12, F16-F19, F21 (F11, F20 equivalent) (*reconstructed*, see below) | 1 recorded: `…/flowInside`, `flowPlain`, `flowYoInactive`, `flowInsideRev`, `flowPlainRev`; F1, F7-F10, F12, F16-F19, F21 killed (T2). F11, F20: equivalent |
| I6 | R29, R30, R34-R38 | `HierarchicalNodeResizingProcessor.ts:163` (the call) and `:184-186` (`moveExternalPorts`) | `models/<inline id>/<n>-<c's level path>-HierarchicalNodeResizingProcessor/resizerTopLevelChild` (D3) | root **without** `INCLUDE_CHILDREN`, one compound node `c` with `hierarchyHandling=INCLUDE_CHILDREN`, `nodeSize.constraints=[MINIMUM_SIZE, PORTS]`, `nodeSize.minimum=(300, 250)`, `portConstraints=FIXED_SIDE`, ports `c.e` (EAST) and `c.s` (SOUTH), children `x`, `y`, edges `x->y`, `y->c.e`, `y->c.s` | models, resizer stop on `c`'s graph | R29, R30, R29c, R34, R36, R38 (*reconstructed*, see below) | 1 recorded, as `sites` rows: `sites/HierarchicalNodeResizingProcessor/resizerTopLevelChild`, `resizerTopLevelWidth`, `resizerTopLevelHeight`; R29, R30, R29c, R34, R36, R38 killed by the row suites (T3; at base only the class test killed them). The `models` form is withheld (stop 4, #165) |
| I7 | K9 | `ElkLayered.ts:166`, `monitor.begin('Recursive hierarchical layout', work)` | `sites/ElkLayered/recursiveWork` (D4) | Sc4, or any landed `sites` graph with two levels | sites, new mode `worked` (D4) | K9a, K9b (*reconstructed*, see below) | 1 recorded: `sites/ElkLayered/recursiveWork` (mode `worked`); K9a, K9b killed (T4) |
| I8 | R1, R4, R5, R8, R10-R12 | `HierarchicalNodeResizingProcessor.ts:55-65` (`graphLayoutToNode`, probably a size x/y swap at `:61`) | none expected (D7) | a non-square external port (for example 4 by 10), only if T1 finds a survivor | sites run, conditional | R8a, R8b (*reconstructed*, see below) | 1 recorded: `sites/HierarchicalNodeResizingProcessor/nonSquarePort`; R8a, R8b killed by the row suites (T2; at base only the class test killed them, which D7 read literally would make outcome 5: journal T1, decision) |

Planning-time leads (TypeScript only, not the oracle): for I6 the EAST dummy's x and the SOUTH dummy's y at the resizer
stop are 288 and 238 with the call and 132 and 43 without it. The export is equal either way. For I4 the importer
orders the outside edge first whatever the JSON order, so all four graphs give the same segments; they differ in the
`parentEndPort` arm they take.

## Reconstructed mutants (T1, 2026-11-23)

Every mutant is one token, *reconstructed* at the arm its item names (the 7h table is gone, so the ids on the left are
this mission's, not 7h's). Lines are those of the base `e30d1c5c`. "Rows" is the three row suites
(`LayeredCompoundVectors`, `LayeredCompoundSites`, `LayeredCompoundTwins`); "class" is the class tests of the mutated
file. Base status is from `$TMPDIR/compound-mutant-rows/mutate.sh` (journal, T1).

`D` = `src/alg/layered/compound/CompoundGraphPreprocessorDummies.ts`, `G` = `…/CompoundGraphPreprocessorSegments.ts`,
`R` = `src/alg/layered/intermediate/HierarchicalNodeResizingProcessor.ts`, `K` = `src/alg/layered/ElkLayered.ts`.

| Item | Id | Site | Token change | Base: rows | Base: class | Issue graph differs in TS |
| ---- | -- | ---- | ------------ | ---------- | ----------- | ------------------------- |
| I1 | G18d | `G:298` | `newExternalPort !== currentExternalPort` → `true` | survived | survived | `mergeInDeep`: every stop, export |
| I2 | D10 | `D:163` | `!mergeExternalPorts` → `false` | survived | survived | `mergeOffOut`: every stop, export |
| I3 | D15a | `D:171` | `Math.max(` → `Math.min(` | survived | survived | `thickness`: stops 0-4, not the postprocessor stop, not the export |
| I3 | D15b | `D:173` | `origEdge.getProperty(` → `externalPort.newEdge.getProperty(` | survived | survived | as D15a |
| I4 | D14a | `D:163` | `parentEndPort !== null` → `false` | survived | survived | all four graphs: every stop, export |
| I4 | D14b | `D:154` | `portType === PortType.INPUT &&` → `true &&` | survived | survived | none (equivalent: an OUTPUT segment's edge never starts at the parent node) |
| I4 | D14c | `D:156` | `portType === PortType.OUTPUT &&` → `true &&` | survived | survived | none (equivalent: an INPUT segment's edge never ends at the parent node) |
| I5 | F1 | `D:275` | `node.getProperty(` → `!node.getProperty(` (`INSIDE_SELF_LOOPS_ACTIVATE`) | survived | survived | `flowInside`, `flowYoInactive`, `flowInsideRev` |
| I5 | F7 | `D:308` | `isSelfLoop && insideSelfLoopsEnabled` → `isSelfLoop && !insideSelfLoopsEnabled` | survived | survived | `flowInside`, `flowYoInactive`, `flowInsideRev` |
| I5 | F8 | `D:308` | `outgoingEdge.getProperty(` → `!outgoingEdge.getProperty(` (`YO`) | survived | survived | `flowInside`, `flowPlain`, `flowInsideRev`, `flowPlainRev` |
| I5 | F9 | `D:311` | `isSelfLoop && isInsideSelfLoop` → `isSelfLoop \|\| isInsideSelfLoop` | survived | survived | `flowPlain`, `flowYoInactive`, `flowPlainRev` |
| I5 | F10 | `D:312` | `return true` → `return false` | survived | survived | `flowInside`, `flowInsideRev` |
| I5 | F11 | `D:313` | `isSelfLoop && !isInsideSelfLoop` → `isSelfLoop && isInsideSelfLoop` | survived | survived | none (equivalent: a plain self loop falls through to `:315`, where a node is never the parent node of its own graph, so the vote is the same) |
| I5 | F12 | `D:314` | `return false` → `return true` | survived | survived | `flowPlain`, `flowYoInactive`, `flowPlainRev` |
| I5 | F16 | `D:329` | `isSelfLoop && insideSelfLoopsEnabled` → `isSelfLoop && !insideSelfLoopsEnabled` | survived | survived | `flowInside`, `flowYoInactive`, `flowInsideRev` |
| I5 | F17 | `D:329` | `incomingEdge.getProperty(` → `!incomingEdge.getProperty(` (`YO`) | survived | survived | `flowInside`, `flowPlain`, `flowInsideRev`, `flowPlainRev` |
| I5 | F18 | `D:332` | `isSelfLoop && isInsideSelfLoop` → `isSelfLoop \|\| isInsideSelfLoop` | survived | survived | `flowPlain`, `flowYoInactive`, `flowPlainRev` |
| I5 | F19 | `D:333` | `return true` → `return false` | survived | survived | `flowInside`, `flowInsideRev` |
| I5 | F20 | `D:334` | `isSelfLoop && !isInsideSelfLoop` → `isSelfLoop && isInsideSelfLoop` | survived | survived | none (equivalent, as F11 with `:336`) |
| I5 | F21 | `D:335` | `return false` → `return true` | survived | survived | `flowPlain`, `flowYoInactive`, `flowPlainRev` |
| I6 | R29 | `R:161` | `newSize.x > oldSize.x \|\|` → `newSize.x < oldSize.x \|\|` | survived | killed (1 test) | not the issue's graph (both axes grow); `resizerTopLevelAxes` (`cw`: width only): resizer and postprocessor stops of `cw` |
| I6 | R30 | `R:161` | `\|\| newSize.y > oldSize.y` → `\|\| newSize.y < oldSize.y` | survived | killed (1 test) | not the issue's graph; `resizerTopLevelAxes` (`ch`: height only): resizer and postprocessor stops of `ch` |
| I6 | R29c | `R:163` | `this.moveExternalPorts(lgraph, oldSize, newSize);` → `void 0;` | survived | killed (5 tests) | `resizerTopLevelChild`: stops 2 (resizer on `c`) and 3 (postprocessor on `c`), not the export |
| I6 | R34 | `R:180` | `=== NodeType.EXTERNAL_PORT` → `!== NodeType.EXTERNAL_PORT` | survived | killed (5 tests) | as R29c |
| I6 | R36 | `R:184` | `+= newSize.x` → `-= newSize.x` | survived | killed (3 tests) | as R29c |
| I6 | R38 | `R:186` | `+= newSize.y` → `-= newSize.y` | survived | killed (3 tests) | as R29c |
| I7 | K9a | `K:166` | `work);` → `work + 1);` | survived | survived | no graph (no recorded field) |
| I7 | K9b | `K:162` | `work +=` → `work -=` | survived | survived | no graph |
| I8 | R8a | `R:61` | `port.getSize().x, port.getSize().y` → `port.getSize().y, port.getSize().y` | survived | killed (1 test) | `nonSquarePort` (WEST 4 by 10 and NORTH 10 by 4): stops 2-4, export |
| I8 | R8b | `R:61` | `port.getSize().x, port.getSize().y` → `port.getSize().x, port.getSize().x` | survived | killed (1 test) | as R8a |

Rebuilt and dropped, because the landed rows kill them at base: the first guesses for G18 (`G:296` `currentExternalPort`
→ `null`, `G:303` negated, `G:298` `!==` → `===`, `G:284` without the descendant test, the twins of `G:298` at `G:255`,
`G:439`, `G:467`, and the two `includes` guards at `G:215`, `G:413`), the vote counters and the hierarchy tests of
`calculateNetFlow` (`D:283-298`, `D:315-318`, `D:336-339`), `R:62`, `R:63` (position x/y swaps), and `R:183`, `R:185`
(side tests of `moveExternalPorts`). Rebuilt and equivalent, as 7h found for G21 and G22: `newExternalPort.exported` →
`true` at `G:260`, `G:303`, `G:444`, `G:472` (survive at base; no graph of this issue tells them apart, because the
importer orders the outside edge before the edge to the parent's port).
