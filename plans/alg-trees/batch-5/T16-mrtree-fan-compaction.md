<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — mrtree fan and compaction processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T16): port mrtree fan and compaction processors`
Scratch: `$TMPDIR/alg-trees/T16/`

## Context

Mission 8a, TR3. `M/intermediate/FanProcessor.java` (165): V4 `locFanMap` (`:123`, iterated `:135`) and `gloFanMap`/`gloDescMap`
(`:39,42`), String keys; `(int) (Math.floor(Math.log10(size)) + 1)` at `:96` (native `log10` is proven, translation rules §1.9).
`M/intermediate/CompactionProcessor.java` (340): a `TreeSet<TNode>` with a `Double.compare` comparator (`:246`), `headSet(r).last()`,
`cand` identity map (lookup only, `:250`). Both are T6 staged files.

## Task

1. Port both whole. V4 maps: `JavaHashMap` with the landed String strategy (TR3, `ad10` row). `TreeSet`: the landed
   `src/java/util/TreeSet.ts` if it exists, otherwise the `TreeMultimap`/stand-in precedent of 6a T9–T11; journal which. Boxed
   `Integer` reads (`gloFanMap.get(key) != null`) are null checks, not identity comparisons; any `==` between two boxed values is
   stop 13.
2. Tests: each processor from the stop before it to the stop after it for every T1 row that runs it (`FAN` and `DESCENDANTS`
   weightings, wide fans with more than 10 children; `compaction=true`).

## Write-set

`src/alg/mrtree/intermediate/{FanProcessor,CompactionProcessor}{,.test}.ts`.

## Read-set

The two Java files, `src/java/util/{JavaHashMap,HashStrategy}.ts`, `src/guava/TreeMultimap.ts`, T6's helpers,
`docs/translation-rules-collections.md` V4, `decisions.md` TR3.

## Interface contract (consumed by T17)

Both as `ILayoutProcessor<TGraph>`.

## Acceptance criteria

- Given every T1 row reaching `FanProcessor` or `CompactionProcessor`, when it runs on the recorded "before" state, then the "after"
  stop equals the row at 1e-6.
- Given the V4 map, then its iteration order in a test over recorded keys equals the `JavaHashMap` order (strategy proven by
  `collections.json`).

## Observability / Rollback

N/A — no new observable operations. Reversible.
