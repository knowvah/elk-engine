<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Filters and matchers, CommentAttacher, ElkGraphAdapters, selection

The write-sets are disjoint, so all four run in parallel. T17 and T18 depend only on landed code; they sit here to
balance the batches. `NodeReferenceMatcher` calls `DistanceMatcher.distance` (T15), so it waits for batch 5 (T19).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T15 | `SizeFilter`, `TextPrefixFilter`, `AbstractNormalizedMatcher`, `DistanceMatcher`, `AlignmentMatcher` | typescript-pro | src/core/comments/{SizeFilter,TextPrefixFilter,AbstractNormalizedMatcher,AbstractNormalizedMatcherNormalizationFunction,DistanceMatcher,AlignmentMatcher}.ts (+ tests) | T9, T13 | [x] |
| T16 | `CommentAttacher`, `AggregatedMatchDecider` | typescript-pro | src/core/comments/{CommentAttacher,AggregatedMatchDecider}.ts (+ tests) | T13 | [x] |
| T17 | `ElkGraphAdapters` | typescript-pro | src/core/util/adapters/ElkGraphAdapters*.ts (+ tests) | — | [x] |
| T18 | EMF `AbstractTreeIterator` + selection iterators | typescript-pro | src/emf/common/util/{AbstractTreeIterator,TreeIterator}.ts, src/core/util/selection/{SelectionIterator,DefaultSelectionIterator}.ts (+ tests) | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
