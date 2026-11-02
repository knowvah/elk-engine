<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — what 7c-tests adds and what it exercises

New components are the runner, the three creators, the assertion helper and the fourteen suites; the 7c production
classes are exercised, and touched only by an orchestrator fix under T7.

```plantuml
@startuml
title 7c-tests components
package "tools/oracle" {
  [java-tests.sh] as Runner <<new>>
}
package "$ELK_ORACLE_DIR" {
  [oracle jars + test classes] as Oracle
}
package "test/helpers" {
  [TestGraphCreator\n+ MockRandom] as TGC <<new>>
  [InLayerEdgeTestGraphCreator] as IE <<new>>
  [NorthSouthEdgeTestGraphCreator] as NSE <<new>>
  [junit-asserts\nexpectSameElements] as JA <<new>>
}
package "src/alg/layered/p3order (suites)" {
  [6 p3order suites] as P3S <<new>>
  [3 counting suites] as CS <<new>>
}
package "src/alg/layered/intermediate/greedyswitch (suites)" {
  [5 greedy-switch suites] as GS <<new>>
}
package "src/alg/layered (7c production)" {
  [p3order + counting] as P3
  [greedyswitch + preserveorder] as GSW
}
package "src/java/util" {
  [Random shim] as Rnd
}

Runner --> Oracle : runs the Java suites (T2)
IE --> TGC : extends
NSE --> TGC : extends
TGC --> Rnd : MockRandom extends (T4)
P3S --> TGC : builds graphs
CS --> IE : builds graphs
CS --> NSE : builds graphs
GS --> NSE : builds graphs
GS --> TGC : builds graphs
P3S --> P3 : exercises
CS --> P3 : exercises
GS --> GSW : exercises
P3S --> JA : asserts identity (T5)
CS --> JA : asserts identity
GS --> JA : asserts identity
@enduml
```
