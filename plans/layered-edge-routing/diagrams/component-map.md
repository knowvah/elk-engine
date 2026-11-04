<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — layered-edge-routing (mission 7e)

```plantuml
@startuml
title 7e: components touched (new in 7e unless marked)
package "src/alg/layered" {
  package "intermediate" {
    component "IntermediateProcessorStrategy\n(enum; create() delegates, T2)" as IPS
    component "IntermediateProcessorStrategyCreate\n(the 9-link chain, T2; +6 arms T5/T9)" as IPC
    component "HyperedgeDummyMerger,\nHierarchicalPortPositionProcessor,\nLayerSizeAndGraphHeightCalculator,\nLongEdgeJoiner,\nNorthSouthPortPostprocessor (T5)" as PRE
    component "FinalSplineBendpointsCalculator (T9)" as FSB
  }
  package "p5edges" {
    component "EdgeRouterFactory (T10)" as ERF
    component "OrthogonalEdgeRouter (T4)" as OER
    component "PolylineEdgeRouter\n(predicate stub T2, completed T5)" as PER
    package "orthogonal (T4)" {
      component "OrthogonalRoutingGenerator,\nHyperEdgeSegment, …Dependency,\n…Splitter, HyperEdgeCycleDetector" as ORG
      component "direction: Base, N→S, S→N, W→E,\nRoutingDirection" as DIR
    }
    package "splines" {
      component "SplineSegment (unstaged),\nSplinesMath, Rectangle,\nSplineEdgeRouterDependency,\n…SideToProcess (T6)" as SEG
      component "NubSpline, NubsSelfLoop (T7)" as NUB
      component "SplineEdgeRouter (T8)" as SER
    }
  }
  package "graph, p1cycles–p4nodes (7a–7d)" as PREV
  component "DebugUtil (staged, 7f)" as DBG
  component "ElkLayered, GraphConfigurator\n(staged, 7f)" as EL
}
package "src/core" {
  component "EdgeRouting, KVectorChain,\nElkRectangle, Pair, Random shim" as CORE
}
IPS --> IPC : create()
IPC --> PRE : new
IPC --> FSB : new
ERF --> OER : create()
ERF --> PER : create()
ERF --> SER : create()
OER --> ORG : routeEdges
ORG --> DIR : forRoutingDirection
OER ..> PER : PRED_EXTERNAL_WEST_OR_EAST_PORT
SER ..> PER : PRED_EXTERNAL_WEST_OR_EAST_PORT
SER --> SEG : segments, dependencies
FSB --> SEG : SPLINE_ROUTE_START
FSB --> NUB : NubSpline(…).toBezier
NUB --> SEG : Rectangle outer box
ORG ..> DBG : guarded by isLoggingEnabled()
OER --> PREV : LGraph, LGraphUtil
EL ..> ERF : 7f wires P5 here
ORG --> CORE : Random (InternalProperties.RANDOM)
@enduml
```

Proof components (tests and tooling): `tools/vectors/LayeredRoutingVectors.java` + `.sh` (T1, T12, T13) write
`test/golden/refs/java/{layered-routing,layered-routing-steps}.json`; `test/helpers/layered-routing-replay-*.ts` (T3)
and `layered-routing-sweep.ts` (T12) replay them; `src/alg/layered/LayeredRoutingVectors.test.ts` (T10) is the
authority, the colocated tests (T4–T9, T14) the per-class proofs, `test/corpus/routing-sweep.test.ts` (T12) the breadth.
