<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Value converters; naming and scoping

Two independent tasks on the 4b Xtext subset. T9 needs T8's lexer (the `IDValueConverter` re-lex check takes a token
source); T10 needs only `src/xtext`. Disjoint write-sets; parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T9 | `ElkGraphJsonValueConverterService` and the `Number`, `PropertyKey`, `PropertyValue` converters | typescript-pro | src/graph/json/text/conversion/** (+ tests) | T2, T8 | [ ] |
| T10 | `ElkGraphJsonQualifiedNameProvider`, `ElkGraphJsonScopeProvider` | typescript-pro | src/graph/json/text/naming/**, src/graph/json/text/scoping/** (+ tests) | — | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
