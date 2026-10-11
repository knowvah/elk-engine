<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Guava 3: Maps, HashBiMap, Multimaps + GuavaVectors

**Agent:** java-architect · **Commit:** `feat(guava): add hash-backed maps, bimap and multimaps`

## Context
Guava's hash-ordered containers (`Maps.newHashMap`, `Maps.newHashMapWithExpectedSize`,
`Sets.newHashSet`, `HashMultimap` — 12 uses) iterate in hash order whose capacity rules come from
Guava; `HashBiMap` and `Linked*Multimap` are insertion-ordered per the Guava Javadoc. A second,
Guava-aware vector generator records the JVM+Guava behavior (Guava Javadoc only; AD-9 discipline).

## Task
1. Create `tools/vectors/GuavaVectors.java` (same style/encoding as `JavaVectors.java`; header lists
   the Guava Javadoc pages; run line uses the Guava jar `tools/oracle/run.sh` resolves:
   `java -cp <guava.jar>:<failureaccess.jar> tools/vectors/GuavaVectors.java test/golden/refs/java`).
   Record step-by-step iteration orders for each container below, String/Integer/KVector-style keys,
   with puts, removes, resizes, `newHashMapWithExpectedSize(n)` for n = 0…100.
2. TDD: replay tests first, then implement on top of `JavaHashMap`/`JavaHashSet` (T11) and `Map`.

## Write-set
`tools/vectors/GuavaVectors.java`, `test/golden/refs/java/guava.json`,
`src/guava/{Maps,HashBiMap,Multimap,HashMultimap,ArrayListMultimap,LinkedListMultimap,LinkedHashMultimap,TreeMultimap}.ts`
(+ `.test.ts` each), `src/guava/Sets.ts` and `Sets.test.ts` (append `newHashSet`/`newHashSetWithExpectedSize` only).

## Read-set
- `../decisions.md#m6--srcguava`, `#m1--javahashmap`, `#m2--key-protocol`
- `docs/translation-rules.md:256-288` (§4), `docs/translation-rules-collections.md:168-188` (§2.3)
- `src/java/util/{JavaHashMap,JavaHashSet,HashStrategy}.ts`, `src/guava/Sets.ts`
- `tools/oracle/run.sh:14-60` (how the Guava jar is located), `tools/vectors/JavaVectors.java:1-80`
- Guava Javadoc for each class (WebFetch; version from the p2 cache)

## Interface contract (consumed by missions 2+)
- `Maps.newHashMap(strategy)`, `newHashMapWithExpectedSize(strategy, n)`, `newLinkedHashMap()`,
  `newEnumMap` → ordinal structure per AD-10 if ELK calls it.
- `Sets.newHashSet(strategy, items?)`, `newHashSetWithExpectedSize(strategy, n)`.
- `HashBiMap<K,V>`: `put` (duplicate value → `IllegalArgumentException`), `forcePut`, `inverse()`
  (live), `get`, iteration order per Javadoc/vectors.
- `Multimap<K,V>` interface: `get(k)` live never-null view, `put`, `remove`, `removeAll`,
  `containsKey`, `keySet`, `values`, `entries`, `size`; implementations per Guava Javadoc.

## Acceptance criteria
- Given two runs of `GuavaVectors.java`, then `guava.json` is byte-identical, and `lang.json` etc.
  are untouched.
- Given every `guava.json` script, when replayed, then iteration orders and results match after
  every step.
- Given `HashBiMap.put(k2, v1)` where `v1` is already bound, then `IllegalArgumentException`.
- Given `multimap.get(k)` captured before `put(k, v)`, then the view contains `v`.

## Quality bar
README gates (incl. lizard on the new Java file); 100% coverage of new TS files.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Guava source is never read or copied. No changes to `JavaHashMap` (if a Guava order cannot be
reproduced with it, STOP 6/1 — do not patch T11's model here).
