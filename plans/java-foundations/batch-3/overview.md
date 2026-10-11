<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — JavaHashMap, PriorityQueue, Guava 2

The two clean-room collection models (M1, M8) and the Guava helpers that need `DoubleToString`.
Disjoint write-sets; T11 is the only writer of `JavaVectors.java` in this batch (probe vectors).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T11 | `JavaHashMap` / `JavaHashSet` + `HashStrategy` | typescript-pro | src/java/util/{JavaHashMap,JavaHashSet,HashStrategy}.ts (+ .test.ts); optional tools/vectors/JavaVectors.java + test/golden/refs/java/hashmap-probes.json | T6, T7, T9 | [ ] |
| T12 | `PriorityQueue` | typescript-pro | src/java/util/PriorityQueue.ts (+ .test.ts) | T2, T9 | [ ] |
| T13 | Guava 2: DoubleMath, Joiner, Splitter, Range, Table, ImmutableMap, ImmutableSet, Sets | typescript-pro | src/guava/{DoubleMath,Joiner,Splitter,Range,Table,ImmutableMap,ImmutableSet,Sets}.ts (+ .test.ts) | T8, T10 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
