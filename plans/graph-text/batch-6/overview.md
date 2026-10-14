<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Entry point `load` and the serializer

Two independent tasks with disjoint write-sets: T18 wires parser, converters, naming, scoping and linking
into `ElkGraphText.load`; T19 ports the grammar-specific semantic/syntactic sequencer. Depends on batch 5
(T19 uses the T17 scope for cross-reference text and T13 converters, T12 formatting2 sequencer stream).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T18 | `ElkGraphText.load` + runtime-module wiring | typescript-pro | src/graph/text/ElkGraphText.ts | T15, T16, T17, T13 | [x] |
| T19 | Serializer: sequencer, transient values, cross-reference text | typescript-pro | src/graph/text/serializer/** | T12, T13, T17 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
