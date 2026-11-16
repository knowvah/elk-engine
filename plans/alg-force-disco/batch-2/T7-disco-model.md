<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Disco graph, polyomino, `TwoBitGridTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the disco graph and polyomino` · Scratch: `$TMPDIR/alg-force-disco/T7/`

## Context

Mission 8b, FD4, FD8. `D/graph/*`, `D/structures/DCPolyomino.java`, `D/ICompactor.java`, `D/transform/IGraphTransformer.java`. The
roadmap note says `TwoBitGridTest` treats words as `bigint`: that concerns the landed `TwoBitGrid`, and the Java suite only uses its
public API.

## Task

1. Port the classes whole. `DCComponent.shapes` and `DCGraph.components` are `Set`s (FD4).
2. Port `DT/TwoBitGridTest.java` to `src/alg/disco/TwoBitGridTest.test.ts` whole, asserts verbatim.
3. `test/helpers/disco-replay-{rows,dump,run}.ts`, the `vertiflex-replay-*` shape; `DCPolyomino` against every `polys` stop.

## Write-set

`src/alg/disco/graph/**`, `src/alg/disco/structures/**`, `src/alg/disco/ICompactor.ts`, `src/alg/disco/transform/IGraphTransformer.ts`,
`src/alg/disco/TwoBitGridTest.test.ts`, `test/helpers/disco-replay-*.ts`.

## Read-set

The Java above, `DT/TwoBitGridTest.java`, `src/alg/common/polyomino/structures/{Polyomino,TwoBitGrid}.ts`, `test/helpers/vertiflex-replay-*.ts`,
`decisions.md#fd4-hashed-containers`.

## Interface contract (consumed by T9)

`DCGraph`, `DCComponent`, `DCElement`, `DCExtension`, `DCDirection`, `DCPolyomino`, the replay helpers, under Java signatures.

## Acceptance criteria

- Given `TwoBitGridTest`, then its 3 tests pass with the Java's assertions.
- Given every `polys` stop, when `DCPolyomino` is built from the recorded component, then its grid equals the row.
- Given `DCPolyomino`'s `computeLowResDimension` and cast sites, then `(int)` uses the saturating `d2i` shim.

## Observability / Rollback

N/A — no new observable operations. Reversible.
