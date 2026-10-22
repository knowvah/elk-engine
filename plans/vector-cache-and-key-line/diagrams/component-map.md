<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map

```plantuml
@startuml
title Mission 4e: touched components (bold = changed)
package "tools/vectors" {
  [**vector-cache.sh** (new, T3)] as VC
  [**elkj-vectors.sh** (T3)] as EJ
  [**elkt-vectors.sh** (T3)] as ET
  [**ElkjWriteVectors.java** (T2)] as WV
  [ElkjRoundTripVectors.java (T3: header only)] as RT
  [Elkj/Elkt cheap programs] as CP
  [**elkt-validate-scenarios** (+2, T1)] as SC
}
package "test/golden/refs/java" {
  [graph-json-text-*.json (unchanged)] as RJ
  [**graph-text-validate.json** (+2 rows, T1)] as RV
}
package "src" {
  [**ElkGraphParser.#parsePropertyKey** (T1)] as PK
  [TokenCursor.lineOf] as LO
  [ElkGraphValidator] as VAL
}
database "$ELK_ORACLE_DIR/vector-cache" as CACHE
[oracle JVM] as JVM

EJ --> VC : sources
ET --> VC : sources
VC --> CACHE : salted entries
EJ --> RT : cacheDir
EJ --> WV : cacheDir
EJ --> CP : whole-program
ET --> CP : whole-program
RT --> JVM : runs on
WV --> JVM : runs on
ET --> SC : reads
EJ --> RJ : must reproduce (cmp)
ET --> RV : records
PK --> LO : line
VAL --> RV : replayed against
@enduml
```
