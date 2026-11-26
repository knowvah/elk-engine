<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission reads and writes

```plantuml
@startuml
package "Java at the pin (read only)" {
  [OrthogonalSelfLoopRouter.java\n:180 :304 :367 :441] as OJ
  [RoutingDirector.java\n:207 :227] as RJ
  [SelfHyperLoop.java:103\nSelfLoopType.java:42] as SJ
}
package "Port (modified)" {
  [OrthogonalSelfLoopRouter.ts\nrows 96, 99, 100] as O
  [OrthogonalSelfLoopRouterSlotPositions.ts\nrow 98] as S
  [RoutingDirector.ts\nrows 105, 108] as R
}
package "Tests (new and additive)" {
  [OrthogonalSelfLoopRouter.test.ts] as OT
  [RoutingDirector.test.ts] as RT
}
package "Records (modified)" {
  [plans/dev-assert/inventory.md\n(appended)] as I
  [docs/translation-rules.md:511-516] as D
}
OJ --> O : arms ported from
OJ --> S : arm ported from
RJ --> R : arms ported from
SJ ..> R : D5 proof (no UNDEFINED side)
O --> S : computeRoutingSlotPositions
OT --> O : withAssertions / assertionErrorOf
OT --> S : computeBaselinePosition
RT --> R : withAssertions / assertionErrorOf
I --> O : rows 96-100 status
I --> R : rows 105, 108 status
D --> I : outcome counts
@enduml
```
