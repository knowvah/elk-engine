<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the move touches

```plantuml
@startuml
package "Java @ 8bca22f4" {
  [rectpacking InteractiveNodeReorderer (#1237)] as J1
  [rectpacking Compaction.placeBeside (#1239)] as J2
  [layered ElkGraphImporter (#1241)] as J3
  [spore ElkGraphImporter (#1242, #1244)] as J4
  [Layered.melk / SPOrE.melk (#1234, #1242)] as J5
}
package "Port (src/)" {
  [intermediate/InteractiveNodeReorderer.ts] as T1
  [p2packing/Compaction*.ts] as T2
  [graph/transform/ElkGraphImporterHierarchical.ts] as T3
  [spore/ElkGraphImporter.ts] as T4
  [generated options] as T5
}
package "Tools / tests" {
  [RectPackingVectors.java sort copy (D1)] as V1
  [SporeLayoutVectors.java (D4)] as V2
  [ts-findings.json / parity-report.ts (#79)] as V3
  [rectpacking-sort-classified.ts (#75, deleted)] as V4
}
J1 --> T1 : port
J1 --> V1 : verbatim copy
J2 --> T2 : port
J3 --> T3 : port
J4 --> T4 : port
J4 --> V2 : row may change group
J5 --> T5 : melk:generate
T1 --> V4 : retires
T4 --> V3 : retires #79 notes
@enduml
```
