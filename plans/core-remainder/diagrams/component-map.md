<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map — core-remainder

New components are in bold; everything else has already landed. Edges point from user to dependency.

```plantuml
@startuml
skinparam componentStyle rectangle
left to right direction

package "src/core (landed)" {
  [ElkUtil] as ElkUtil
  [LayoutMetaDataService] as LMDS
  [GraphAdapters] as GA
  [ElkRectangle / KVector] as Geo
  [CoreOptions] as CO
  [Pair] as Pair
}

package "src/core (5b)" {
  [**LayoutConfigurator**] as LC
  [**ElkSpacings**] as ES
  [**alg: AlgorithmAssembler,\nLayoutProcessorConfiguration**] as ALG
  [**AbstractRandomListAccessor**] as ARLA
  [**ElkMath (facade + 4 sections)**] as EM
  [**BezierSpline /\nCubicSplineInterpolator**] as SPL
  [**ElkGraphAdapters**] as EGA
  [**selection iterators**] as SEL
  [**comments/***] as COM
  [**PropertyConstantsDelegator**] as PCD
  [**WrappedException, DefaultFactory,\nTriple, Quadruple**] as UTIL
}

package "shims (5b)" {
  [**java/awt/geom/Rectangle2D**] as R2D
  [**java/util/regex/Pattern**] as PAT
  [**java/lang/JavaCharacter**] as CHR
  [**emf AbstractTreeIterator**] as ATI
}

[test/helpers/elkt-layout-harness] as H

H --> LC : configure ALGORITHM (exit, T12)
H --> ElkUtil : applyVisitors
LC --> LMDS : option data
ES --> LC : IPropertyHolderOptionFilter
ALG --> ARLA : slot lists
SPL --> EM : approximateBezierSegment
EM --> Geo : intersects / contains
EGA --> GA : implements
PCD --> LMDS : knownOptions
PCD --> GA : NodeAdapter
SEL --> ATI : extends
SEL --> ElkUtil
COM --> R2D : bounds
COM --> PAT : node references
PAT --> CHR : segmenting
COM --> Pair
COM --> CO : ElkGraphDataProvider
@enduml
```

The vector recorders (`tools/vectors/CoreJdkVectors.java`, `CommentVectors.java`) feed `R2D`, `PAT`, `CHR` and `COM`
through `test/golden/refs/java/{awt,regex,character,comments}.json`. They are test-time only.
