<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — NodeReferenceMatcher + comment oracle replay, PropertyConstantsDelegator

The write-sets are disjoint, so both run in parallel. T19 closes R6: every `comments.json` scenario must replay.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T19 | `NodeReferenceMatcher` + `comments.json` oracle replay | typescript-pro | src/core/comments/NodeReferenceMatcher.ts (+ test), src/core/comments/CommentVectors.test.ts, test/helpers/comment-scenario-config.ts | T9, T13, T14, T15, T16 | [x] |
| T20 | `PropertyConstantsDelegator` | typescript-pro | src/core/util/PropertyConstantsDelegator.ts (+ test) | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
