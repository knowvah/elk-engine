<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Spore recorder

**Agent:** java-architect (opus; the `minst` and `jitter` designs need care) · **Commit:** `test(T2): record spore oracle vectors` ·
Scratch: `$TMPDIR/alg-packing/T2/`

## Context

Mission 8c, PK1, PK4, PK5. `S/*` (both providers, `ElkGraphImporter`, `graph/Graph`, `p1structure`, `p2processingorder`, `p3execution`),
landed alg.common callees `NaiveMinST`, `BowyerWatsonTriangulation`, `DepthFirstCompaction`, `ScanlineOverlapCheck`. `tools/vectors/AlgCommonVectors.java`
already records triangulation + NaiveMinST for 22 inputs; this recorder covers the spore path end to end.

## Task

1. Write `tools/vectors/SporeLayoutVectors.java` and `spore-layout-vectors.sh` (`DiscoVectors.java` shape): `spore-layout.json` with
   groups `full`, `stops`, `throws`, `minst`, `jitter` and the stops and scenarios of PK1, for both `sporeOverlap` and `sporeCompaction`.
2. Determinism guard (PK4): detect by reflection or re-run whether a row reached the `Math.random()` loop (`S/ElkGraphImporter.java:167-169`);
   such a row goes to `jitter`, whose `expected` holds invariants only (node count, final pairwise overlap = none for overlap removal,
   max displacement, whether two runs agreed).
3. `minst` group (PK5): per row the `TEdge` sequence handed to `NaiveMinST` (in set iteration order, after the scanline `addAll` where
   it applies), the tree with child order, and `orderSensitive` (re-run with the edge list reversed). Include equal-cost grids and
   regular polygons, both cost functions, MIN and MAX trees, the scanline path over ≥ 2 overlap iterations (`clear` keeps capacity).
   Mark every row whose order may depend on a treeified bin (> 8 equal hashes in one bin).
4. A 2,000-node chain row per algorithm for PK6 (`full`; if it overflows in the oracle record a `throws` row and journal it).
5. Check `uptime` first. Run detached under `nice -n 10`; two runs must be `cmp`-identical.

## Write-set

`tools/vectors/SporeLayoutVectors.java`, `tools/vectors/spore-layout-vectors.sh`, `test/golden/refs/java/spore-layout.json`.

## Read-set

The Java above, `tools/vectors/{DiscoVectors.java,disco-vectors.sh,AlgCommonVectors.java,vector-cache.sh}`,
`decisions.md#pk1--recorders-and-row-contract`, `#pk4--mathrandom-jitter`, `#pk5--hashed-containers`, `#pk6--recursion`,
`tools/melk/sources/SPOrE.melk`, `test/corpus/generated/spore{Overlap,Compaction}-graph-small.json`, `.agent-notes/java-foundations.md` (treeify).

## Interface contract (consumed by T7, T11, T13, T14)

Row `{ id, group, input, expected }`; `minst` rows `expected: { edges: [u, v][] (hex), tree, orderSensitive: boolean, treeified: boolean }`;
`jitter` rows `expected: { invariants: {...} }`; stop names listed in the launcher header and journal.

## Acceptance criteria

- Given a cold run, when repeated, then both outputs are `cmp`-identical (jitter rows included, since they hold invariants only) and the ref is under 16 MiB.
- Given every option value of PK2 for both spore algorithms, then a `full` row exercises it.
- Given the `minst` group, then ≥ 10 rows have `orderSensitive: true`, covering both algorithms and the scanline path.
- Given any `full` or `stops` row, then the determinism guard proves it did not reach the jitter loop.

## Observability / Rollback

N/A — no new observable operations. Reversible.
