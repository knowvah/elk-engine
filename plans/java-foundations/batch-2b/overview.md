<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2b — DoubleToString, Vectors B (collections), Guava 1

Runs in parallel with Batch 2a (disjoint write-sets). T9 is the only writer of
`tools/vectors/JavaVectors.java` across Batches 2a/2b.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T8 | `DoubleToString` (exact Javadoc definition) | typescript-pro | src/java/lang/DoubleToString.ts (+ .test.ts) | T1 | [ ] |
| T9 | Vectors B: HashMap/HashSet order, PriorityQueue scripts | java-architect | tools/vectors/JavaVectors.java, test/golden/refs/java/collections.json | T1 | [ ] |
| T10 | Guava 1: Lists, Iterables, Iterators, Strings | typescript-pro | src/guava/{Lists,Iterables,Iterators,Strings}.ts (+ .test.ts) | T2, T3 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
