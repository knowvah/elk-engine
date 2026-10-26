<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — mission 6b

What 6b adds under `src/alg/common/`, what it builds on, and its later consumers. Grey components are not part of
6b. Each edge is labelled with what flows along it; the task that writes each component is in its name.

```plantuml
@startuml
skinparam componentStyle rectangle
package "src/alg/common (6b)" {
  [NodeMicroLayout (T7)] as NML
  [nodespacing entry points (T7)\nNodeDimensionCalculation,\nNodeLabelAndSizeCalculator] as Entry
  [NodeMarginCalculator (T5)] as NMC
  [port placement (T4)] as PP
  [PortLabelPlacementCalculator (T5)] as PLP
  [cell creators + sizing (T6)] as CC
  [contexts (T3)\nNodeContext, PortContext,\nNodeLabelAndSizeUtilities] as Ctx
  [cellsystem + NodeLabelLocation (T2)] as Cells
}
[overlaps (6a)] as Ovl
[src/core\nadapters, options, math] as Core
[src/guava\nTreeMultimap, Maps.newEnumMap] as Guava
[src/java/util/EnumSet] as ES
[alg.layered (7a)] as Layered #lightgray
[force, mrtree, radial,\nrectpacking (8x)] as Algs #lightgray
[NodeMicroLayoutVectors.java (T1)\n+ replay test (T7)] as Ev

NML --> Entry : sort, sizes, margins
Entry --> Ctx : one NodeContext per node
Entry --> PP : port sizes and positions
Entry --> PLP : port label positions
Entry --> CC : cells, node size, labels
Entry --> NMC : margins
PP --> Ctx : portContexts per side
PLP --> Ovl : strip overlap removal
PLP --> Ctx : port label cells
CC --> Cells : builds cell tree
Ctx --> Cells : node container cells
Ctx --> Guava : sorted portContexts, enum maps
Cells --> ES : placement sets
Entry --> Core : GraphAdapter
NMC --> Core : MARGINS
Layered --> Entry : via LGraphAdapters
Algs --> NML : forGraph(...).execute()
Ev --> NML : oracle replay
@enduml
```
