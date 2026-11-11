<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — alg-trees

```plantuml
@startuml
package "src/alg/mrtree (new)" {
  [options (generated + enums)] as MO
  [graph: TGraph/TNode/TEdge] as MG
  [ElkGraphImporter / ComponentsProcessor] as MI
  [p1-p4 phases] as MP
  [intermediate processors] as MX
  [MrTree / TreeLayoutProvider] as MW
}
package "src/alg/radial (new)" {
  [options + strategies] as RO
  [RadialUtil / sorting] as RU
  [compaction / overlaps / rotation / optimization] as RX
  [EadesRadial / router / provider] as RW
}
package "src/alg/vertiflex (new)" {
  [options + strategies] as VO
  [p1-p4 placers / routers] as VP
  [VertiFlexLayoutProvider] as VW
}
package "landed" {
  [src/core (AlgorithmAssembler, RecursiveGraphLayoutEngine, LayoutMetaDataService)] as CORE
  [src/alg/common NodeMicroLayout] as NML
  [src/graph + json] as GRAPH
  [src/java, src/guava shims] as SHIM
}
package "tools + test" {
  [tools/melk] as MELK
  [*Vectors.java recorders] as REC
  [regen-goldens.sh --set trees] as GOLD
  [ts-layout-compare.ts] as CMP
}
MELK --> MO : generates
MELK --> RO : generates
MELK --> VO : generates
MW --> MI : imports and splits
MW --> MP : assembles
MP --> MX : configures
MI --> MG : builds
RW --> RX : assembles
RX --> RU : uses
VW --> VP : assembles
MW --> NML : micro layout
RW --> NML : micro layout
VW --> NML : micro layout
MW --> CORE : provider SPI
RW --> CORE : provider SPI
VW --> CORE : provider SPI
MG --> SHIM : JavaHashMap (V1, V4)
REC ..> MW : expected rows
GOLD ..> CORE : expected refs
CMP --> CORE : registers 3 providers
@enduml
```
