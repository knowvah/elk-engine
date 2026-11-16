<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — alg-force-disco

```plantuml
@startuml
package "src/alg/force (new)" {
  [options (generated + enums)] as FO
  [graph: FGraph/FNode/FEdge/FBendpoint/FLabel] as FG
  [ElkGraphImporter / ComponentsProcessor] as FI
  [model: Eades / Fruchterman-Reingold] as FM
  [ForceLayoutProvider] as FP
  [stress: StressMajorization / StressLayoutProvider] as FS
}
package "src/alg/disco (new)" {
  [options (generated + enums)] as DO
  [graph: DCGraph/DCComponent/DCElement/DCExtension] as DG
  [DCPolyomino / DisCoPolyominoCompactor] as DC
  [transform: ElkGraphTransformer / ComponentsProcessor] as DT
  [DisCoLayoutProvider] as DP
}
package "landed" {
  [src/core (LayoutMetaDataService, RecursiveGraphLayoutEngine)] as CORE
  [src/alg/common (NodeMicroLayout, polyomino)] as COMMON
  [src/java (JavaMath, Random, PriorityQueue)] as JAVA
}
package "tools + test" {
  [tools/melk] as MELK
  [Force/Disco Vectors.java] as REC
  [regen-goldens.sh --set force-disco] as GOLD
  [ts-layout-compare.ts] as CMP
}
MELK --> FO : generates
MELK --> DO : generates
FM --> JAVA : JavaMath.log, Random
FS --> FP : initial layout
FS --> JAVA : PriorityQueue
FP --> FM : runs per component
FP --> FI : import, split, recombine
FP --> COMMON : NodeMicroLayout
DP --> DT : import, apply
DP --> DC : compact
DC --> COMMON : PolyominoCompactor
DP ..> CORE : componentLayoutAlgorithm via the service
REC --> CORE : records the oracle
CMP --> FP : compares
CMP --> DP : compares
GOLD --> CMP : refs for the goldens test
@enduml
```
