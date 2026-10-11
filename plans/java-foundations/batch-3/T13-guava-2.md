<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Guava 2: DoubleMath, Joiner, Splitter, Range, Table, ImmutableMap, ImmutableSet, Sets

**Agent:** typescript-pro · **Commit:** `feat(guava): add doublemath, joiner, splitter and immutable helpers`

## Context
Second Guava slice (M6): helpers that need Java double text (`Joiner` converts with `toString`) or
exceptions, but no hash-ordered storage. Written from the Guava Javadoc only.

## Task
TDD per method. Implement exactly the methods translation-rules §4 lists for these families plus
overloads ELK calls (grep-verified).

## Write-set
`src/guava/DoubleMath.ts`, `Joiner.ts`, `Splitter.ts`, `Range.ts`, `Table.ts`, `ImmutableMap.ts`,
`ImmutableSet.ts`, `Sets.ts`, each with `.test.ts`.

## Read-set
- `../decisions.md#m6--srcguava`, `#m3--doubletostring`, `#m5--exceptions`
- `docs/translation-rules.md:256-288` (§4, incl. the DoubleMath definitions)
- `src/java/lang/DoubleToString.ts`, `src/java/lang/DoubleCompare.ts`, `src/guava/Iterables.ts`
- Guava Javadoc per class (WebFetch, version from the p2 cache)

## Interface contract (consumed by T14, missions 3+)
- `DoubleMath.fuzzyEquals(a, b, tol)`: `Math.abs(a - b) <= tol || Double.valueOf(a).equals(Double.valueOf(b))`
  (Guava Javadoc). `Double.equals` compares `doubleToLongBits`, so NaN equals NaN and +0/−0 differ
  there, but +0/−0 are still equal through `|a − b| = 0 ≤ tol`; `tol < 0` or NaN → `IllegalArgumentException`;
  `fuzzyCompare(a, b, tol)` = `fuzzyEquals ? 0 : Double.compare(a, b)`.
- `Joiner.on(sep).join(items)`: elements via Java `toString` (numbers → `DoubleToString` when the
  ELK caller passes doubles; document the element-type convention); `null` element → NPE analog per Javadoc.
- `Splitter.on(sep).split(s)`: keeps empty strings (JS `split` parity, Javadoc default).
- `Range.closed(lo, hi)` → `{ lowerEndpoint, upperEndpoint, contains }` (only what ELK calls).
- `Table`/`ArrayTable` (2-D with row/column key index maps) for `PortRestorer.java:96`.
- `ImmutableMap.of/copyOf`, `ImmutableSet.of/copyOf`: frozen, insertion-ordered copies (Javadoc).
- `Sets.intersection` (live view), `Sets.immutableEnumSet` (ordinal-ordered, frozen), plus
  `newLinkedHashSet`/`newTreeSet` (→ `Set` / sorted array per AD-10). **Not** `newHashSet` (T14).

## Acceptance criteria
- Given `fuzzyEquals(1, 1.05, 0.1)` → true; `fuzzyEquals(NaN, NaN, 0)` → true; tolerance −1 →
  `IllegalArgumentException`.
- Given `Joiner.on(',').join([1, 2.5])` with doubles, then `1.0,2.5`.
- Given `Splitter.on(',').split('a,,b')`, then `['a', '', 'b']`.
- Given `Sets.intersection(a, b)` and a later `a.add(x)` with `x ∈ b`, then the view contains `x`.

## Quality bar
README gates; 100% coverage of new files; imports only `src/java` and `src/guava`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No hash-ordered containers (`Maps.newHashMap`, `Sets.newHashSet`, Multimaps, BiMap → T14).
