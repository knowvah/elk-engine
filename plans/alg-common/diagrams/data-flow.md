<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — evidence for mission 6a

How the oracle recorder (T4) and the TS replays (T8, T10–T12) prove the packages that have no Java tests. The `NaiveMinST`
replay is the roadmap exit.

```plantuml
@startuml
actor Orchestrator
participant "alg-common-vectors.sh\n(T4)" as Sh
participant "vector-cache.sh" as Cache
participant "AlgCommonVectors.java\n(oracle classpath)" as Rec
database "alg-common.json" as Vec
participant "TS replay tests\n(T8, T10, T11, T12)" as TS

Orchestrator -> Sh : run (twice)
Sh -> Cache : lookup(inputs digest, program, JDK)
alt cache miss
  Cache -> Rec : java AlgCommonVectors <out>
  Rec -> Rec : seeded inputs; each scenario run twice, fail on difference
  Rec -> Vec : inputs + results (hex doubles)
else cache hit
  Cache -> Vec : copy cached output
end
Orchestrator -> Orchestrator : cmp run 1 vs run 2 (byte-identical)
TS -> Vec : read scenarios
TS -> TS : rebuild inputs, call TS port\n(JavaHashSet iteration for V6/V7,\nstable sort for V8 ties)
TS -> TS : assert exact equality\n(mismatch = stop 5/7, never edit the vector)
@enduml
```
