<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: `src/alg/graphviz/dot/` and what it uses

Bold: new in this mission. Grey: landed, unchanged. Orange: landed, extended (D3). Arrows are imports. No arrow enters the
bundle from outside except its tests; step 3's layouter will import `GraphvizDot` and `transform/`.

```plantuml
@startuml
skinparam componentStyle rectangle
package "src/alg/graphviz/dot (alg.graphviz.dot)" {
  [**dot/** model, DotFactory, DotSwitch, DotPackage] as model
  [**parser/** GraphvizDotLexer, GraphvizDotParser] as parser
  [**serializer/** sequencers, GraphvizDotSerializer] as ser
  [**formatting2/** GraphvizDotFormatter] as fmt
  [**services/** GraphvizDotGrammarAccess] as ga
  [**GraphvizDot** (entry point, D5)] as entry
  [**transform/** DotExporter, DotImporter, Attributes, ...] as tr
}
package "src/xtext" {
  [formatting2 + autowrap] as xfmt #orange
  [conversion, nodemodel, regionaccess] as xrt #lightgrey
}
package "landed bundles" {
  [src/graph (ElkGraph)] as graph #lightgrey
  [src/core (ElkUtil, options, KVector)] as core #lightgrey
  [src/java/util/**StringTokenizer**] as st
  [src/guava/HashBiMap] as bimap #lightgrey
}
parser --> model : builds
parser --> xrt : value converters
ser --> model : reads
ser --> ga : grammar elements
ser --> fmt : formats regions
fmt --> xfmt : AbstractFormatter2, autowrap
ser --> xrt : region access, rewriter
entry --> parser : load
entry --> ser : serialize
tr --> model : DotFactory
tr --> graph : reads / writes ElkGraph
tr --> core : ElkUtil, CoreOptions
tr --> st : attribute parsing
tr --> bimap : GRAPH_ELEMS
@enduml
```
