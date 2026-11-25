<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10: `DotExporter` and the small transform classes

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `feat(graphviz-dot): port dotexporter and the
transform types`.

## Context

`DotExporter.java` (982 lines) has `transform`, `transferLayout`, the node, edge and label transformations, attribute helpers
(`createAttribute`, `createString` and others), id generation, and the `pos`/`bb`/spline parsing in `transferLayout`. It
uses `Attributes` (string constants), `Command` (enum: `INVALID`, `DOT`, `NEATO`, `TWOPI`, `FDP`, `CIRCO`, in that order, with `valueOf`),
`NeatoModel`, `OverlapMode` (enums with literals), and `IDotTransformationData`/`DotTransformationData` (a property holder
with source and target graphs). `LayoutDotExporter` (step 3) subclasses it, so keep `protected` members overridable.

## Write-set

`src/alg/graphviz/dot/transform/DotExporter.ts` (split along method boundaries if the 500-line hook requires, AD-7 names),
`Attributes.ts`, `Command.ts`, `NeatoModel.ts`, `OverlapMode.ts`, `IDotTransformationData.ts`, `DotTransformationData.ts`
(the orchestrator's early copy; see the batch overview), and colocated tests.

## Read-set

`transform/{DotExporter,Attributes,Command,NeatoModel,OverlapMode,IDotTransformationData,DotTransformationData}.java`;
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.graphviz.layouter/src/.../LayoutDotExporter.java` (overrides to keep possible:
read only); `src/core/util/ElkUtil*.ts`; `src/guava/HashBiMap.ts`; `src/java/util/StringTokenizer.ts`;
`src/java/lang/{DoubleToString,JavaDouble,Float32}.ts`; `graphviz-dot-export.json`; T8's serializer.

## Steps

1. Replay tests first. For every export row: transform the scenario under the row's properties, serialize unformatted
   through T8's `GraphvizDotSerializer`, compare the text byte for byte, and compare the source graph dump after transform.
   For every `transferLayout` row: parse the fixture with T7's parser, transfer, and compare the ElkGraph dump (AD-4) or the
   exception.
2. Port every method and branch. `DPI` is a Java `float` (`72.0f`) widened in double arithmetic: keep the `Float32` value.
   `Double.toString` goes through the shim. `HashBiMap` is the landed one. `USE_SPLINES` is `protected static`; expose it as
   the Java does to subclasses (a static on the class) for step 3.
3. Unit tests for `Command.valueOf` (including an invalid name, which the Java throws `IllegalArgumentException` for),
   `Attributes` constants, and the enums.

## Acceptance criteria

- Given every `transform` row of `graphviz-dot-export.json`, when replayed, then the unformatted DOT text is byte-identical,
  and the source graph after transform matches (AD-4).
- Given every `transferLayout` row, when replayed, then the ElkGraph dump matches within 1e-6, or the same exception class
  and message are thrown.
- Given `Command.valueOf('X')`, when called, then it throws the `IllegalArgumentException` shim with Java's message for enum
  `valueOf`, if a vector records it. Otherwise the test asserts only the class.

**Observability:** N/A. **Rollback:** reversible (new files).
