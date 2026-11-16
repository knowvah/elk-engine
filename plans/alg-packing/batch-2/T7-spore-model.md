<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Spore graph, importer and phases

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the spore graph, importer and phases` · Scratch: `$TMPDIR/alg-packing/T7/`

## Context

Mission 8c, PK4, PK5, PK6. `S/graph/Graph.java`, `S/IGraphImporter.java`, `S/ElkGraphImporter.java`, `S/SPOrEPhases.java`,
`S/p1structure/DelaunayTriangulationPhase.java`, `S/p2processingorder/{MinSTPhase,MaxSTPhase}.java`,
`S/p3execution/{GrowTreePhase,ShrinkTreeCompactionPhase}.java`. Every alg.common callee is landed. `nodeMap` and `MinSTPhase`'s map are
value-hashed (`KVector`): `JavaHashMap` with `NaiveMinST.ts:18`'s strategy. `Graph.tEdges` is a `JavaHashSet<TEdge>`; the triangulation
phase `addAll`s into an existing set. `MaxSTPhase` roots on `.vertex`, `MinSTPhase` on `.originalVertex` (keep). Jitter: `Math.random()`
verbatim (PK4). `growAt`, `addNode` stay recursive (PK6, T14 probes).

## Task

1. Port the classes whole; enable the enum `create()` bodies T5 staged for these phases and remove their rows.
2. `test/helpers/spore-replay-{rows,dump,elk}.ts`: rebuild the import and per-phase state from `spore-layout.json` stop rows.
3. Replay every `stops` row through the importer and phases, and every `minst` row through `MinSTPhase`/`MaxSTPhase` +
   `NaiveMinST` (edge sequence, tree with child order); assert `orderSensitive` rows match in the recorded order.
4. Replay-alone coverage over `src/alg/spore` for these files, journaled (7a X4).

## Write-set

`src/alg/spore/{graph/**,IGraphImporter.ts,ElkGraphImporter.ts,ElkGraphImporter.test.ts,SPOrEPhases.ts,p1structure/**,p2processingorder/**,p3execution/**}`,
the enum files T5 staged for these phases, `test/architecture/staged-classes.json` (their rows only), `test/helpers/spore-replay-*.ts`.

## Read-set

The Java above, `src/alg/common/{NaiveMinST,BowyerWatsonTriangulation,TEdge,Tree}.ts`, `src/alg/common/spore/*`, `src/alg/common/utils/{Utils,SVGImage}.ts`,
`src/java/util/{JavaHashMap,JavaHashSet,HashStrategy}.ts`, `test/helpers/disco-replay-*.ts`, `src/alg/common/TriangulationVectors.test.ts`,
`decisions.md#pk4--mathrandom-jitter`, `#pk5--hashed-containers`.

## Interface contract (consumed by T11, T14)

`Graph`, `ElkGraphImporter` (`importGraph`, `updateGraph`, `applyPositions`), the phases under Java signatures; the replay helpers.

## Acceptance criteria

- Given every `minst` row, when replayed, then the edge sequence and tree child order equal the row (both cost functions, MIN and MAX).
- Given the scanline path rows, then `clear()` keeps the set's capacity and the `addAll` order equals the recorded sequence.
- Given two nodes ending at identical centres in `updateGraph`, then the map collapse matches the Java (a row or a `U` with the line).
- Given a stop row, then every recorded field equals the port's dump at the AD-4 bar.

## Observability / Rollback

N/A — no new observable operations. Reversible.
