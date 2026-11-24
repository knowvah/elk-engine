<!-- SPDX-License-Identifier: EPL-2.0 -->

# Recursion sites: lead list and outcomes (issue #67)

Planning inventory of self-recursive methods in `src/alg/{mrtree,radial,vertiflex}` (a scan for a method that calls itself,
plus `EadesRadial.positionNodes`, which the scan missed). It is a **lead list** (D2): a site is converted only when a probe
overflows in it. `First` marks the issue's first TS overflow site. Fill the outcome column as tracks report:
`converted` (commit, test file), `not needed` (the bundle met D1 without it), `follow-up` (listed in the close-out issue).
Rows the scan found that do not recurse on input depth (metadata `apply`, `compare`, `toString`, `substring`, debug printing)
are left out.

## mrtree (T2)

| Site (TS) | Recursion | Note | Outcome |
| --------- | --------- | ---- | ------- |
| `p1treeify/DFSTreeifyer.ts:106-126` `dfs` | depth-first over out-edges | **First** for path (3,000-3,500) | converted (`af912601`, `p1treeify/DFSTreeifyer.explicit-stack.test.ts`); named by the scaled probe, not first as the issue said |
| `p3place/NodePlacer.ts:296-322` `secondWalk` | first child, then right sibling | **First** for caterpillar (2,500-3,000) | converted (`af912601`, `p3place/NodePlacer.explicit-stack.test.ts`); first for the caterpillar (3,000) |
| `p3place/NodePlacer.ts:121-160` `firstWalk` | children, then `apportion` | leads to `apportion` per node | converted (`af912601`, `p3place/NodePlacer.explicit-stack.test.ts`) |
| `ComponentsProcessor.ts:106-128` `dfs` | two call sites (source, target) | | converted (`af912601`, `ComponentsProcessor.explicit-stack.test.ts`) |
| `intermediate/LevelProcessor.ts:62` `setLevel` | per child | | converted to a loop (`af912601`, `intermediate/LevelProcessor.explicit-stack.test.ts`); first for the path (3,500) |
| `intermediate/NeighborsProcessor.ts:92` `setNeighbors` | per level | level recursion: depth = levels | converted to a loop (`af912601`, `intermediate/NeighborsProcessor.explicit-stack.test.ts`) |
| `intermediate/LevelHeightProcessor.ts:61-103` `setNeighbors` | per level | level recursion | converted to a loop (`af912601`, `intermediate/LevelHeightProcessor.explicit-stack.test.ts`) |
| `intermediate/FanProcessor.ts:102` `calculateFan` | per child | | converted to a loop (`af912601`, `intermediate/FanProcessor.explicit-stack.test.ts`); the recursion also held one `locFanMap` per level |
| `p2order/NodeOrderer.ts:131` `orderLevelFanDescendants`, `:235` `orderLevelConstraint` | per level | | follow-up (#166): no probe named it |
| `p2order/OrderBalance.ts:147` `orderLevel` | per level | | follow-up (#166): no probe named it |
| `TreeUtil.ts:83` `depth`, `:115` `rootDistance`, `:161` `getSubtree`, `:462, 477` `getLeftMost` | per level or child | `getLeftMost` has two call sites | follow-up (#166): no probe named them |
| `p4route/EdgeRouter.ts:100` `middleToMiddleEdgeRoute` | check: may be bounded | | follow-up (#166): no probe named it |

## radial (T3)

| Site (TS) | Recursion | Note | Outcome |
| --------- | --------- | ---- | ------- |
| `p1position/wedge/AnnulusWedgeByNodeSpace.ts:15-26` `calculateWedgeSpace` | per successor, summed | **First** for path (2,500-3,000); sum order matters | converted (`dae79ea3`, depth check `511341e1`, `p1position/wedge/AnnulusWedgeByNodeSpace.explicit-stack.test.ts`); first for both shapes (path 3,000, caterpillar 5,000) |
| `p1position/EadesRadial.ts:67-99` `positionNodes` | per child | named by the issue | converted (`dae79ea3`, `511341e1`, `p1position/EadesRadial.explicit-stack.test.ts`) |
| `RadialUtil.ts:108-119` `getNumberOfLeaves` | per successor, summed | called per node by `positionNodes` | follow-up (#166): only `AnnulusWedgeByLeafs` calls it (`wedgeCriteria` `LEAF_NUMBER`) |
| `RadialUtil.ts:93-100` `findRootOfNode` | parent chain | | follow-up (#166): only `PolarCoordinateSorter.sort` without an id sorter calls it (`sorter` `POLAR_COORDINATE`) |
| `RadialUtil.ts:178` `findLargestNodeInGraph` | check: hierarchy depth, not tree depth | | not needed: recurses over the hierarchy (children), depth 1 for a flat graph |
| `p2routing/StraightLineEdgeRouter.ts:39` `routeEdges` | per child | | converted (`dae79ea3`, `511341e1`, `p2routing/StraightLineEdgeRouter.explicit-stack.test.ts`) |
| `sorting/PolarCoordinateSorter.ts:74` `setIDForNodes`, `:85` `sort`; `sorting/IDSorter.ts:25` `sort` | per level | sorter option | follow-up (#166) for `setIDForNodes` (`sorter` `POLAR_COORDINATE`); the two `sort` methods call `Array.sort`, they do not recurse |
| `intermediate/overlaps/RadiusExtensionOverlapRemoval.ts:71` `extend` | per level | option-gated (overlap removal) | converted to a loop (`dae79ea3`, `511341e1`, `intermediate/overlaps/RadiusExtensionOverlapRemoval.explicit-stack.test.ts`); not option-gated: `RadialLayoutProvider.java:89` always adds the processor |
| `intermediate/compaction/RadialCompaction.ts:63` `contract` | per level | option-gated (compactor) | follow-up (#166): `compactor` other than `NONE` |
| `intermediate/rotation/AngleRotation.ts:28` `rotate` | check | option-gated (rotation) | not needed: it calls `KVector.rotate`, it does not recurse |

## vertiflex (T4)

| Site (TS) | Recursion | Note | Outcome |
| --------- | --------- | ---- | ------- |
| `p2relative/RelativeXPlacer.ts:77-118` `recursiveStraightlinePlacement` | per child, before the bundling | **First** for path (3,500-4,000) | converted (`0fc93546`, depth check `511341e1`, `p2relative/RelativeXPlacer.explicit-stack.test.ts`) |
| `p2relative/RelativeXPlacer.ts:126-159` `recursiveBentlinePlacement` | same shape | option-gated (`layoutStrategy` `BEND`) | follow-up (#166): `layoutStrategy` `BEND` |
| `p1yplacement/NodeYPlacer.ts:55` `setYLevels` | per child | | converted (`0fc93546`, `511341e1`, `p1yplacement/NodeYPlacer.explicit-stack.test.ts`) |
| `p3absolute/AbsoluteXPlacer.ts:41` `findMinimalX`, `:55` `absoluteTreeCoords` | per child | | converted, both (`0fc93546`, `511341e1`, `p3absolute/AbsoluteXPlacer.explicit-stack.test.ts`) |
| `p4edgerouting/StraightEdgeRouter.ts:50` `routeEdges` | per child | | converted (`0fc93546`, `511341e1`, `p4edgerouting/StraightEdgeRouter.explicit-stack.test.ts`) |
| `p4edgerouting/BendEdgeRouter.ts:63` `routeEdges` | per child | option-gated (`BEND`) | follow-up (#166): `layoutStrategy` `BEND` |
| `VertiFlexLayoutProvider.ts:160` `checkVerticalConstraintValidity` | per child | | converted (`0fc93546`, `511341e1`, `VertiFlexLayoutProvider.explicit-stack.test.ts`); first for both shapes (path 4,000, caterpillar 5,000), not `recursiveStraightlinePlacement` as the issue said |
