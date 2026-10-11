<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — java-foundations

## Vectors first, then the shim (every shim task, AD-13)

```plantuml
@startuml
actor Agent
participant "JavaVectors.java\n(JDK 21)" as JV
database "refs/java/*.json" as V
participant "Shim.test.ts" as T
participant "Shim.ts" as S
Agent -> JV : append generator method (Batch 1/2b)
JV -> V : record JDK results (frozen)
Agent -> T : write replay test first
T -> V : load rows
T -> S : call shim per row
S --> T : result
T --> Agent : red, then green after implementation
@enduml
```

## Clean-room model loop (T11 JavaHashMap, T12 PriorityQueue — M1/M8)

```plantuml
@startuml
actor Agent
participant "Model\n(hypothesis n)" as M
database "collections.json\n+ hashmap-probes.json" as V
participant "JavaVectors.java" as JV
participant "decision-journal.md" as J
Agent -> M : implement hypothesis from Javadoc facts
M -> V : replay every script, every step
alt all steps match
  V --> Agent : green, commit
else mismatch
  V --> Agent : failing script + step
  Agent -> J : journal hypothesis, script, verdict
  Agent -> JV : optional: append discriminating probe
  JV -> V : new rows only
  Agent -> M : revision n+1 (STOP after 3 rejected)
end
@enduml
```
