<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — core-metadata

What this mission creates (bold edges are the `IndividualSpacings` / `LayoutMetaDataService` /
`CoreOptions` import cycle that T14 lands in one commit). `src/core` imports `src/graph`, `src/java`,
`src/guava` only (AD-8); `tools/melk` is dev-only and never imported by `src/`.

```plantuml
@startuml
skinparam componentStyle rectangle

package "tools/melk (dev only)" as melk {
  [sources/*.melk\n+ manifest (C9)] as src
  [parser\n(C5)] as parser
  [model\nids, groups, defaults,\npending types (C1)] as model
  [emit + generate\n(C6)] as emit
}
package "tools/vectors" as vec {
  [MetaDataVectors.java\nmetadata-vectors.sh] as mdv
}
package "test/golden/refs/java" as refs {
  [metadata.json\n(i) providers\n(ii) service] as mj
}
package "src/core" as core {
  [data\nLayoutOptionData, LayoutCategoryData,\nLayoutAlgorithmData, ILayoutMetaDataProvider] as data
  [data\nLayoutMetaDataService] as lmds
  [data\nDeprecatedLayoutOptionReplacer,\nLayoutDataContentAssist] as dataui
  [options\n15 enums, ITopdownSizeApproximator] as enums
  [options/CoreOptions.ts\n(generated)] as co
  [labels\nILabelManager,\nLabelManagementOptions.ts (generated)] as labels
  [util\nPair, ExclusiveBounds, InstancePool,\nIndividualSpacings, PackingMode, ElkUtil,\nIElkProgressMonitor, LoggedGraph, GraphAdapters] as util
  [validation\nGraphIssue,\nIValidatingGraphElementVisitor] as val
  [AbstractLayoutProvider,\nIGraphLayoutEngine] as alp
}
package "src/graph (mission 2)" as graph {
  [properties, ElkReflect,\nElkGraph model] as g
}

src --> parser : read
parser --> model : MelkFile AST
model --> emit : registry-call model
emit --> co : writes
emit --> labels : writes
mdv --> mj : records (JVM)
mj ..> model : compared (all 13)
mj ..> co : compared (TS registry)
co --> enums
co --> util
co --> data
data --> util
data --> alp
data --> val
val --> util
lmds --> data
lmds ==> co : new CoreOptions()
lmds ==> util : initElkReflect
util ==> lmds : IndividualSpacings
co ==> util : SPACING_INDIVIDUAL type
dataui --> lmds
core --> g
@enduml
```
