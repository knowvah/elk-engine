<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Java shims: IllegalStateException, ListIterator, LinkedList

**Agent:** typescript-pro · **Commit:** `feat(java): add linkedlist, listiterator and illegalstateexception shims`

## Context
`KVectorChain extends LinkedList<KVector>` (D8) and the EMF `EList.listIterator()` (D2) both need
a Java-shaped bidirectional cursor; `Property.getDefault` throws `IllegalStateException` (D10, M5
amendment). Shims are written from the JDK 21 Javadoc only (AD-9) and are deterministic by
specification, so no JVM vector is needed.

## Task
TDD (red run shown before implementing). Create:
1. `src/java/lang/IllegalStateException.ts` — per M5 (`extends Error`, `name` = Java simple name).
2. `src/java/util/ListIterator.ts` — the `ListIterator<E>` interface plus an exported array-backed
   cursor class usable by any array-backed list (constructor takes the backing array and a start
   index; `remove`/`set`/`add` mutate the array; `IllegalStateException` when `remove`/`set` is
   called without a preceding `next`/`previous`, `NoSuchElementException` at the ends).
3. `src/java/util/LinkedList.ts` — `LinkedList<E>` (array-backed is fine; only the API is Java's).

## Write-set
`src/java/lang/IllegalStateException.ts`, `src/java/util/ListIterator.ts`,
`src/java/util/LinkedList.ts`, and one colocated `.test.ts` per file.

## Read-set
- `../decisions.md#d8--linkedlist`, `#d10--divergences-accepted-up-front`
- `plans/java-foundations/decisions.md#m5--exceptions` (class shape)
- `src/java/lang/IllegalArgumentException.ts` (style), `src/java/util/NoSuchElementException.ts`
- `src/guava/Lists.ts:1-60` (how list helpers are written here)
- JDK 21 Javadoc for `java.util.LinkedList`, `java.util.ListIterator` (WebFetch)

## Interface contract (consumed by T5, T6)
```ts
export interface ListIterator<E> { hasNext(): boolean; next(): E; hasPrevious(): boolean;
  previous(): E; nextIndex(): number; previousIndex(): number; remove(): void; set(e: E): void;
  add(e: E): void }
export class ArrayListIterator<E> implements ListIterator<E> { constructor(array: E[], index?: number) }
export class LinkedList<E> implements Iterable<E> {
  constructor(elements?: Iterable<E>);
  add(e: E): boolean; addAt(index: number, e: E): void; addAll(c: Iterable<E>): boolean;
  addAllAt(index: number, c: Iterable<E>): boolean; addFirst(e: E): void; addLast(e: E): void;
  getFirst(): E; getLast(): E; removeFirst(): E; removeLast(): E;   // NoSuchElementException when empty
  get(i: number): E; set(i: number, e: E): E; removeAt(i: number): E; remove(e: E): boolean;
  clear(): void; size(): number; isEmpty(): boolean; contains(e: E): boolean; indexOf(e: E): number;
  iterator(): Iterator<E>; listIterator(index?: number): ListIterator<E>; toArray(): E[];
  [Symbol.iterator](): Iterator<E>;
}
```
Java overloads `add(int, E)` / `remove(int)` are suffixed (`addAt`, `removeAt`,
translation-rules §6.5); `remove(e)` compares with `===` (Java `equals` is identity for the
elements ELK stores). Index errors throw `IndexOutOfBoundsException` with Java's message
`Index: i, Size: n`.

## Acceptance criteria
- Given an empty `LinkedList`, when `getFirst()`, then `NoSuchElementException` is thrown.
- Given `[a,b,c]` and `listIterator(3)`, when `previous()` twice, then `c` then `b`, and
  `nextIndex()` is 1.
- Given `listIterator()` at `[a,b]`, when `next()` then `set(x)` then `add(y)`, then the list is
  `[x,y,b]` and `previous()` returns `y`.
- Given `new IllegalStateException('m')`, then `instanceof Error`, `name === 'IllegalStateException'`,
  `message === 'm'`.
- Given `addAllAt(1, [x,y])` on `[a,b]`, then `[a,x,y,b]`; `removeAt(5)` throws
  `IndexOutOfBoundsException('Index: 5, Size: 4')`.

## Quality bar
README gates (agent: own tests + typecheck + format:check). 100% coverage of the new files;
functions ≤ 30 NLOC, CCN ≤ 10. `@see` the Javadoc URL in each file header.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not touch `src/guava/Lists.ts` or existing shims. No `Deque` methods beyond
`addFirst/addLast/getFirst/getLast/removeFirst/removeLast` (no in-scope caller, YAGNI).
