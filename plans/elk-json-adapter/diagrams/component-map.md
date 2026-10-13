<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — elk-json-adapter

New components (bold borders by stereotype `new`) and the existing ones they use. Arrows are import
direction; the fitness tests enforce `src/gson → src/java` only.

```plantuml
@startuml
skinparam componentStyle rectangle
package "src/gson (new, J1)" {
  [JsonElement model] <<new>>
  [JsonReader / JsonParser] <<new>>
  [JsonWriter / Gson] <<new>>
}
package "src/graph/json (new)" {
  [ElkGraphJson] <<new>>
  [JsonImporter + Edges + LayoutTransfer] <<new>>
  [JsonExporter] <<new>>
  [JsonAdapter] <<new>>
  [JsonMetaDataConverter] <<new>>
}
package "src/core (mission 3)" {
  [LayoutMetaDataService]
  [CoreOptions]
  [IndividualSpacings]
  [Maybe] <<new>>
}
package "src/graph (mission 2)" {
  [ElkGraph model + ElkGraphUtil]
}
package "src/java, src/guava" {
  [JavaDouble / DoubleToString / Random]
  [HashBiMap / HashMultimap / Splitter]
}
[JsonReader / JsonParser] --> [JsonElement model] : builds
[JsonWriter / Gson] --> [JsonElement model] : serialises
[JsonElement model] --> [JavaDouble / DoubleToString / Random] : number text
[ElkGraphJson] --> [JsonReader / JsonParser] : toElk()
[ElkGraphJson] --> [JsonWriter / Gson] : toJson()
[ElkGraphJson] --> [JsonImporter + Edges + LayoutTransfer] : transform
[ElkGraphJson] --> [JsonExporter] : export
[ElkGraphJson] --> [Maybe] : rememberImporter
[JsonImporter + Edges + LayoutTransfer] --> [JsonAdapter] : extension calls
[JsonExporter] --> [JsonAdapter] : extension calls
[JsonMetaDataConverter] --> [JsonAdapter] : static extension
[JsonImporter + Edges + LayoutTransfer] --> [ElkGraph model + ElkGraphUtil] : creates
[JsonImporter + Edges + LayoutTransfer] --> [LayoutMetaDataService] : option lookup
[JsonImporter + Edges + LayoutTransfer] --> [HashBiMap / HashMultimap / Splitter] : id maps
[JsonExporter] --> [CoreOptions] : SPACING_INDIVIDUAL, JUNCTION_POINTS
[JsonExporter] --> [IndividualSpacings] : individualSpacings
[JsonExporter] --> [JavaDouble / DoubleToString / Random] : id-collision Random (J4)
@enduml
```
