<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-framework (mission 7a)

## Oracle rows to replay (L3, AD-13)

Every expectation is recorded from the source-built oracle before its TS consumer exists.

```plantuml
@startuml
title 7a: oracle recording and TS replay
participant "LayeredFrameworkVectors\n(JDK 21, oracle jars)" as R
database "layered-framework.json" as V
participant "layered-framework-replay.ts" as H
participant "ElkGraphTransformer (TS)" as T
participant "LGraphAdapters +\nNodeDimensionCalculation (TS)" as A
participant "LayoutMetaDataService (TS)" as S

R -> R : parse model / build sweep graph,\nexport ELK JSON (input)
R -> R : importGraph → dump LGraph;\napplyLayout → export ELK JSON
R -> V : transform rows
R -> R : import → adapt → size → margins
R -> V : adapters rows
R -> R : register core + labels + layered → dump
R -> V : metadata row
H -> V : read row
H -> T : importGraph(input) / applyLayout
T --> H : LGraph dump, ELK JSON
H -> A : adapt + size + margins
A --> H : sizes, positions, margins
H -> S : registerLayoutMetaDataProviders(LayeredMetaDataProvider)
S --> H : service dump
H -> H : compare (AD-4: 1e-6 numbers, exact otherwise)
@enduml
```

## Unreached branches (L4)

```plantuml
@startuml
title 7a: coverage map to anchored tests
start
:T9 runs the T6–T8 replays alone with coverage per 7a class;
:list each untaken branch and the smallest scenario reaching it;
if (more than ~15 scenarios?) then (yes)
  :stop 11, wait for the user;
  stop
else (no)
endif
:T10 records one layered-sites.json row per scenario;
:T11 writes one anchored test per branch\n(literal = oracle row, comment = row id + Java line);
stop
@enduml
```
