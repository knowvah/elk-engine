<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Guava 1: Lists, Iterables, Iterators, Strings

**Agent:** typescript-pro · **Commit:** `feat(guava): add lists, iterables, iterators and strings helpers`

## Context
ELK uses Guava heavily (355 import lines). Policy: small local helpers in `src/guava/`, never a
dependency, written from the Guava Javadoc only (M6). T3 admitted `src/guava` in the fitness test.

## Task
TDD per method. Implement exactly the methods translation-rules §4 lists for these families, plus
any overload ELK calls (grep `$ELK_SOURCE_DIR` in-scope bundles to confirm signatures).

## Write-set
`src/guava/Lists.ts`, `Iterables.ts`, `Iterators.ts`, `Strings.ts`, each with `.test.ts`.

## Read-set
- `../decisions.md#m6--srcguava`, `#m5--exceptions`
- `docs/translation-rules.md:256-288` (§4 table and semantics), `:411-424` (§6.9 laziness)
- Guava Javadoc for each method (WebFetch `https://guava.dev/releases/<ver>/api/docs/…`; use the
  Guava version `tools/oracle/run.sh` resolves from the p2 cache)

## Interface contract (consumed by T13, T14, later missions)
- `Lists`: `newArrayList(it?)` (copy), `newLinkedList`, `newArrayListWithCapacity`,
  `newArrayListWithExpectedSize` → arrays; `reverse(list)` → **live view** (reads reflect later
  source changes; writes go through, per Javadoc).
- `Iterables`: `concat` (lazy), `size`, `isEmpty`, `filter`/`transform` (lazy, re-iterable),
  `getFirst(it, default)`, `getLast`, `get(it, i)` (IndexOutOfBoundsException), `all`, `any`, `addAll`.
- `Iterators`: `filter`, `concat`, `singletonIterator`, `unmodifiableIterator`.
- `Strings`: `isNullOrEmpty`, `repeat(s, n)` (`n < 0` → `IllegalArgumentException`).
Use `Iterable<T>`/generators; no Java `Iterator` class emulation beyond what the Javadoc requires.

## Acceptance criteria
- Given `const v = Lists.reverse(a); a.push(x)`, then `v` reflects the push at its start.
- Given `Iterables.filter(src, p)` iterated twice after mutating `src`, then each pass reflects `src`.
- Given `Iterables.get(it, 5)` on 3 elements, then `IndexOutOfBoundsException`.
- Given `Strings.repeat('ab', -1)`, then `IllegalArgumentException`; `repeat('ab', 0)` → `''`.

## Quality bar
README gates; 100% coverage of new files; the T3 boundary test passes (imports only `src/java`).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No hash-ordered containers (T14) and no DoubleMath/Joiner (T13).
