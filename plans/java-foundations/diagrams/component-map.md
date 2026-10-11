<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — java-foundations

What this mission creates (bold) and how the pieces depend on each other. Arrows read
"depends on". `src/guava` may import only `src/java` (M6, T3).

```plantuml
@startuml
skinparam componentStyle rectangle
package "tools/vectors (JDK 21)" {
  [JavaVectors.java] as JV
  [**GuavaVectors.java**] as GV
}
package "test/golden/refs/java" {
  [lang.json / random.json\n(frozen)] as OLD
  [**numeric / hash / text /\nrandom-setseed / collections /\nhashmap-probes / guava .json**] as NEW
}
package "src/java/lang" {
  [Int32 / JavaMath\n(+ l2i, ArithmeticException)] as NUM
  [**Float32 / Int64**] as F
  [**JavaString / JavaInteger /\nJavaDouble / DoubleToString**] as TXT
  [**Exception classes**] as EXC
}
package "src/java/util" {
  [**HashStrategy / JavaHashMap /\nJavaHashSet**] as HM
  [**PriorityQueue**] as PQ
  [Random] as RND
}
package "src/guava" {
  [**Lists / Iterables / Iterators / Strings**] as G1
  [**DoubleMath / Joiner / Splitter /\nRange / Table / Immutable* / Sets**] as G2
  [**Maps / HashBiMap / Multimaps**] as G3
}
JV --> OLD : writes (unchanged)
JV --> NEW : writes (appended methods)
GV --> NEW : writes guava.json
NUM --> EXC : throws
TXT --> EXC : throws
HM --> TXT : hashCode
G1 --> EXC : throws
G2 --> TXT : DoubleToString
G3 --> HM : backed by
NEW ..> NUM : replayed by tests
NEW ..> HM : replayed by tests
NEW ..> PQ : replayed by tests
NEW ..> G3 : replayed by tests
OLD ..> RND : replayed by tests
@enduml
```
