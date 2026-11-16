<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: fixed-mode comparison of label-bearing models (proposed)

How the oracle's sizes and layouts become the expected values of the TS comparison (TX6).

```plantuml
@startuml
actor Orchestrator as O
participant "label-sizing-vectors.sh" as S
participant "LabelSizingVectors\n(JVM, -D...textMeasurer=fixed)" as R
participant "TestConfiguration.apply\n(patched)" as TC
participant "RecursiveGraphLayoutEngine" as L
database "label-sizing.json" as REF
participant "label-sizing.test.ts\n(vitest)" as T
participant "ensureSensibleLabelSize\n(FIXED_ADVANCE)" as TS

O -> S : run (macOS arm64, JDK 21.0.1)
S -> R : classpath = oracle jars + alg.test classes + JUnit
loop each vendored label-bearing .elkt
  R -> TC : apply(NoDefaults, graph)
  TC --> R : labels sized [len×6, 12]
  R -> L : layout(graph)
  L --> R : laid-out graph
  R -> REF : keys, sizes, preset, layout JSON
end
O -> T : npx vitest run
loop each ref model
  T -> TS : size the TS-loaded graph
  TS --> T : sizes
  T -> T : key sets equal; sizes exact;\nlayout compareLayout at 1e-6
end
@enduml
```
