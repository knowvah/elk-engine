<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — PriorityQueue

**Agent:** typescript-pro · **Commit:** `feat(java): add priority queue with jvm tie order`

## Context
Four ELK sites use `java.util.PriorityQueue` with tie-heavy comparators: `BoxLayoutProvider.java:550`
(area ties; `add`, `addAll`, `peek`, `poll`, `isEmpty`), `StressMajorization.java:143` (distance
ties; `add`, `poll`, `remove(Object)` decrease-key, `size`, `isEmpty`), `CoffmanGrahamLayerer.java:110,152`
(`add`, `poll`, `isEmpty`). Which tied element `poll` returns is observable. Javadoc: "based on a
priority heap", ties "broken arbitrarily" (M8).

## Task
TDD: replay every `collections.json` `priorityQueue` script first; then implement a textbook array
binary heap for exactly the methods above (+ iteration/`toArray` for the array-order rows).
Hypotheses and revisions are journaled as in T11; 3 rejected revisions → STOP 6.

## Write-set
`src/java/util/PriorityQueue.ts`, `src/java/util/PriorityQueue.test.ts`.

## Read-set
- `../decisions.md#m8--priorityqueue`, `#m5--exceptions`
- `docs/translation-rules-collections.md:168-188` (§2.3 PriorityQueue row)
- PriorityQueue Javadoc (WebFetch, JDK 21)
- `test/golden/refs/java/collections.json` (`priorityQueue` scripts)

## Interface contract (consumed by missions 5, 7b, 8b)
```ts
class PriorityQueue<E> implements Iterable<E> {
  constructor(comparator: (a: E, b: E) => number);
  add(e: E): boolean; offer(e: E): boolean; addAll(items: Iterable<E>): boolean;
  poll(): E | undefined; peek(): E | undefined; remove(o: E): boolean; // identity/equals per Javadoc
  size(): number; isEmpty(): boolean; toArray(): E[]; [Symbol.iterator](): Iterator<E>;
}
```

## Acceptance criteria
- Given every `priorityQueue` script, when replayed, then each op result and the `toArray` order
  after each step match.
- Given `remove(o)` on a tied element in the middle of the heap, then subsequent `poll` order matches.
- Given `poll()` on an empty queue, then `undefined` (Java `null`).

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10. Doc comment describes the observed
behavior with vector script names.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other `Queue` types; no methods ELK does not call.
