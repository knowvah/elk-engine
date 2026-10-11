<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — JavaHashMap / JavaHashSet

**Agent:** typescript-pro · **Commit:** `feat(java): add clean-room java hashmap with jvm iteration order`

## Context
8 iterated ELK containers are value-hashed (IProperty/String ids, `LayoutAlgorithmData`, KVector-
derived `TEdge`/`TTriangle`); their iteration order is observable, e.g. spore `NaiveMinST` tie order
(`alg.common/.../NaiveMinST.java:53-59`). The `HashMap` Javadoc does not specify order; OpenJDK
source is off-limits (AD-9, GPLv2). Build a clean-room model and prove it on `collections.json` (T9).

## Task
1. Write the vector-replay tests first (`collections.json` `hashMap` + `hashSet` scripts, every step).
2. Implement from the Javadoc facts in M1, deciding each unspecified behavior by hypothesis +
   evidence. Record every hypothesis, its test against the vectors, and the verdict in the
   decision journal (one row per model revision).
3. If a hypothesis needs a more discriminating observation, append probe generators to
   `JavaVectors.java` writing `hashmap-probes.json` (new rows only) and replay them too.
4. Revision budget: 3 rejected model revisions → STOP 6 with the unexplained vectors.

## Write-set
`src/java/util/HashStrategy.ts`, `JavaHashMap.ts`, `JavaHashSet.ts` (+ `.test.ts` each);
optionally `tools/vectors/JavaVectors.java` (append) and `test/golden/refs/java/hashmap-probes.json`.

## Read-set
- `../decisions.md#m1--javahashmap`, `#m2--key-protocol`, `#m4--vector-files`
- `docs/translation-rules-collections.md:66-102` (§2.1), `:168-194` (§2.3–2.4)
- HashMap / HashSet Javadoc (WebFetch, JDK 21)
- `src/java/lang/{JavaString,JavaInteger,JavaDouble}.ts` (hashes), `src/java/lang/Int32.ts`
- `test/golden/refs/java/collections.json` (structure; sample scripts)

## Interface contract (consumed by T14, mission 2 `MapPropertyHolder`, mission 6 spore utils)
```ts
interface HashStrategy<K> { hash(k: K): number; equals(a: K, b: K): boolean }
const STRING, INTEGER, DOUBLE: HashStrategy<…>;  // per M2
function hashable<K extends { hashCode(): number; equals(o: unknown): boolean }>(): HashStrategy<K>;
class JavaHashMap<K, V> implements Iterable<[K, V]> {
  constructor(strategy: HashStrategy<K>, initialCapacity?: number);
  static copyOf<K, V>(strategy: HashStrategy<K>, source: Iterable<[K, V]>): JavaHashMap<K, V>; // new HashMap(map)
  get(k): V | undefined; put(k, v): V | undefined; remove(k): V | undefined;
  containsKey(k): boolean; size: number; isEmpty(): boolean; clear(): void;
  keys(): Iterable<K>; values(): Iterable<V>; entries(): Iterable<[K, V]>;
}
class JavaHashSet<E> implements Iterable<E> { constructor(strategy, initialCapacity?);
  static copyOf(strategy, source: Iterable<E>); add(e): boolean; remove(e): boolean;
  contains(e): boolean; size: number; isEmpty(): boolean; clear(): void; }
```
`undefined` stands for Java `null` returns. Iteration order must equal the JVM's after every op.

## Acceptance criteria
- Given every `hashMap`/`hashSet` script in `collections.json` (and `hashmap-probes.json` if
  created), when replayed, then the iteration order and op results match after every step.
- Given the collider scripts (≥ 12 same-hash keys at capacity ≥ 64), then order matches.
- Given a model revision rejected by vectors, then a journal row records hypothesis, failing script,
  and verdict; at the 3rd rejection, STOP.
- Given the randomized scripts, then the suite runs in < 5 s.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10. Document the model (bucket index,
spreading, resize split, collision-bin rules) in the file's doc comment as **observed behavior**,
citing vector script names — never as "how OpenJDK does it".

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No LinkedHash/Enum containers (plain `Map`/`Set` per AD-10). No Guava (T14).
