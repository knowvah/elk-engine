<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: spore-recursion-depth (issue #76, 2026-11)

## Observation: a cold oracle JVM overflows on the 2,000-node sporeCompaction chain

- **Context**: the harness smoke run, the recorder's chain (`SporeLayoutVectors.java:1870-1877`) through `tools/oracle/run.sh`.
- **Finding**: a JVM whose first case is the 2,000 compaction chain throws `StackOverflowError` after 0.5 s. A JVM that first
  runs 250, 500, ..., 1,750 (or 500, 1,000, 1,500) completes 2,000 in 25 to 29 s and goes on to 4,000. sporeOverlap completes
  2,000 cold. The warm limits: sporeOverlap 9,750 (10,000 throws, three ladders), sporeCompaction 4,000 (5,000 throws in one
  ladder; in the other it ran into a one-hour case limit without throwing in its first seconds).
- **Impact**: a spore depth ladder starts at 250 or 500, not at 2,000. Issue #76's "2,000 ok" for the compaction walks was a
  warmed JVM. Same cause as the first observations of `tree-recursion-depth.md` and `component-dfs-depth.md`.
- **Confidence**: High

## Observation: the compaction chain's cost changes regime at 3,200 nodes

- **Context**: sizing the compaction grid from timings at 2,000 and 4,000.
- **Finding**: the oracle takes 28 s at 2,000, 85 s at 3,000 (cubic) and 806 to 903 s at 4,000 (a factor 9 to 11 for a third
  more nodes). The chain's rectangles are 200 wide and 0.0625 apart, so the far ends stop touching at 3,200 nodes and
  `minUnderlapWithSubtree` takes its `r.distance` arm (`DepthFirstCompaction.java:163`). The port takes 102 s, 482 s and
  105 min at the same depths (3.7, 5.6 and about 7 times the oracle, on a loaded machine at `nice` 10).
- **Impact**: a cubic extrapolation from 2,000 underestimates 4,000 by a factor 4 to 5. A compaction probe above 3,000 costs
  hours per port run; time, not the stack, ends such a grid.
- **Confidence**: High for the timings; Medium for the arm as the cause (derived from the geometry, the arm counts were not
  measured)

## Observation: an explicit-stack loop can be slower than the recursion in a hot walk

- **Context**: the converted port took 591 s against 482 s on the 3,000 compaction chain.
- **Finding**: `minUnderlapWithSubtree` runs about n³/6 activations on a path. Its loop form costs 20 to 30 % more wall time
  than the recursion (1,000 nodes: 17 to 19 s against 13 to 15 s), with identical output. Putting only that method back to
  recursion removes the difference. Three other frame layouts (parallel arrays with a stack pointer, the top frame in locals
  with `push`/`pop`, the same with index stores) cost the same within noise. Under `--cpu-prof` the loop form was the faster
  one, so the profiler does not show it. PK6's "the two forms time equally" was for `compactTree`, which opens one frame per
  node, not n³/6.
- **Impact**: time a conversion on an input that makes the walk hot, without a profiler and alternating the two builds; issue
  #175 holds the numbers.
- **Confidence**: High

## Observation: the complexity write hook holds colocated test files to 500 lines

- **Context**: T2's new test blocks alone came to about 600 lines, beside a landed test file of 150.
- **Finding**: `hooks/check-complexity.py` skips `test/` directories, not `*.test.ts` files beside the source, so a write that
  takes a colocated test file past 500 lines is blocked.
- **Impact**: plan a second test file per class when a mission adds several twin blocks to one landed test file.
- **Confidence**: High (reported by the T2 subagent; the split files are 390 and 464 lines)

## Observation: an SVG document does not show the order of calls across groups

- **Context**: negative controls on the two `drawTree` proofs.
- **Finding**: `SVGImage` collects elements per group, so a mutant that draws a child's edge after the child's rectangle and
  circle produces the same document. Only a log of `g`/`addElementStr` calls (as the `GrowTreePhase.drawTree` test keeps)
  tells the two apart. A reversed child order fails both proofs.
- **Impact**: a twin test of a drawing walk compares the call log as well as the document if call order across groups is to
  be proven; an equal document is what the Java can observe.
- **Confidence**: High

## Observation: two foreground subagents run side by side in a headless session

- **Context**: the brief expected a headless session to run T2 and T3 one after another.
- **Finding**: two `Agent` calls with `run_in_background: false` in one message ran concurrently (10.6 and 5.6 minutes, both
  returned before the turn went on), while detached `nohup` runs continued.
- **Impact**: parallel tracks with disjoint write-sets do not need background agents.
- **Confidence**: High
