<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-recursion-depth: planning observations (issue #76)

## Observation: spore's debug walks run without debug mode, one does not

- **Context**: choosing the sites for #76.
- **Finding**: `DepthFirstCompaction.debugOut` and `GrowTreePhase.debugOut` call their `drawTree` on every step whatever the
  options (an `SVGImage` with a null file still records elements), so both walks bound real layouts. Only
  `ShrinkTreeCompactionPhase.draw` is gated, by `DEBUG_SVG`, which `ElkGraphImporter.ts:209` sets from
  `org.eclipse.elk.debugMode`. So it is reachable from user input, but in debug mode the JVM writes one SVG file per step.
- **Impact**: a "debug-only" label on a spore walk needs the call site checked; the brief keeps only the gated `draw` verbatim.
- **Confidence**: High

## Observation: spore's tree depth cannot be set directly

- **Context**: choosing probe shapes, where #67 and #70 used a path and a caterpillar.
- **Finding**: spore builds its tree from node centres (Delaunay, then a minimum or maximum spanning tree), so the input has no
  edges and the shape follows from geometry. The recorder's chain (`SporeLayoutVectors.java:1870-1877`, centres on one line)
  gives a path, the deepest tree for `n` nodes.
- **Impact**: whole-pipeline depth probes for spore use the chain; other tree shapes are covered at method level by
  `test/helpers/spore-tree-fixtures.ts`.
- **Confidence**: High

## Observation: the compaction chain's cost makes time, not the stack, a likely bar

- **Context**: sizing the oracle grid.
- **Finding**: the 2,000-node compaction chain takes the oracle about 27 s and the port 72 s on a raised stack
  (`plans/alg-packing/decision-journal.md:51, 59`). If the growth is cubic, 8,000 takes about 29 min in the oracle and 77 min
  in the port per run, and 16,000 about 4 h and 10 h.
- **Impact**: the brief fits the exponent at 2,000 and 4,000 before choosing depths and caps a port run at 90 minutes.
- **Confidence**: Medium (the cubic growth is from PK6's description; T1 measures it)
