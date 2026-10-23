<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — RecursiveGraphLayoutEngine

One task: the engine ties every earlier piece together (monitors T2, `ElkUtil` T6, `TestController` T7, resolver
T9, all three providers T8/T10/T12–T13, `TopdownSizeApproximator` T14).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T16 | `RecursiveGraphLayoutEngine` + 3 of 4 `RecursiveGraphLayoutEngineTest` cases | typescript-pro (model: opus) | src/core/RecursiveGraphLayoutEngine.ts (+ test) | T2, T6, T7, T9, T13, T14 | [x] |
Batch done when the task's acceptance criteria pass and the README gates are green.
