<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — core-remainder

## 1. Layout harness through `LayoutConfigurator` (exit, T12)

This mirrors `TestAlgorithm.java:44-49, :134-138`.

```plantuml
@startuml
participant "test (Issue457 / goldens)" as T
participant "elkt-layout-harness" as H
participant LayoutConfigurator as LC
participant ElkUtil as U
participant RecursiveGraphLayoutEngine as E
T -> H : layoutElkt(model, algorithmId, configurator)
H -> H : ElkGraphText.load(model)
H -> LC : new LayoutConfigurator()
H -> LC : configure(ElkNode).setProperty(ALGORITHM, id)
H -> U : applyVisitors(root, configurator)
U -> LC : visit(element) for each element
LC -> LC : combine class + element options,\napply filters, copy to element
H -> H : configurator(root) (test-specific)
H -> E : layout(root, monitor)
E --> T : laid-out root (assertions unchanged)
@enduml
```

## 2. Algorithm assembly (consumed from mission 6 on)

```plantuml
@startuml
participant "algorithm provider" as P
participant AlgorithmAssembler as A
participant "ILayoutPhaseFactory (enum)" as F
participant "ILayoutPhase" as PH
participant LayoutProcessorConfiguration as C
P -> A : create(PhaseEnum)
P -> A : setPhase(phase, factory) / addProcessorConfiguration(cfg)
P -> A : build(graph)
loop each phase by ordinal
  A -> F : create() (cached per factory)
  A -> PH : getLayoutProcessorConfiguration(graph)
  PH --> A : C
end
A -> C : processorsBefore/After(phase) (Sets)
A -> A : sort each slot with EnumBasedFactoryComparator (ordinal)
A --> P : List<ILayoutProcessor>: slot0, phase1, slot1, ...
@enduml
```

## 3. Comment attachment (R6 scenarios)

```plantuml
@startuml
participant "test / CommentVectors" as T
participant CommentAttacher as CA
participant "IDataProvider.cached()" as D
participant "IMatcher[]" as M
participant AggregatedMatchDecider as AD
T -> CA : new CommentAttacher().withBoundsProvider(..)\n.addFilter(..).addMatcher(..).withAttachmentDecider(..)
T -> CA : attachComments(dataProvider)
CA -> CA : preprocess: explicit provider, filters,\nmatchers, bounds provider (in that order)
loop queue of hierarchies (sub-hierarchies if includeHierarchy)
  loop each comment of provideComments()
    CA -> CA : explicit attachment? else, if all filters\neligibleForAttachment(comment):
    CA -> D : provideTargetsFor(comment)
    CA -> M : normalized(comment, candidate),\nkeyed by matcher class
    CA -> AD : makeAttachmentDecision(results)
    AD --> CA : best target or null (identity-map order, AD-10)
  end
end
CA -> CA : cleanup (same order as preprocess)
CA -> D : attach(comment, target): explicit first,\nthen heuristic unless explicit ones disable them
CA --> T : attachments read back from the graph,\ncompared as a sorted set of id pairs
@enduml
```
