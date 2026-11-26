<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission reads and writes

```plantuml
@startuml
package "Java at 8bca22f4 (read only)" {
  [Compaction.java] as CJ
  [RectRow / Block] as RB
}
package "Prior proof (read only)" {
  [rectpacking-open-arm/evidence.md\ninvariant I, E2-E8, harness] as EV81
}
package "Port (read only, src unchanged)" {
  [CompactionPlacement.ts\nremoveFromNextRow] as CP
}
package "Scratch ($TMPDIR, never committed)" {
  [instrumented snapshot\n+ mutant snapshot] as SNAP
}
[oracle jars (elk-oracle)] as OR
package "Records (written)" {
  [evidence.md + journal] as EV
  [plans/alg-packing/unreached.md\naddendum, U row 20] as UN
  [docs/conformance.md\ndocs/architecture/alg-packing.md] as DOCS
}
CJ --> EV : N1-N4 proven from
EV81 --> EV : invariant I reused by
CP --> SNAP : copied and counted in
SNAP --> EV : search counts to
OR --> EV : 1e-6 cross-check to
EV --> UN : summarized as
UN --> DOCS : cited by
@enduml
```
