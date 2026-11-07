<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — layered-labels (mission 7f2, 2026-11-05)

## Observation: every dependency of the 7f2 classes outside the bundle is ported

- **Context**: Sizing row 7f2 from the imports of its 15 classes.
- **Finding**: Each non-`java`/Guava import resolves to a TS file; the three apparent gaps are nested types in prefixed files
  (`RectangleStripOverlapRemoverOverlapRemovalDirection`, `LNodeNodeType`, `LinearSegmentsNodePlacerLinearSegment`).
- **Impact**: No task needs to stage a class from another bundle.
- **Confidence**: High

## Observation: `InteractiveLayeredGraphVisitor` has no caller in the plugins

- **Context**: Deciding its place in 7f2 (G5).
- **Finding**: Only `Layered.melk` mentions it (option docs for `layerChoiceConstraint`/`positionChoiceConstraint`); users apply it
  manually or through `DiagramLayoutEngine` (out of scope). It implements `IGraphElementVisitor` (landed).
- **Impact**: Its rows follow the two-run protocol (layout, visit, layout).
- **Confidence**: High

## Observation: the debug JSON iterates an identity-keyed `HashMap`

- **Context**: `JsonDebugUtil.writeProperties` (`JsonDebugUtil.java:573`) over `getAllProperties()`.
- **Finding**: The JVM order is insertion order only up to 10 entries under `-XX:hashCode=2`; nodes carry more properties. The DOT
  output has no properties.
- **Impact**: G3 compares property lists as unordered maps; no Java test enables logging.
- **Confidence**: High

## Observation: ELK ships no `ILabelManager` in scope

- **Context**: `LabelManagementProcessor` runs only when `LabelManagementOptions.LABEL_MANAGER` is set
  (`GraphConfigurator.java:221`).
- **Finding**: No class in `plugins/` or `test/` implements `ILabelManager`.
- **Impact**: G6's recorder-defined manager and its TS twin.
- **Confidence**: High

## Observation: `END_LABELS` is an identity-keyed `HashMap`, read by value iteration once

- **Context**: G4.
- **Finding**: `EndLabelPreprocessor.java:110` creates it; `EndLabelPostprocessor.java:74` iterates `values()`, each `LabelCell`
  applying only its own layout; `EndLabelSorter.java:78` looks up only.
- **Impact**: Insertion order with a reversal twin.
- **Confidence**: High (by reading; the twin proves it on rows)

## Observation: the label corpus is outside ptolemy

- **Context**: G7.
- **Finding**: Ptolemy's 550 models carry node labels only; `tests/layered` has 134 label-bearing `.elkt` (4 with comment boxes),
  `tickets/layered` 38, `examples` 45.
- **Impact**: 7f's sweep never exercised the label family; G7's sweep does.
- **Confidence**: High

## Observation: `Issue445Test` runs once on the oracle

- **Context**: Java baseline at planning.
- **Finding**: `runs=1`; `plans/layered-pipeline/suite-allocation.md` lists 2.
- **Impact**: The baseline table is authoritative.
- **Confidence**: High
