<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Validator and facade; `ConfigurationParser`

Disjoint write-sets; T9 and T10 run in parallel. Depends on batch 3.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T9 | `GRandomValidator` + `GRandomText` facade; validate replay | typescript-pro | src/core/debug/grandom/validation/GRandomValidator.ts (+ test), src/core/debug/grandom/GRandomText.ts (+ tests) | T2, T5, T8 | [ ] |
| T10 | `ConfigurationParser`; options replay | typescript-pro | src/core/debug/grandom/generators/ConfigurationParser.ts (+ tests) | T3, T5, T7 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
