<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Disco transform, compactor, provider, replay, twin

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the disco transform, compactor and provider` · Scratch: `$TMPDIR/alg-force-disco/T9/`

## Context

Mission 8b, FD4, FD9. `D/transform/{ElkGraphComponentsProcessor,ElkGraphTransformer}.java`, `D/DisCoPolyominoCompactor.java`,
`D/DisCoLayoutProvider.java`. `ElkGraphComponentsProcessor` has static fields (keep class statics, reset in `split`) and parallel streams
(sequential in the port).

## Task

1. Port the classes whole. `DisCoLayoutProvider`'s `default` arm is a `U` row (FD9). Keep marker and row in `DisCoLayoutProvider.ts`.
2. Register `PolyominoOptions` and the named providers explicitly in the replay. `componentLayoutAlgorithm` runs through the service.
3. `src/alg/disco/DiscoVectors.test.ts`: every row of `disco.json` at the AD-4 bar. Set-derived lists are compared sorted, `dfsOrder`
   compared as recorded.
4. **Twin (FD4):** a test-only switch iterates the two extension maps in reversed order. Run every row with extensions both ways and
   journal how many reach the site and how many are order-observable (`ad10`).
5. A `Math.sin`, `cos` or `atan2` last-ulp flip is stop 14: locate it through the stops, prove it, classify it.

## Write-set

`src/alg/disco/transform/ElkGraphComponentsProcessor{,.test}.ts`, `src/alg/disco/transform/ElkGraphTransformer{,.test}.ts`,
`src/alg/disco/DisCoPolyominoCompactor{,.test}.ts`, `src/alg/disco/DisCoLayoutProvider.ts`, `src/alg/disco/DiscoVectors.test.ts`,
`test/helpers/disco-replay-*.ts`.

## Read-set

The Java above, T7's classes and helpers, `src/alg/common/polyomino/*`, `src/core/data/LayoutMetaDataService.ts`, `decisions.md#fd4-hashed-containers`,
`#fd9-scope-edges-and-hand-offs`.

## Interface contract (consumed by T11)

`DisCoLayoutProvider.layout`, the Java signature.

## Acceptance criteria

- Given every `disco.json` row, then it replays at 1e-6, ids exact, class and first frame for throws.
- Given the twin, then the journal states how many rows reach the site and how many depend on order; a row matching neither order is stop 14.
- Given `componentLayoutAlgorithm` naming an unknown id, then the layout proceeds without one, as the row records.

## Observability / Rollback

N/A — no new observable operations. Reversible.
