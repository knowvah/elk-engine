<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — layered-edge-routing (mission 7e, 2026-11-03)

## Observation: `NubsSelfLoop` has no caller at the pinned commit

- **Context**: Phase 1 scan of `p5edges/splines` references.
- **Finding**: `grep -rl NubsSelfLoop` over `alg.layered` finds only the class itself; the self-loop spline routing
  of this commit lives in `intermediate/loops/routing` (7g) and does not use it.
- **Impact**: it is proven by direct-call rows (R12), not by a pipeline stop; 7g must not expect a caller either.
- **Confidence**: High

## Observation: `OrthogonalEdgeRouter.process` accumulates layer x positions in a Java `float`

- **Context**: reading `OrthogonalEdgeRouter.java:217-297` for the P5 stop geometry.
- **Finding**: `float xpos = 0.0f` receives `double` layer widths and spacings (`xpos += …`), so every step rounds to
  float32; `layeredGraph.getSize().x = xpos` widens back. Node x positions set by `placeNodesHorizontally(leftLayer,
xpos)` carry the float-rounded value.
- **Impact**: a port that keeps `xpos` as a double diverges beyond 1e-6 on wide graphs; `Float32.add` is required (R6).
- **Confidence**: High

## Observation: the spline router runs `NORTH_SOUTH_PORT_POSTPROCESSOR` before P5, the others after

- **Context**: comparing the three routers' `LayoutProcessorConfiguration`s.
- **Finding**: `SplineEdgeRouter.java:108-111` uses `addBefore(P5_EDGE_ROUTING, NORTH_SOUTH_PORT_POSTPROCESSOR)`;
  `OrthogonalEdgeRouter`/`PolylineEdgeRouter` use `addAfter`. The processor's spline branch (`:241-259`) writes
  `SPLINE_NS_PORT_Y_COORD` on the origin port for the router to read.
- **Impact**: a P5 SPLINES stop on a north/south-port graph needs the postprocessor in the prefix; the recorder's
  stop plan differs per routing.
- **Confidence**: High

## Observation: `FinalSplineBendpointsCalculator` picks the "first" edge of a `HashSet`

- **Context**: AD-10 audit of the spline tail.
- **Finding**: `FinalSplineBendpointsCalculator.java:185` adds a halfway control point to
  `segment.edges.iterator().next()`; `SplineSegment.edges` is a `HashSet<LEdge>` filled from a
  `HashSet<Pair<SideToProcess, LEdge>>` (`SplineEdgeRouter.java:588-646`) whose `Pair.hashCode` mixes two identity
  hashes.
- **Impact**: the JVM order is not derivable from insertion order; the hyperedge spline rows decide whether insertion
  order matches (R9, stop 17).
- **Confidence**: High (mechanism), Medium (whether it diverges in practice)

## Observation: the shell `grep` on this machine is ugrep

- **Context**: scanning Java with `grep -E` backreferences and bracketed escapes.
- **Finding**: `grep` resolves to ugrep, which rejects `\1` in `-E` patterns and `\[` inside bracket expressions;
  `/usr/bin/grep` behaves as BSD grep.
- **Impact**: scripts that must run on this machine use `/usr/bin/grep` or avoid those constructs.
- **Confidence**: High

## Observation: the autonomous toggle stayed on after mission 7d

- **Context**: Phase 1 environment check.
- **Finding**: `.claude/settings.json` was byte-identical to `settings.autonomous.json` and `.claude/mission-active`
  existed at the start of planning (2026-11-03); editing the settings files from the session is refused by the
  auto-mode classifier (self-modification).
- **Impact**: the user runs the toggle; invoke new scripts as `bash tools/oracle/<script>` (allowed by the existing
  `Bash(bash tools/oracle/*:*)` rule) unless the user adds the two direct patterns.
- **Confidence**: High
