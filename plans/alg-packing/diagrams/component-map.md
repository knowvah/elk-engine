<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — alg-packing (proposed)

New bundles (green) and the landed components they call. Edges are imports in the Java; no algorithm imports another.

```plantuml
@startuml
skinparam componentStyle rectangle
package "src/alg/rectpacking (new)" #E8F5E9 {
  [RectPackingLayoutProvider] as RP
  [p1 / p2 / p3 phases] as RPh
  [util: Block, RectRow, ...] as RU
}
package "src/alg/spore (new)" #E8F5E9 {
  [OverlapRemovalLayoutProvider] as SO
  [ShrinkTreeLayoutProvider] as SC
  [ElkGraphImporter + phases] as SPh
}
package "src/alg/topdownpacking (new)" #E8F5E9 {
  [TopdownpackingLayoutProvider] as TP
  [GridElkNode] as GE
}
package "src/alg/common (landed)" {
  [NodeMicroLayout] as NML
  [NaiveMinST / BowyerWatson] as MST
  [spore: ScanlineOverlapCheck, DepthFirstCompaction] as CSP
}
package "src/core (landed)" {
  [RecursiveGraphLayoutEngine (+Topdown)] as RGLE
  [BoxLayoutProvider] as BOX
}
package "src/graph (landed)" {
  [ElkNode interface] as EN
  [ElkGraphPackage guard registry] as REG
}
RGLE --> RP : layout
RGLE --> SO : layout
RGLE --> SC : layout
RGLE --> TP : layout / getPredictedGraphSize
RP --> RPh : assembles
RPh --> RU : uses
RP --> NML : micro layout
RP --> BOX : trybox fallback
SO --> CSP : scanline
SO --> SPh : iterates
SC --> SPh : runs
SPh --> MST : spanning tree
SPh --> CSP : compaction
TP --> GE : wraps root
GE ..|> EN : implements by delegation (PK3)
GE --> REG : registers under ElkNode (PK3)
@enduml
```
