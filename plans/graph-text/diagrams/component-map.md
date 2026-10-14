<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — graph-text

New packages and the existing ones they depend on. Arrows are import direction; the fitness rules
(T6) enforce them. `src/xtext` never imports ELK code.

```plantuml
@startuml
skinparam componentStyle rectangle
left to right direction

package "src/graph/text (new)" {
  [ElkGraphText\nload / validate / serialize] as Entry
  [parser\nElkGraphLexer, ElkGraphParser] as Parser
  [conversion\nNumber, PropertyKey, PropertyValue] as Conv
  [naming / scoping / linking\nElkGraph* providers, ElkGraphLinker] as Link
  [validation\nElkGraphValidator, ElkGraphTextUtil] as Valid
  [serializer\nsemantic sequencer, transient values] as Seq
  [formatting2\nElkGraphFormatter] as Fmt
}

package "src/xtext (new, EPL subset)" {
  [conversion + util/Strings] as XConv
  [naming: QualifiedName] as XName
  [scoping] as XScope
  [linking: Linker] as XLink
  [validation base] as XValid
  [formatting2 subset] as XFmt
}

package "existing" {
  [src/graph (ElkGraph model)] as Graph
  [src/core (LayoutMetaDataService, CoreOptions)] as Core
  [src/core/util/internal/LayoutOptionProxy (new)] as Proxy
  [src/emf, src/java] as Base
}

Entry --> Parser : parse
Entry --> Link : link references
Entry --> Valid : validate
Entry --> Seq : serialize
Seq --> Fmt : format regions
Parser --> Conv : toValue
Seq --> Conv : toString
Conv --> XConv : extends converters
Conv --> Core : option lookup by suffix
Conv --> Proxy : unknown values
Link --> XScope : scope providers
Link --> XLink : extends Linker
Link --> XName : qualified names
Valid --> XValid : @Check dispatch
Valid --> Core : option / algorithm data
Fmt --> XFmt : extends formatter
Parser --> Graph : builds
XScope --> XName : names
XConv --> Base : shims
XLink --> Base : EObject access
@enduml
```
