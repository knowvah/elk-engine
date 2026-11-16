<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Topdownpacking recorder

**Agent:** java-architect (sonnet) · **Commit:** `test(T3): record topdownpacking oracle vectors` · Scratch: `$TMPDIR/alg-packing/T3/`

## Context

Mission 8c, PK1, PK3. `P/*` (`TopdownpackingLayoutProvider`, `GridElkNode`, `LeftRightTopDownNodePlacer`,
`BottomRowEqualWhitespaceEliminator`, the strategy enums). No hashed containers, no recursion, no transcendental `Math`.
`GridElkNode.put` **inserts** (`P/GridElkNode.java:73`), so row lists grow past `cols`: record row list sizes.

## Task

1. Write `tools/vectors/TopdownPackingVectors.java` and `topdownpacking-vectors.sh` (`DiscoVectors.java` shape):
   `topdownpacking.json` with groups `full`, `stops`, `throws`, `predicted` (`getPredictedGraphSize` per input), the stops and
   scenarios of PK1 (0-40 children; `hierarchicalNodeWidth`, `hierarchicalNodeAspectRatio`, `padding`, `nodeNode`; a two-level
   `topdownLayout` graph through `RecursiveGraphLayoutEngine`; the corpus input).
2. Check `uptime` first. Run detached under `nice -n 10`; two runs must be `cmp`-identical.

## Write-set

`tools/vectors/TopdownPackingVectors.java`, `tools/vectors/topdownpacking-vectors.sh`, `test/golden/refs/java/topdownpacking.json`.

## Read-set

The Java above, `tools/vectors/{DiscoVectors.java,disco-vectors.sh,vector-cache.sh}`, `decisions.md#pk1--recorders-and-row-contract`,
`#pk3--gridelknode`, `tools/melk/sources/Topdownpacking.melk`, `test/corpus/generated/topdownpacking-hierarchy-small.json`.

## Interface contract (consumed by T8)

Row `{ id, group, input, expected }`; P1 stop `{ rows, cols, cells: (id | null)[][] }` with the real row list lengths.

## Acceptance criteria

- Given a cold run, when repeated, then both outputs are `cmp`-identical.
- Given every option of `Topdownpacking.melk`, then a `full` row exercises a non-default value.
- Given an input with `n` children where `n` is not a square, then the P1 stop shows row lists longer than `cols`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
