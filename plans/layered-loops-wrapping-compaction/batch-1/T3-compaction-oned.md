<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — `compaction/oned` and `compaction/oned/algs` + `CompactionTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T3): port the layered one-dimensional compactor`
Scratch: `$TMPDIR/7g/T3/`.

## Context

W1, W2, W6, W8. `J/compaction/oned/{CGraph,CGroup,CNode,CompareFuzzy,ICGraphTransformer,ISpacingsHandler,OneDimensionalCompactor,Quadruplet}.java`
(1,153) and `J/compaction/oned/algs/{ICompactionAlgorithm,IConstraintCalculationAlgorithm,LongestPathCompaction,QuadraticConstraintCalculation,ScanlineConstraintCalculator}.java`
(544). These are **not** the landed `src/alg/common/compaction/oned/**` classes (W2: `diff` at the pin differs by 31–269 lines
per file); port the layered copies as their own files and import nothing from the common copies unless the layered Java does.

## Task

1. Port `JT/compaction/CompactionTest.java` (16 runs) **first** to `src/alg/layered/compaction/CompactionTest.test.ts`, with the
   Java's own literals; it fails until the classes exist.
2. Port the 13 classes under `src/alg/layered/compaction/oned/**` (one class per file, `@see` per symbol). `CGroup.incomingConstraints`
   (`Sets.newHashSet`, `CGroup.java:68`) and `OneDimensionalCompactor`'s `incMap` (`:516`): one journal row each (W6) with how they
   are read; iterated identity sets → insertion order.
3. Colocated unit tests only where the Java suite leaves a branch untested and a literal can come from the Java (L4); remaining
   branches are T18's coverage map.

## Write-set

`src/alg/layered/compaction/oned/**`, `src/alg/layered/compaction/CompactionTest.test.ts`.

## Read-set

The 13 Java files, `JT/compaction/CompactionTest.java`, `src/alg/common/compaction/oned/*.ts` (idioms only), `src/guava/Sets.ts`,
`docs/translation-rules.md`, `decisions.md` W2, W6, W8, W14.

## Acceptance criteria

- Given `CompactionTest`, when run, then its 16 cases pass with the Java's assertions unchanged.
- Given every hashed container of the package, when audited, then the journal holds one `ad10` row each.
- Given `npm run complexity`, when run, then no function exceeds the limits (split at Java boundaries, sections behind a facade).

## Observability / Rollback

N/A — no new observable operations. Reversible.
