<!-- SPDX-License-Identifier: EPL-2.0 -->

# component-dfs-depth: planning observations (issue #70)

## Observation: landed queue issues keep `queue:ready`

- **Context**: resolving `next` for the queue on 2026-11-24.
- **Finding**: #66 and #67 are labelled both `queue:ready` and `queue:on-branch`. Taking the lowest `queue:ready` number
  without excluding `queue:on-branch` would plan a landed mission again.
- **Impact**: a planner must filter out `queue:on-branch` (the #67 planning note saw the same for #66).
- **Confidence**: High

## Observation: the #67 depth check is applied to a visited-mark search too

- **Context**: choosing whether the force and disco loops call `checkStackDepth`.
- **Finding**: `src/alg/mrtree/ComponentsProcessor.ts:204-207` calls `checkStackDepth` although its `dfs` stops on visited
  marks and cannot run without end. The test says so (`ComponentsProcessor.explicit-stack.test.ts:167`). #167 Q3 asks
  whether such loops should call it.
- **Impact**: D7 follows the landed call, so that one ruling on #167 covers every #67 and #70 site.
- **Confidence**: High

## Observation: the stress option for interactive mode is the core one

- **Context**: writing the T12 probe shape into T1.
- **Finding**: stress's `INTERACTIVE` is `CoreOptions.INTERACTIVE`, id `org.eclipse.elk.interactive`
  (`src/alg/force/options/StressOptions.ts:54, 207`), not `org.eclipse.elk.stress.interactive`. `iterationLimit` is
  `org.eclipse.elk.stress.iterationLimit`.
- **Impact**: a probe input with the stress-prefixed id would silently keep the default and run the full stress iteration.
- **Confidence**: High
