<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — elk-json-adapter

## 1. Evidence: JVM recordings before TS code (AD-13)

```plantuml
@startuml
actor Orchestrator
participant "GsonVectors.java\n(Gson 2.11.0)" as gv
participant "GraphJsonVectors.java\n+ TransferVectors.java" as jv
participant "oracle run.sh\n(parse mode, seed 1)" as or
database "test/golden/refs/java/\ngson.json, graph-json.json,\ngraph-json-transfer.json" as vec
database "test/golden/refs/elk-parse/" as refs
participant "TS tests" as ts
Orchestrator -> gv : T1
gv -> vec : parse/write/primitive cases
Orchestrator -> jv : T3, T4
jv -> vec : import errors, export texts,\nconverter, post-layout geometry
Orchestrator -> or : T5 (4 committed goldens)
or -> refs : import→export text
ts -> vec : T6–T16 compare (byte-exact, J8)
ts -> refs : T18 round-trip (byte-exact)
@enduml
```

## 2. Import → export round trip (runtime)

```plantuml
@startuml
participant "ElkGraphJson" as api
participant "JsonReader\n(lenient)" as rd
participant "JsonImporter" as imp
participant "JsonExporter" as exp
participant "Gson.toJson" as wr
api -> rd : forGraph(text).toElk()
rd --> api : JsonObject (raw number text, J2)
api -> imp : transform(json)
imp -> imp : nodes, ports, labels, options\n(LayoutMetaDataService suffix lookup)
imp -> imp : edges + sections (JsonImporterEdges)
imp --> api : ElkNode
api -> exp : forGraph(root).toJson()\n(flags, Random seam J4)
exp --> api : JsonObject (insertion-ordered keys)
api -> wr : pretty / compact, no HTML escaping
wr --> api : text (Double.toString numbers)
@enduml
```

## 3. `transferLayout` replay (J6)

```plantuml
@startuml
participant "replay test" as t
participant "JsonImporter" as imp
participant "JsonImporterLayoutTransfer" as tr
database "graph-json-transfer.json" as v
t -> v : input, geometry, transferredText
t -> imp : transform(input)
t -> t : apply recorded geometry\n(reuse imported sections by id)
t -> imp : transferLayout(root)
imp -> tr : pass 1 nodes/ports, pass 2 edges/labels
tr --> t : mutated input JsonObject
t -> t : Gson.toJson == transferredText
@enduml
```
