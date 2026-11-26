<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: export, (future) Graphviz run, transfer; and the evidence

The flow `GraphvizLayoutProvider.layout` runs (`GraphvizLayoutProvider.java:118-160`). This mission ports every box except the
runner and the provider (step 3 and step 4). The recorders in batch 1 capture each arrow marked with a ref.

```plantuml
@startuml
start
:ElkNode (source graph);
:DotExporter.transform\n(transData, COMMAND, HIERARCHY, ...);
note right: graphviz-dot-export.json\n(model text + source after resizeNode)
:GraphvizModel;
:GraphvizDotSerializer\n(sequencers + GraphvizDotFormatter, autowrap @255);
note right: graphviz-dot-write.json
:DOT text;
#lightgrey:Graphviz runner\n(step 3/4, not this mission);
note right: fixtures in tools/vectors/dot-graphviz-output/\n(local Graphviz, inputs only)
:DOT text with layout;
:GraphvizDotLexer + GraphvizDotParser;
note right: graphviz-dot-lexer.json\ngraphviz-dot-parse.json
:GraphvizModel (layout);
:DotExporter.transferLayout;
note right: graphviz-dot-export.json\n(ElkGraph dump after transfer)
:ElkNode with positions;
stop
@enduml
```

`DotImporter` (DOT → ElkGraph, and its own `transferLayout`) is a separate flow with no caller in either bundle's `src/`. Its
evidence is `graphviz-dot-import.json`.
