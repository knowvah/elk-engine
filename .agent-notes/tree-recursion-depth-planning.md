<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recursion-depth: planning observations (issue #67)

## Observation: the T19 depth probe was never kept

- **Context**: looking for the harness behind issue #67's table.
- **Finding**: no committed or journaled probe script exists. `plans/alg-trees/decision-journal.md:85` records only the
  results, and nothing under `tools/` or `test/` builds a deep caterpillar for the tree algorithms.
- **Impact**: the mission rebuilds the probe (D6) and journals its text verbatim, so #70 and #76 can reuse it.
- **Confidence**: High

## Observation: the trees have about 30 self-recursive methods

- **Context**: a scan for methods that call themselves in `src/alg/{mrtree,radial,vertiflex}`.
- **Finding**: there are more than TR7's list: `RadialUtil.getNumberOfLeaves` and `findRootOfNode`, the radial sorters, the
  vertiflex `NodeYPlacer`, `AbsoluteXPlacer` and `checkVerticalConstraintValidity` recursions, and mrtree's `TreeUtil`,
  `FanProcessor`, `NodeOrderer` and `OrderBalance` recursions ([sites.md](../plans/tree-recursion-depth/sites.md)). The
  repo's TypeScript is a native build with no JS compiler API (`require('typescript').ScriptTarget` is undefined), so a
  scan has to use text, ast-grep or Serena.
- **Impact**: converting the issue's named candidates may not be enough to reach the oracle's depth. The mission converts in
  probe order (D2).
- **Confidence**: Medium (a text scan; multi-line signatures can be missed, as `EadesRadial.positionNodes` was)

## Observation: #66 carried `queue:ready` after landing

- **Context**: resolving `next` for the queue.
- **Finding**: #66 was labelled `queue:on-branch` and also `queue:ready`. The ready label was re-added at 2026-11-23T21:48Z,
  after planning had swapped it for `queue:planned`.
- **Impact**: a planner that takes the lowest `queue:ready` number would plan #66 again. This one skipped it because of
  `queue:on-branch`.
- **Confidence**: High
