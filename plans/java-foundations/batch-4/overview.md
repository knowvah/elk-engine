<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Guava 3 (hash-backed) + Guava vectors

Guava containers whose iteration order is hash-dependent, proven against JVM + Guava observations.
Single task.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T14 | Guava 3: Maps, HashBiMap, Multimaps + GuavaVectors | java-architect | tools/vectors/GuavaVectors.java, test/golden/refs/java/guava.json, src/guava/{Maps,HashBiMap,Multimap,HashMultimap,ArrayListMultimap,LinkedListMultimap,LinkedHashMultimap,TreeMultimap}.ts (+ .test.ts), src/guava/Sets.ts (append `newHashSet*`) | T11, T13 | [x] |

Batch done when T14's acceptance criteria pass and the README gates are green.
