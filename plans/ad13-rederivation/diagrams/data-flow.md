<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — mission 6c

How one flagged scenario becomes an oracle-anchored test. The same row drives the Java recorder (T2) and the TS
replay (T3a); the unit test (T3a/T3b) keeps a literal equal to the row.

```plantuml
@startuml
participant "TS fixture\n(test/helpers)" as Fix
participant "NodespacingSiteVectors.java (T2)" as Rec
participant "Oracle ELK\n(nodespacing.internal, public)" as Elk
database "nodespacing-sites.json" as Json
participant "nodespacing-site-replay.ts (T3a)" as Rep
participant "ported nodespacing (TS)" as Port
participant "unit test (T3a/T3b)" as Unit

Rec -> Fix : read lines, mirror by hand
Rec -> Elk : build graph, NodeContext, apply steps, call site
Elk --> Rec : values
Rec -> Elk : re-import exported input, replay steps, call again
Elk --> Rec : values (must equal)
Rec -> Json : row {id, site, input, steps, expected(hex)}
Rep -> Json : load rows
Rep -> Port : import input, build NodeContext, apply steps, call site
Port --> Rep : values
Rep -> Rep : compare within 1e-6 / exact
Unit -> Port : same scenario via TS fixture
Port --> Unit : values
Unit -> Unit : assert literal == row (annotated with row id)
@enduml
```

A mismatch in `Rep` or `Unit` is a stop (4/5/7): diagnosed against the Java, never fixed by changing the row.
