<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-node-placement (mission 7d)

## Recording a pipeline row at the P4 stop (T1)

```plantuml
@startuml
participant "layered-placement-vectors.sh" as SH
participant "LayeredPlacementVectors.java" as REC
participant "ElkLayered (oracle)" as EL
participant "layered-placement.json" as REF
SH -> REC : classpath, -XX:hashCode=2, outDir
REC -> REC : load model, pick target level, set options\n(SEPARATE_CONNECTED_COMPONENTS=false, strategy, BK or flexibility variant)
REC -> EL : importGraph(target) → LGraph
REC -> EL : prepareLayoutTest(lgraph)
REC -> EL : runLayoutTestStep up to the P4 class or the processor stop
EL --> REC : processors that ran (getLayoutTestConfiguration)
REC -> REC : refuse if a prefix member is outside 7b+7c+7d (N1)
REC -> REC : expected = layers, layerless, hidden, edges, ports, changed\n+ geometry (nodes, layers; ports and labels per N3)
REC -> REF : one compact row (id, input, target, options, prefix, expected)
REC -> REC : re-run from scratch, build twice, strict parse, ≤ 5 MB
@enduml
```

## Replaying a row in TypeScript (T3, T8)

```plantuml
@startuml
participant "LayeredPlacementVectors.test.ts" as T
participant "layered-placement-replay-rows.ts" as ROWS
participant "layered-placement-replay-ops.ts" as OPS
participant "NodePlacementStrategy /\nIntermediateProcessorStrategy" as F
participant "layered-placement-replay-dump.ts" as DUMP
participant "layered-placement-replay-compare.ts" as CMP
T -> ROWS : loadPlacementRows(file)
ROWS --> T : rows with geometry
T -> OPS : runPlacementPrefix(row, factories) | runSteps(row, factories)
OPS -> F : createProcessor(name) / createPhase("P4_NODE_PLACEMENT", strategy)
F --> OPS : instance.process(lgraph, monitor)
OPS --> T : LGraph after the stop
T -> DUMP : placementDump(graph, importDump)
DUMP --> T : actual (orders + geometry)
T -> CMP : comparePlacement(actual, expected)
CMP --> T : [] or diffs (orders exact, coordinates within 1e-6)
@enduml
```

## The 7d processors around phase 4 (default pipeline)

```plantuml
@startuml
title Where the 7d processors sit (IntermediateProcessorStrategy order)
state "P3 crossing minimization (7c)" as P3
state "greedy switch (7c)" as GS
state "IN_LAYER_CONSTRAINT_PROCESSOR" as ILC
state "LABEL_AND_NODE_SIZE_PROCESSOR" as LNS
state "INNERMOST_NODE_MARGIN_CALCULATOR" as INM
state "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR" as HPD
state "P4 node placement (7d)" as P4
state "NODE_PLACEMENT_REPEATER" as NPR
state "LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR (7e)" as LSG
[*] --> P3
P3 --> GS : when active
GS --> ILC
P3 --> ILC : otherwise
ILC --> LNS
LNS --> INM
INM --> HPD : external ports
INM --> P4 : otherwise
HPD --> P4
P4 --> NPR : flexibility + recompute
P4 --> LSG : otherwise
NPR --> LSG
LSG --> [*]
@enduml
```
