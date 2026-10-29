<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-cycles-layers (mission 7b)

## Oracle rows to replay (B1, B4, AD-13)

```plantuml
@startuml
title 7b: recording a models row and replaying it
participant "LayeredPhaseVectors\n(JDK 21, oracle jars)" as R
participant "ElkLayered (oracle)" as E
database "layered-phases.json" as V
participant "layered-phase-replay-*.ts" as H
participant "ElkGraphTransformer (TS, 7a)" as T
participant "normalise (B4 mirror)" as N
participant "IntermediateProcessorStrategy\n+ phase factories (TS)" as F
R -> R : load model, apply root options,\nSEPARATE_CONNECTED_COMPONENTS=false (B3)
R -> R : importGraph(target) → import dump
R -> E : prepareLayoutTest(lgraph)
R -> E : runLayoutTestUntil(phase class, inclusive)
E --> R : processors run; prefix names
R -> R : phaseDump(lgraph) − import dump → expected (B2)
R -> V : row { input, options, target, prefix, expected }
H -> V : read row
H -> T : importGraph(target)
T --> H : LGraph, import dump
H -> N : normalise(graph)
loop every name in prefix
  H -> F : create(name).process(graph, monitor)
end
H -> H : phaseDump − import dump
H -> H : compare with expected (AD-4)
@enduml
```

## Step rows (scenarios, sites)

```plantuml
@startuml
title 7b: a step row is data for both interpreters
participant "Java interpreter\n(LayeredPhaseVectors)" as J
database "layered-phases.json" as V
participant "TS interpreter\n(layered-phase-replay-ops.ts)" as S
J -> J : importGraph(elk) · normalise · layers(spec) ·\nsetProperty · runProcessor(name) · runPhase(phase, strategy) · dump
J -> V : row { steps, expected }
S -> V : read row
S -> S : apply the same steps on the TS classes
S -> S : compare dump with expected
@enduml
```

## Breadth sweep (B6, local only)

```plantuml
@startuml
title 7b: hash-only sweep over $ELK_MODELS_DIR
participant "phase-sweep.sh" as P
participant "LayeredPhaseVectors --sweep" as R
database "test/corpus/.phase-sweep/\nresults.jsonl" as D
participant "phase-sweep.test.ts" as T
P -> R : models dir, stamp
R -> D : { id, sha256 } per (model, target, strategy)
T -> D : read cases (skip if absent)
T -> T : replay case, canonical dump, sha256
T -> T : assert equal; on mismatch: --dump <case>
@enduml
```
