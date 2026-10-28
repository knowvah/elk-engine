<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — LGraph model, options core, staged classes

One task. The LGraph model, `InternalProperties`, the graph-dependent strategy enums and the generated
`LayeredOptions` reference each other, and `LEdge`/`LGraph` call `LGraphUtil`, which uses `Spacings` (dependency
cycle 1). The executor ports them together itself (~4,400 Java lines).
The generated options' import of `LayeredLayoutProvider` (cycle 2) is held back with `PENDING_TYPES` until T7 (L7, C1).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T3  | LGraph model + `LGraphUtil`, `Spacings`, `LayeredPhases`, `IHierarchyAwareLayoutProcessor`, `InternalProperties`, 5 graph-dependent enums, 6 staged classes + fitness test, generated options | main session | see [T3](T3-lgraph-and-options-core.md#write-set) | T2 | [x] |

The batch is done when T3's acceptance criteria pass and the README gates are green (including
`npx vitest run test/melk` and the S4 byte-identity check).
