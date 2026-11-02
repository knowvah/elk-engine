<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — how a ported suite proves a 7c class

The Java run establishes that a literal holds on the oracle (T1, T2); the ported suite asserts the same literal against
the TS class; a mismatch goes back to the orchestrator as a diagnosis (T7).

```plantuml
@startuml
title 7c-tests: one Java test, ported
actor Orchestrator
participant "java-tests.sh" as Runner
participant "Java suite\n(oracle classes)" as JSuite
participant "TS suite\n<JavaName>.test.ts" as TSuite
participant "TestGraphCreator\n(+ MockRandom)" as Creator
participant "7c class under test\n(src/alg/layered/...)" as Port

Orchestrator -> Runner : run suite (batch gate)
Runner -> JSuite : JUnitCore
JSuite --> Runner : runs, failures
Runner --> Orchestrator : counts == baseline (stop 6)

Orchestrator -> TSuite : vitest (agent, then gate)
TSuite -> Creator : fresh creator (beforeEach), getXxxGraph()
Creator --> TSuite : LGraph with RANDOM = MockRandom
TSuite -> Port : process / count / decide
Port --> TSuite : result
TSuite -> TSuite : expect(...) against the Java literal\n(identity for graph elements, T5)
alt literal fails
  TSuite --> Orchestrator : diagnosis artifact (agent never edits src)
  Orchestrator -> Port : fix at origin (7c files only, T7)
  Orchestrator -> Orchestrator : 813-row replay + stride-2 sweep
end
@enduml
```
