<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — layered-framework (mission 7a)

Proposed state at mission end. `<<staged>>` classes carry the `@staged` marker and are listed in
`test/architecture/staged-classes.json` (L1).

```plantuml
@startuml
title 7a components (src/alg/layered) and their dependencies
skinparam componentStyle rectangle

package "src/alg/layered" {
  [LayeredLayoutProvider] as P
  [ElkLayered <<staged 7f>>] as EL
  [LayeredPhases] as LP
  package "options" {
    [LayeredOptions +\nLayeredMetaDataProvider\n(generated)] as LO
    [InternalProperties] as IP
    [phase-strategy enums\n(throwing create arms)] as PS
    [plain option enums (27)] as OE
    [Spacings, LayeredSpacings] as SP
  }
  package "graph" {
    [LGraph, Layer, LNode,\nLPort, LEdge, LLabel, ...] as M
    [LGraphUtil] as U
    [LGraphAdapters] as AD
    [Tarjan] as TJ
  }
  package "graph.transform" {
    [ElkGraphTransformer] as GT
    [ElkGraphImporter] as GI
    [ElkGraphLayoutTransferrer] as GL
  }
  [staged: CrossHierarchyEdge, BreakingPointInserter,\nSplineSegment, SelfLoop*, LabelDummySwitcher] as ST
}
package "src/alg/common" { [NodeDimensionCalculation] as NDC }
package "src/core" { [LayoutMetaDataService] as S }
package "src/graph" { [ElkGraph] as EG }

P --> GT : importGraph / applyLayout
P --> EL : layout (throws until 7f)
LO --> P : algorithm factory (after T7)
LO --> PS : option types
PS --> LP : phase ids
GT --> GI : import
GT --> GL : transfer
GI --> EG : reads
GL --> EG : writes
GI --> U : uses
GL --> ST : LabelDummySwitcher.INCLUDE_LABEL
IP --> ST : property value types
AD --> ST : self-loop branch
AD --> NDC : adapted by
M --> IP : properties
U --> SP : spacings
TJ --> IP : properties
S --> LO : explicit registration (L5)
@enduml
```
