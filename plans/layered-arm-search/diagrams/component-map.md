<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission touches

```plantuml
@startuml
title layered-arm-search components
package "scratch ($TMPDIR, never committed)" {
  [instrumented Java copies] as INSTR
  [search logs and candidates] as LOGS
}
package "oracle (read only)" {
  [elk-oracle jars 8bca22f4 + 0001-0004] as ORACLE
}
package "tools/" {
  [arm-search/{instrument,coverage}.sh] as HARN
  [arm-search/<group>/ generators] as GEN
  [LayeredOrderVectors.java SCENARIOS] as OREC
  [LayeredCompoundVectors.java SITE_ROWS] as CREC
  [compound-site-arms.mjs] as ARMS
}
package "test/" {
  [layered-order.json] as OREF
  [layered-compound.json] as CREF
  [arm tables (compound, order-search)] as TABLES
}
package "src/alg/layered (read only)" {
  [25 arms, 9 files] as SRC
  [Layered{Order,Compound*}.test.ts] as TESTS
}
HARN --> INSTR : copies and compiles
INSTR --> ORACLE : prepended to classpath
GEN --> LOGS : candidates
GEN --> TESTS : TS screen (scratch config)
OREC --> OREF : appends rows (script)
CREC --> CREF : appends rows (script)
TESTS --> SRC : replay
ARMS --> TABLES : reads
ARMS --> TESTS : one row per run, v8 coverage
@enduml
```
