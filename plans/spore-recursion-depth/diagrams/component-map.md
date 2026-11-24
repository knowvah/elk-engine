<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: the six walks and their callers

Grey: converted by PK6 (no change here). Bold: converted by this mission. Dashed: debug mode only, stays verbatim (D2).

```plantuml
@startuml
skinparam componentStyle rectangle
package "alg.spore" {
  [MinSTPhase.convert] as convert
  [MaxSTPhase.process] as maxst
  [**MinSTPhase.addNode**] as addNode
  [GrowTreePhase.growAt] as growAt #lightgrey
  [GrowTreePhase.debugOut] as gdebug
  [**GrowTreePhase.drawTree**] as gdraw
  [ShrinkTreeCompactionPhase.process] as shrink
  [ShrinkTreeCompactionPhase.draw] as sdraw
}
package "alg.common spore" {
  [DepthFirstCompaction.compactTree] as compactTree #lightgrey
  [DepthFirstCompaction.removeUnderlap] as removeUnderlap
  [**getMinUnderlap**] as gmu
  [**minUnderlapWithSubtree**] as mus
  [**translateSubtree**] as ts
  [DepthFirstCompaction.debugOut] as ddebug
  [**DepthFirstCompaction.drawTree**] as ddraw
}
maxst --> convert : inherits
convert --> addNode : root tree
growAt --> gdebug : per child
gdebug --> gdraw : whole tree
shrink --> compactTree : compact()
shrink ..> sdraw : debugMode only
compactTree --> removeUnderlap : per node
removeUnderlap --> gmu : per child, whole tree
gmu --> mus : per node, child subtree
removeUnderlap --> ts : per child subtree
removeUnderlap --> ddebug : per child
ddebug --> ddraw : whole tree
@enduml
```
