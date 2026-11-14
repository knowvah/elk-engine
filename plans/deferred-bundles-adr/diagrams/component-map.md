<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: deferred-bundles-adr

The three deferred bundles at the pin and what they touch. Nothing here is ported; the diagram is the evidence frame.

```plantuml
@startuml
skinparam componentStyle rectangle
package "ELK at 8aaa3c14 (deferred)" {
  [alg.libavoid] as LA
  [alg.graphviz.layouter] as GL
  [alg.graphviz.dot] as GD
}
package "ELK in scope (ported)" {
  [core] as CORE
  [graph] as GRAPH
  [alg.common] as COMMON
}
node "libavoid-server (C++)" as LAS
node "Graphviz dot binary" as DOT
[@knowvah/dot-engine (TS, EPL-2.0)] as DE

LA --> CORE : Require-Bundle
LA --> COMMON : Require-Bundle
LA --> LAS : Runtime.exec, stdin/stdout
GL --> GD : DotExporter / parser
GL --> DOT : Runtime.exec
GD --> GRAPH : DotImporter / DotExporter
GL ..> DE : delegate option (evaluated)
GD ..> DE : delegate option (evaluated)
@enduml
```
