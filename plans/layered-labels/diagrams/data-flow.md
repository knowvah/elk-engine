<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — layered-labels (mission 7f2)

## A labelled, commented layout through the driver

The order of the 12 arms is that of `J/intermediate/IntermediateProcessorStrategy.java:41-176`; `GraphConfigurator` only decides which
arms enter the plan (for example a set `LABEL_MANAGER` adds the two label-management arms, `GraphConfigurator.java:221`).

```plantuml
@startuml
title 7f2: where the label and comment arms run inside ElkLayered.doLayout
participant "LayeredLayoutProvider" as LLP
participant "ElkLayered" as EL
participant "GraphConfigurator" as GC
participant "Before P1\nCommentPreprocessor" as B1
participant "P1 cycle breaking\n(landed)" as P1
participant "Before P2\nLabelDummyInserter" as B2
participant "P2 layering, P3 ordering\n(landed)" as P23
participant "Before P4\nunzipper, label management,\nmargins, EndLabelPreprocessor,\nLabelDummySwitcher,\nLabelSideSelector" as B4
participant "P4 placement, P5 routing\n(landed)" as P45
participant "After P5\nCommentPostprocessor,\nLabelDummyRemover,\nEndLabelSorter,\nEndLabelPostprocessor" as A5
participant "ElkGraphLayoutTransferrer" as TR
LLP -> EL : doLayout(lgraph, monitor)
EL -> GC : prepareGraphForLayout(lgraph)
GC --> EL : plan with the label and comment arms around P1-P5
EL -> B1 : detach comment boxes into TOP_COMMENTS, BOTTOM_COMMENTS
EL -> P1 : break cycles
EL -> B2 : turn center-labelled edges into label dummy nodes
EL -> P23 : assign layers, order nodes
EL -> B4 : unzip, size, margins, end labels, switch dummies, label sides
B4 --> EL : label dummies in their layers, END_LABELS set
EL -> P45 : place nodes, route edges
EL -> A5 : place comments, restore edges, sort and lay out end labels
A5 --> EL : labels placed, END_LABELS consumed
EL --> LLP : lgraph (DebugUtil logs DOT and JSON when isLoggingEnabled)
LLP -> TR : applyLayout(lgraph), unless cancelled
@enduml
```

## How each kind of proof reaches the port

```plantuml
@startuml
title 7f2: proofs and what they read
rectangle "Oracle (JVM, -XX:hashCode=2)" as O
file "layered-labels.json\nfull, models, scenarios, sites" as REF
file "layered-pipeline.json,\nlayered-phases.json\n(landed, 59 rows unpinned)" as LANDED
file "layered-label-metrics.json\n(append-only, G8)" as MET
rectangle "ElkLayered + label family (TS)" as TS
rectangle "T12 replay\n(+ G3 comparator)" as T12
rectangle "T13a-c ported suites" as T13
rectangle "T15 label sweep\n(stride 1)" as T15
rectangle "T11 unpinned replays" as T11
O --> REF : T1, T16 record
O --> MET : T3 re-records, old entries byte-identical
O --> T15 : hashes, local only
REF --> T12 : rows, logged DOT and JSON
LANDED --> T11 : recorded expectations
MET --> T13 : label sizes
T12 --> TS : prepareLayoutTest, runLayoutTestStep
T11 --> TS : replay landed rows
T13 --> TS : provider + TestController
T15 --> TS : canonical hash
@enduml
```
