<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — ANTE (acyclic graphs); full replay; unseeded invariants

**Agent:** typescript-pro · **Commit:** `feat(T14): port the acyclic graph generator and finish replay`

## Context
`generateANTEGraph` `:784-918` (several `float r = random.nextFloat()` draws; `Collections.sort(edgeIn[act], new
TailComparator())` / `HeadComparator` at `:882-883` — Java's sort is a stable merge sort, `Array.prototype.sort` is
stable too), the nested static class `HierarchyEdge` `:923`, `compareId` `:1003`, `HeadComparator` `:1010`,
`TailComparator` `:1022`. Nested Java classes become sibling files or file-local classes (translation-rules §6.4).

## Task
1. Replace the placeholder in `RandomGraphGeneratorAnte.ts` with `generateANTEGraph`, `compareId` and the two
   comparators; `HierarchyEdge.ts` for the nested class (fields and methods as Java).
2. Remove the replay filter: every `seeded` row replays exactly.
3. Replay every `unseeded` row: compute the same invariants from the TS output (counts per level, edges, ports,
   labels, root children) and compare exactly; label text is never compared.
4. Corpus test: assert the list equals the directory listing of `test/corpus/generated/*.elkr` (9/9).

## Write-set
`src/core/debug/grandom/generators/RandomGraphGeneratorAnte.ts` (+ test),
`src/core/debug/grandom/generators/HierarchyEdge.ts` (+ test),
`src/core/debug/grandom/generators/RandomGraphGenerator.replay.test.ts`, `src/core/debug/grandom/GRandomCorpus.test.ts`.

## Read-set
`RandomGraphGenerator.java:784-1038`, T11–T13 files, `docs/translation-rules.md` §2, §6.4.

## Interface contracts (outputs)
The finished generator; consumed by T15 (docs).

## Acceptance criteria
- Given every seeded row, when replayed, then every export equals the recorded string exactly; the generate replay
  file runs in < 10 s (stop 12).
- Given every unseeded row, when replayed, then the invariants match.
- Given the nine corpus inputs, when regenerated, then all nine equal their `.json` byte for byte.
- Given `grep -rn GRANDOM_PLACEHOLDER src/`, when run, then empty.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
