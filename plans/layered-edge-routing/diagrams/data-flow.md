<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-edge-routing (mission 7e)

## Recording a pipeline row at a P5 stop (T1)

```plantuml
@startuml
participant "layered-routing-vectors.sh" as SH
participant "LayeredRoutingVectors.java" as REC
participant "ElkLayered (oracle)" as EL
participant "layered-routing.json" as REF
SH -> REC : classpath, -XX:hashCode=2, outDir
REC -> REC : load model, pick target level, set options\n(SEPARATE_CONNECTED_COMPONENTS=false, edgeRouting, variant)
REC -> EL : importGraph(target) → LGraph
REC -> EL : prepareLayoutTest(lgraph)
REC -> EL : runLayoutTestStep up to the P5 router or the processor stop
EL --> REC : processors that ran (getLayoutTestConfiguration)
REC -> REC : refuse if a prefix member is outside 7b+7c+7d+7e (R1)
REC -> REC : expected = layers, layerless, hidden, edges, ports, changed\n+ geometry (nodes, layers, graph, edges[bendPoints, junctionPoints];\n splines on P5 SPLINES stops; ports per N3)
REC -> REF : one compact row (id, input, target, options, prefix, expected)
REC -> REC : re-run from scratch, build twice, strict parse, ≤ 5 MiB per file
@enduml
```

## Replaying a row through the port (T10, T14)

```plantuml
@startuml
participant "LayeredRoutingVectors.test.ts" as T
participant "layered-routing-replay-*.ts (T3)" as H
participant "EdgeRouterFactory / enums" as F
participant "P5 router + processors (T4–T9)" as R
T -> H : loadRoutingRows(both refs)
T -> H : runRoutingPrefix(row, factories) | runSteps | runCall
H -> F : createPhase('P5_EDGE_ROUTING', r) / createProcessor(name)
F -> R : new OrthogonalEdgeRouter() | PolylineEdgeRouter | SplineEdgeRouter\nnew HyperedgeDummyMerger() … FinalSplineBendpointsCalculator()
R --> H : LGraph after the stop
H -> H : routingDump(graph, importDump)
H -> T : compareRouting(actual, expected) → [] (1e-6 coordinates, exact orders)
@enduml
```

## A `calls` row (T1, T3, T6, T7)

```plantuml
@startuml
participant "LayeredRoutingVectors.java" as REC
participant "NubsSelfLoop / NubSpline / SplinesMath / Rectangle (oracle)" as J
participant "layered-routing-steps.json" as REF
participant "runCall (T3)" as RC
participant "TS twins (T6, T7)" as TS
REC -> REC : importGraph(inline elk)
REC -> J : <Class>.<method>(port paths → LPorts, doubles, enums)
J --> REC : result (double | boolean | KVector | Rectangle | NubSpline)
REC -> REF : row: steps [importGraph, call …], expected.result { type, value }
RC -> TS : same method, same decoded args
TS --> RC : result → summarise → CallResult
RC -> RC : compareCall(actual, expected) → []
@enduml
```

## A sweep case (T12)

```plantuml
@startuml
participant "routing-sweep.sh" as SH
participant "LayeredRoutingVectors.java --sweep" as REC
participant "results.jsonl" as OUT
participant "routing-sweep.test.ts" as T
SH -> REC : every ptolemy level, stops P4/BK, P5/ORTHOGONAL, P5/POLYLINE, FINAL/SPLINES
REC -> OUT : ok (sha256 of the canonical routing dump, prefix, options) | refused | throws | timeout
T -> T : replay each ok case through the real factories, hash, compare (stride 2)
@enduml
```
