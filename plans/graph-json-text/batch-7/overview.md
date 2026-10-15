<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Validation; serializer

Independent: T14 adds `validate` to `ElkGraphJsonText.ts`; T15 builds the serializer pieces without touching the entry
point (T16 wires `serialize`). Disjoint write-sets; parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T14 | `ElkGraphJsonValidator` (empty, as upstream) and `ElkGraphJsonText.validate` | typescript-pro | src/graph/json/text/validation/** (+ tests), src/graph/json/text/ElkGraphJsonText.ts (+ test) | T4, T13 | [ ] |
| T15 | Serializer: transient values, semantic and syntactic sequencers, grammar access, token writer | typescript-pro | src/graph/json/text/serializer/** (+ tests), test/architecture/exception-hierarchy.fitness.test.ts (one entry) | T5, T9, T10 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
