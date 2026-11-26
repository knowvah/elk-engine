<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission reads and writes

```plantuml
@startuml
package "Java (read only)" {
  [SplinesMath.java:53-55] as SJ
  [LazyLinkingResource.java:62-71\nDefaultLinkingService.java] as XJ
}
package "java.lang shim (read only)" {
  [AssertionError.ts] as AE
}
package "Port (modified)" {
  [DefaultLinkingService.ts] as DLS
  [LazyLinkingResourceTypes.ts\nCyclicLinkingException] as CLE
  [SplinesMath.ts] as SM
}
package "Tests and docs (modified)" {
  [three colocated tests\n(additive)] as T
  [exception-hierarchy.fitness.test.ts] as F
  [docs/translation-rules.md:670] as D
}
SJ --> SM : constructor ported from
XJ --> DLS : throw ported from
XJ --> CLE : parent ported from
AE <-- DLS : throws
AE <|-- CLE : extends
AE <-- SM : throws
F --> CLE : parent chain checked
T --> DLS
T --> CLE
T --> SM
@enduml
```
