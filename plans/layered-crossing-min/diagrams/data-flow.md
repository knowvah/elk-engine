<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-crossing-min (mission 7c)

## Recording a pipeline row at the P3 stop (T1)

```plantuml
@startuml
participant "layered-order-vectors.sh" as SH
participant "LayeredOrderVectors.java" as REC
participant "ElkLayered (oracle)" as EL
participant "layered-order.json" as REF
SH -> REC : classpath, -XX:hashCode=2, outDir
REC -> REC : load model, pick target level, set options\n(SEPARATE_CONNECTED_COMPONENTS=false, strategy, variants)
REC -> EL : importGraph(target) → LGraph
REC -> EL : prepareLayoutTest(lgraph)
REC -> EL : runLayoutTestUntil(stop class, true, state)
EL --> REC : processors that ran (getLayoutTestConfiguration)
REC -> REC : refuse if a prefix member is outside 7b+7c (C2)
REC -> REC : expected = layers, layerless, hidden, edges, changed, ports
REC -> REF : one compact row (id, input, target, options, prefix, expected)
REC -> REC : re-run from scratch, build twice, strict parse, ≤ 5 MB
@enduml
```

## Replaying a row by name (T3, T8)

```plantuml
@startuml
participant "LayeredOrderVectors.test.ts" as T
participant "layered-order-replay-*.ts (7c)" as H7c
participant "layered-phase-replay-*.ts (7b)" as H7b
participant "IntermediateProcessorStrategy /\nCrossingMinimizationStrategy" as E
participant "7c classes" as C
T -> H7c : loadOrderRows(file)
T -> H7b : importRow(row) (options on the imported target), normalise
loop prefix entry or step
  T -> E : valueOf(name).create() / createPhase(P3_NODE_ORDERING, S)
  E -> C : new <Class>() (lazy configurations)
  T -> C : process(graph, monitor)
end
T -> H7c : orderDump(graph, importDump) → expected + ports
T -> H7c : compareOrder(actual, row.expected) → []
@enduml
```

## The breadth sweep (T10)

```plantuml
@startuml
participant "order-sweep.sh" as SH
participant "LayeredOrderVectors.java --sweep" as REC
database "test/corpus/.order-sweep/results.jsonl" as RES
participant "order-sweep.test.ts" as TS
SH -> REC : every ptolemy model, every level, every P3 strategy (20 s per case)
REC -> RES : {id, model, target, prefix, options, sha256} | refused | throws | timeout
TS -> RES : read; stride sampling
TS -> TS : replay prefix through the real factories, canonical hash (7b form + ports)
TS -> TS : assert equal; count refused/timeout; throws must throw the same class
@enduml
```
