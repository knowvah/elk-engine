<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: where a layout double becomes bits

```plantuml
@startuml
package "oracle side (tools/vectors, T2)" {
  [layout recorders\n(hex, guarded)] as REC
  [sweep hashers\n(hx, bitsOf, C4 double)] as SWJ
  [stability checks\n(RectPacking, Spore)] as STAB
}
package "refs and caches" {
  [test/golden/refs/java/*.json] as REFS
  [test/corpus/.*-sweep/results.jsonl] as CACHE
}
package "port side (test/helpers, T3)" {
  [double-hex.ts\ncanonicalHex] as DH
  [replay helpers] as REP
  [sweep helpers\n(phase, pipeline)] as SWT
}
package "src/java/lang" {
  [JavaDouble.doubleToLongBits] as JD
}
[test/architecture\ncanonical-nan.fitness (T4)] as FIT

REC --> REFS : writes (doubleToLongBits)
SWJ --> CACHE : writes hashes
STAB --> REC : run-vs-run equality
REP --> DH : encodes port output
SWT --> DH : encodes port output
DH --> JD : canonical bits
REP ..> REFS : compares
SWT ..> CACHE : compares hashes
FIT ..> REC : no raw call
FIT ..> DH : no raw call in helpers
@enduml
```

T2 owns the oracle side and T3 the port side; they share no file. JDK shim recorders (`JavaVectors`, `CoreJdkVectors`) are
outside this map and stay raw.
