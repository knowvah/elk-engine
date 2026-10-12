---
title: Java foundations
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java foundations

ELK's results depend on Java runtime behavior: 32-bit integer wrapping, `float` rounding, `HashMap`
iteration order, `Random` sequences, and number-to-text conversion. The java-foundations mission
(completed 2026-10-11) delivered the shims that reproduce this behavior, and the JVM-recorded
vectors that prove them.

Shims are implemented from the specification in the Javadoc only. No OpenJDK source is read or
copied (AD-9). Each shim is checked against vectors generated on a real JVM.

## Shims

| Area               | Location                 | Contents                                                                                                                                                                                                       |
| ------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbers and text   | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                |
| Math               | `src/java/lang/JavaMath` | `l2i` (the `(int)` of a `long`)                                                                                                                                                                                |
| Exceptions         | `src/java/lang/`         | Six exception classes                                                                                                                                                                                          |
| Collections        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                  |
| Guava replacements | `src/guava/`             | 20 files: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` and five implementations |

`Math.log10` needs no shim: the native V8 function matches all 1264 recorded rows. Guava is never a
dependency; `src/guava/` holds small local helpers.

## JVM vectors

Vectors are recorded by `tools/vectors/JavaVectors.java` (and `GuavaVectors.java` for Guava
33.3.0-jre). They are frozen: regenerating them produces byte-identical files.

| Group       | Rows or scripts                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numeric     | `l2i` 78, `Float32` 2704, double to float 72, `log10` 1264, divide by zero 40, `Int64` 4056                |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector hash 256 |
| Text        | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` mid-sequence: 4 seeds with 25 operations each                                                    |
| Collections | 1206 `HashMap`, 1172 `HashSet`, and 231 `PriorityQueue` scripts                                            |
| Guava       | 1518 scripts, 25,611 steps                                                                                 |

## Known limits

- The JVM order of `HashMap` entries whose keys have equal hash codes and are not `Comparable`
  follows object identity and cannot be reproduced. Conformance cases that depend on it need a
  known-divergence entry.
- Identity-dependent `HashMap` and `HashSet` scripts are skipped in the vectors, and
  `PriorityQueue(Collection)` scripts are skipped because ELK has no caller for them.
- `Sets.newTreeSet` returns a snapshot. A live `TreeSet` shim is needed before
  `ScanlineOverlapCheck` and `ScanlineConstraintCalculator` are ported.

The collection translation rules are on the [collections rules](/guide/collections-rules) page. The
next mission on the [roadmap](/guide/roadmap) is the property system and the ElkGraph model.
