<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission reads, runs and writes

```plantuml
@startuml
package "Java at 8bca22f4 (read only)" {
  [Compaction.java] as C
  [RowFillingAndCompaction.java] as R
  [InitialPlacement.java] as I
  [Block.java / RectRow.java] as B
}
package "scratch $TMPDIR/rectpacking-open-arm" {
  [git-archive snapshot\n(instrumented placeBeside)] as S
  [seeded search\n(child process + kill timer)] as Q
}
[oracle jars\n~/git/knowvah/elk-oracle] as O
package "repo (writes)" {
  [plans/alg-packing/unreached.md\n(addendum)] as U
  [docs/conformance.md\ndocs/architecture/alg-packing.md] as D
  [rectpacking-extra.json + test\n(D4 only)] as X
}
C --> U : lemmas L1-L5 (file:line)
R --> U : L3
I --> U : L1, L2
B --> U : L5
Q --> S : 100,000+ flag-on inputs
S --> U : counts (violations, arm hits)
Q --> O : 1,000+ inputs cross-checked at 1e-6
U --> D : docs point at U row 19
O --> X : recorder run (D4 only)
@enduml
```
