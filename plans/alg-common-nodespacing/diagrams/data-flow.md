<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — mission 6b

## Evidence: record and replay (T1 → T7)

The recorder stores each prepared input graph as ELK JSON (NS1). The expectation comes from the re-imported graph, so
TS imports exactly the graph the oracle laid out.

```plantuml
@startuml
actor Orchestrator
participant "node-micro-layout-vectors.sh\n(T1)" as Sh
participant "vector-cache.sh" as Cache
participant "NodeMicroLayoutVectors.java\n(oracle classpath)" as Rec
database "elk-models + curated\n+ vendored tickets" as Models
database "node-micro-layout.json" as Vec
participant "NodeMicroLayoutVectors.test.ts\n(T7)" as TS

Orchestrator -> Sh : run (twice)
Sh -> Cache : lookup(salt, inputs digest)
alt cache miss
  Cache -> Rec : java NodeMicroLayoutVectors <out>
  Rec -> Models : load .elkt (SHA-256 checked)
  Rec -> Rec : configure group; NS4 label sizes
  Rec -> Rec : export input = ElkGraphJson(prepared)
  Rec -> Rec : re-import input; post-order NodeMicroLayout (NS3)
  Rec -> Rec : also run on prepared original;\nfail row on any difference
  Rec -> Vec : rows {input, expected | throws}
else cache hit
  Cache -> Vec : copy cached output
end
Orchestrator -> Orchestrator : cmp run 1 vs run 2 (byte-identical)
TS -> Vec : read rows
TS -> TS : ElkGraphJson.forGraph(input).toElk()
TS -> TS : post-order NodeMicroLayout.forGraph(node).execute()
TS -> TS : compare nodes/ports/labels\n(1e-6 numbers, exact ids, counts, throws)
@enduml
```

## Runtime: one `NodeMicroLayout.execute()` (J/NodeMicroLayout.java:60-64)

```plantuml
@startuml
participant "NodeMicroLayout" as NML
participant "NodeDimensionCalculation" as NDC
participant "NodeLabelAndSizeCalculator" as NLS
participant "NodeContext /\nPortContextCreator" as Ctx
participant "cell creators +\nCellSystemConfigurator" as Cells
participant "port placement\nsize calculators" as PSize
participant "NodeSizeCalculator" as NSize
participant "PortPlacementCalculator /\nPortLabelPlacementCalculator" as Place
participant "LabelPlacer" as LP
participant "NodeMarginCalculator" as NMC

NML -> NDC : sortPortLists(adapter)
NML -> NDC : calculateLabelAndNodeSizes(adapter)
NDC -> NLS : process(graph)
loop each node of the level
  NLS -> Ctx : new NodeContext; createPortContexts
  NLS -> Cells : create inside port label + node label cells; configure
  NLS -> PSize : horizontal / vertical port placement size
  NLS -> NSize : setNodeWidth / setNodeHeight
  NLS -> Place : place ports and port labels
  NLS -> LP : placeLabels
  NLS -> Ctx : applyNodeSize; applyPortPosition
end
NML -> NDC : calculateNodeMargins(adapter)
NDC -> NMC : new NodeMarginCalculator(adapter).process()
@enduml
```

The loop body is a summary. T7 keeps the exact Java phase order of `N/NodeLabelAndSizeCalculator.java:86-220`.
