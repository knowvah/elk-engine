<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Vectors B: HashMap/HashSet order, PriorityQueue scripts

**Agent:** java-architect · **Commit:** `test(vectors): record hashmap order and priority queue jvm vectors`

## Context
`HashMap` iteration order is unspecified in the Javadoc, so `JavaHashMap` (T11) is a clean-room
model that must be proven by black-box observations (M1). `PriorityQueue` tie order is likewise
unspecified (M8). The generator only calls the JDK and records results (AD-9).

## Task
Append generator methods that write `collections.json`. Design the scripts to *discriminate*
hypotheses (bucket index, spreading, resize split order, collision bins), not just to sample.

## Write-set
`tools/vectors/JavaVectors.java` (append-only), `test/golden/refs/java/collections.json` (generated).

## Read-set
- `../decisions.md#m1--javahashmap`, `#m2--key-protocol`, `#m8--priorityqueue`, `#m4--vector-files`
- `docs/translation-rules-collections.md:66-102` (§2.1 key kinds), `:168-194` (§2.3–2.4)
- `tools/vectors/JavaVectors.java` (style; T1's appended methods)

## Interface contract (consumed by T11, T12)
`collections.json`: `{ jdk, hashMap: Script[], hashSet: Script[], priorityQueue: Script[] }`.
`Script = { name, keyKind: "string"|"integer"|"double"|"kvector"|"collider", init: {...}, steps: Step[] }`.
`Step = { op, args, result?, order }` where `order` is the full iteration order (keys, encoded per
kind; doubles as hex) **after** the step. Ops: map `put`/`remove`/`get`/`containsKey`/`clear`;
set `add`/`remove`/`contains`; constructors `new HashMap()`, `new HashMap(n)`, `new HashMap(map)`,
`new HashSet()`, `new HashSet(n)`, `new HashSet(collection)` (source order recorded);
PQ `add`, `addAll`, `poll`, `peek`, `remove(o)` (by identity: elements carry an `id`), `size`,
`isEmpty`, with `order` = `toArray()` order and comparator described by name
(`byKeyThenNothing` etc.; values chosen tie-heavy).
- `collider` keys: a small final class with a fixed `hashCode()` set per key and an `id`
  (`Comparable` and non-`Comparable` variants), ≥ 12 keys sharing one hash, inserted into maps with
  capacity ≥ 64, then removed down below 6 — to observe collision-bin order.
- Include sizes that cross every resize threshold from 0 to ≥ 1,000 entries, keys chosen so high
  hash bits differ (to observe spreading), Integer keys including negatives, Double keys including
  −0.0/0.0/NaN, KVector-style keys (`kvector`: x,y pairs hashed with the ELK formula wrapped in a
  key class).
- A randomized section (seeded, seed recorded): ≥ 200 scripts of mixed ops per key kind.

## Acceptance criteria
- Given two runs, then `collections.json` is byte-identical.
- Given a regeneration, then `lang.json`/`random.json` (and T1's files) are byte-identical.
- Given the file, then it contains collider scripts at capacity ≥ 64 with ≥ 12 same-hash keys,
  resize-crossing scripts to ≥ 1,000 entries, and PQ scripts exercising `remove(o)` on tied elements.

## Quality bar
README gates; new Java methods ≤ 30 NLOC, CCN ≤ 10. Keep the file under ~20 MB (journal its size).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Record only; no modeling here. Never edit existing generator methods or vector files.
