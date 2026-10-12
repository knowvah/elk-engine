<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — elkgraph-model

Directories this mission creates and the import direction the fitness test enforces (AD-8, D1).

```plantuml
@startuml
skinparam componentStyle rectangle

package "src/java (shims)" as java {
  [LinkedList, ListIterator] as ll
  [EnumSet] as es
  [JavaHashMap, HashStrategy] as hm
  [Comparable, IllegalStateException] as cmp
}
package "src/guava" as guava {
  [Iterables, Lists, Strings, Joiner, Sets] as gv
}
package "src/emf (D1)" as emf {
  [EList family\nBasicEList, EObjectEList,\nEObjectWithInverseEList,\nEObjectContainmentWithInverseEList] as elist
  [EcoreEMap] as emap
  [BasicEObjectImpl, EcoreUtil,\nECollections] as eobj
}
package "src/graph" as graph {
  [properties\nIProperty, Property,\nMapPropertyHolder, PropertyMap] as props
  [interfaces + ElkGraphPackage\nElkNode, ElkEdge, …] as ifaces
  [impl\nElkNodeImpl, ElkEdgeImpl, …\nElkGraphFactoryImpl] as impl
  [util\nElkGraphUtil, ElkReflect,\nGraphIdentifierGenerator] as util
}
package "src/core" as core {
  [math\nKVector, KVectorChain,\nSpacing, ElkMargin, ElkPadding] as math
  [options\nPortSide, Direction,\nSizeConstraint] as opts
}
package "test/golden/refs/java" as refs {
  [graph.json] as gj
}

elist --> ll : ListIterator
emap --> hm : key hashing
eobj --> elist
impl --> elist
impl --> emap
impl --> eobj
impl --> ifaces
impl --> props
util --> impl
util --> gv
util --> ifaces
props --> hm
props --> cmp
props --> es : ElkReflect clone
math --> ll
opts --> es
core ..> graph : allowed (bundle-deps)
gj ..> impl : replayed by tests
@enduml
```

Rules: `src/java` imports nothing else; `src/guava` imports `src/java`; `src/emf` imports
`src/java` and `src/guava`; `src/graph` requires nothing in `bundle-deps.json` but may import the
three shim directories; `src/core` requires `src/graph`.
