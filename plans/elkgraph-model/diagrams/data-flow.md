<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — elkgraph-model

## Vectors before code (AD-13, D9)

```plantuml
@startuml
participant "GraphVectors.java\n(T2)" as gen
participant "oracle graph jar\n+ EMF (JVM)" as jvm
database "graph.json" as gj
participant "ElkGraph.replay.test.ts\n(T9)" as replay
participant "src/graph + src/emf\n(T6–T9)" as ts
gen -> jvm : run scripted scenario steps
jvm --> gen : list contents, containers,\neAllContents order, property order,\ntoString, throws
gen -> gj : write (byte-identical on rerun)
replay -> gj : read scenarios
replay -> ts : apply the same steps
ts --> replay : actual state after each step
replay -> replay : assert equal per step\n(0 skipped)
@enduml
```

## Containment move: `node.setParent(newParent)` (D2)

```plantuml
@startuml
participant Caller
participant "ElkNodeImpl" as node
participant "EcoreUtil" as util
participant "old parent\nchildren EList" as oldList
participant "new parent\nchildren EList" as newList
Caller -> node : setParent(newParent)
node -> util : isAncestor(node, newParent)
util --> node : false (else IllegalArgumentException)
node -> oldList : eBasicRemoveFromContainer → remove(node)
node -> newList : eInverseAdd → addUnique(node)
node -> node : eBasicSetContainer(newParent,\nELK_NODE__PARENT)
Caller <-- node
@enduml
```

## Inverse reference: `edge.getSources().add(shape)` (D2)

```plantuml
@startuml
participant Caller
participant "edge.sources\n(ManyInverse EList)" as src
participant "shape.outgoingEdges\n(ManyInverse EList)" as out
Caller -> src : add(shape)
src -> src : contains(shape)? → return false
src -> src : addUnique(shape)
src -> out : inverseAdd(edge) → addUnique(edge)
Caller <-- src : true
@enduml
```

## Property read with default cloning (D5, D6)

```plantuml
@startuml
participant Caller
participant "EMapPropertyHolderImpl" as holder
participant "EcoreEMap" as map
participant "Property" as prop
participant "ElkReflect" as reflect
Caller -> holder : getProperty(p)
holder -> map : get(p)  (id-keyed)
map --> holder : undefined
holder -> prop : getDefault()
prop -> reflect : isCloneable(default) ? clone(default)
reflect --> prop : clone (or null → IllegalStateException)
prop --> holder : default
holder -> holder : isCloneable(default) ? setProperty(p, default)
holder --> Caller : default
@enduml
```
