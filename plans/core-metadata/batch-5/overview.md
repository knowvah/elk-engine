<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Emitter + `LabelManagementOptions`

One task. The emitter is proven end to end on the smallest real bundle (`Labels.melk`) before the
`CoreOptions` cycle (T14).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T13 | TS emitter, `melk:generate`, recording registry, generated `LabelManagementOptions.ts` | typescript-pro | tools/melk/{emit,generate,imports}.ts, package.json, src/core/labels/LabelManagementOptions.ts (generated), test/melk/{emit.test.ts,recorder.ts} | T10, T12 | [x] |

Batch done when the acceptance criteria pass and the README gates are green.
