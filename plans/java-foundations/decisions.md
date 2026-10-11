<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — java-foundations (locked 2026-10-11)

All approved by the user during planning. They amend, never rewrite,
`plans/elk-engine-skeleton/decisions.md` (AD-1…AD-15) and `plans/conformance-corpus/decisions.md`.
AD-9 was reaffirmed: OpenJDK is GPLv2, so its source is never read or copied.

| ID | Decision |
|----|----------|
| M1 | `JavaHashMap` = clean-room model proven by vectors |
| M2 | Explicit `HashStrategy<K>` key protocol |
| M3 | `Double.toString` = exact Javadoc definition with `bigint` |
| M4 | New vector files per area; generator append-only |
| M5 | Java-shaped exception hierarchy; `ArithmeticException extends RangeError` |
| M6 | `src/guava` boundary and semantics |
| M7 | `Int64` on `bigint` |
| M8 | `PriorityQueue` = textbook binary heap proven by vectors |

## M1 — JavaHashMap

The `HashMap` Javadoc specifies only: default capacity 16, load factor 0.75, rehash when the
number of entries exceeds `loadFactor × capacity` so the table has "approximately twice the number
of buckets"; iteration costs capacity + size; "may use comparison order" for colliding
`Comparable` keys. Hash spreading, bucket index, split order on resize, and collision-bin
behavior are **unspecified**. Model them as hypotheses, test against targeted probe vectors and a
large randomized suite (T9, plus T11 probes). The model must explain every vector. **STOP after 3
rejected model revisions** and report the vectors the model cannot explain. `JavaHashSet` is backed
by `JavaHashMap` (HashSet Javadoc: "backed by a hash table (actually a HashMap instance)").

## M2 — Key protocol

`HashStrategy<K> { hash(k: K): number; equals(a: K, b: K): boolean }`, passed to the constructor.
Built-ins: `STRING` (`String.hashCode`), `INTEGER` (value), `DOUBLE` (`Double.hashCode`, `equals`
via `doubleToLongBits`), `HASHABLE` (objects with `hashCode(): number` and `equals(o): boolean`).
Reason: a JS `number` cannot tell `Integer` from `Double` hashing; duck typing would be silently wrong.

## M3 — Double.toString

Implement the Javadoc definition exactly (`Double.toString(double)`, JDK 21): R = decimals that
round to m; p = minimal length; T = length-p decimals (or length 1 *or 2* when p = 1); pick the one
closest to m, ties to even significand; format plain for −3 ≤ e < 7, else computerized scientific
(`1.0E23`, `4.9E-324`). JS `Number.prototype.toString` gives only the shortest *length* normatively
(ECMA-262 §6.1.6.1.20: the last digit "is not always uniquely determined"), so use it as a length
hint and decide digits with exact `bigint` arithmetic. `parseDouble` follows the Javadoc
`FloatValue` grammar (trim, sign, decimal or hex float, optional `f/F/d/D`, `NaN`, `Infinity`),
else `NumberFormatException` with the JVM's message.

## M4 — Vector files

New files under `test/golden/refs/java/`: `numeric.json`, `hash.json`, `text.json`,
`random-setseed.json` (T1), `collections.json` (T9), optional `hashmap-probes.json` (T11);
`guava.json` from a new `tools/vectors/GuavaVectors.java` (T14). `JavaVectors.java` is
**append-only**; `lang.json` and `random.json` must regenerate byte-identically (gate).
Encoding as today: doubles/floats as 16-hex `doubleToRawLongBits` (floats widened), `long` as a
decimal string, `int` as a JSON number; each file carries `"jdk"`.

## M5 — Exceptions

One class per file, `class X extends Parent { constructor(message?: string) }`, `name` = Java simple
name. `src/java/lang/`: `IllegalArgumentException extends Error`, `NumberFormatException extends
IllegalArgumentException`, `IndexOutOfBoundsException extends Error`,
`ArrayIndexOutOfBoundsException extends IndexOutOfBoundsException`,
`ArithmeticException extends RangeError`. `src/java/util/`: `NoSuchElementException extends Error`.
`Int32.div/rem` and `JavaMath.floorDiv/floorMod` throw `ArithmeticException('/ by zero')`; extending
`RangeError` keeps the frozen assertion `src/java/lang/JavaMath.test.ts:100` valid. No
`RuntimeException` base: no in-scope code catches it (ELK catches NumberFormat 10, IndexOutOfBounds
6, ArrayIndexOutOfBounds 4, IllegalArgument 2). Existing `Random` `RangeError` throws are unchanged.

**Amendment (2026-10-11, user decision after mission end):** `src/java/lang/UnsupportedOperationException
extends Error` is added to the list; the immutable Guava helpers (`ImmutableSet`, `ImmutableMap`,
`Sets.intersection` view) throw it instead of `TypeError`. Null-element rejections keep `TypeError`.

## M6 — src/guava

`src/guava/` may import only `src/java/` and itself; every bundle may import it (fitness rule, T3).
Written from the Guava Javadoc only (no source copying). Views stay live (`Lists.reverse`,
`Iterables.filter/transform`, `Sets.intersection`, `Multimap.get`). Hash-ordered Guava containers
(`HashMultimap`, `Maps.newHashMapWithExpectedSize`) are backed by `JavaHashMap` and proven by
`guava.json`. Scope: the full translation-rules §4 list.

## M7 — Int64

`src/java/lang/Int64.ts` on `bigint`, wrapping with `BigInt.asIntN(64)`; shifts mask the distance
to 6 bits; `>>>` via `BigInt.asUintN(64)` then `asIntN`; division by zero throws
`ArithmeticException`. Callers to come: `ElkMath.factl/binomiall`, `TwoBitGrid`.

## M8 — PriorityQueue

Javadoc: "based on a priority heap"; head is "the least element"; ties "broken arbitrarily";
iterator order unspecified. Implement a textbook array binary heap (sift-up on add, sift-down on
poll; `remove(o)` replaces with the last element and re-sifts) for exactly the methods ELK uses:
`add`/`offer`, `addAll`, `poll`, `peek`, `remove(Object)`, `size`, `isEmpty`, iteration/`toArray`
(sites: `BoxLayoutProvider.java:550`, `StressMajorization.java:143`,
`CoffmanGrahamLayerer.java:110,152`). Tie order and array order proven by `collections.json`;
STOP after 3 rejected revisions.
