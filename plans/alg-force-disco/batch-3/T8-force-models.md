<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Force models, `ForceLayoutProvider`, replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the force models and provider` · Scratch: `$TMPDIR/alg-force-disco/T8/`

## Context

Mission 8b, FD3, FD9. `F/model/{AbstractForceModel,EadesModel,FruchtermanReingoldModel}.java`, `F/ForceLayoutProvider.java`. The random
draws (`F/model/AbstractForceModel.java` initial positions, `avoidSamePosition`, `KVector.wiggle`) must match the recorded sequence.

## Task

1. Port the three model classes whole. `EadesModel.attractive` calls `JavaMath.log`. Keep `uVector == vVector` verbatim with a comment.
2. Replace the staged body of `ForceLayoutProvider` with the Java. Keep marker and row (T10 removes them).
3. `src/alg/force/ForceVectors.test.ts`: `full`, `stops` (initialize, iteration checkpoints) and `throws` of `force.json`, each row
   through the real provider, explicit 60 s timeouts on whole-ref loops. Providers registered explicitly.
4. Journal how many `force.json` numeric rows are raw-bit identical (expect all, FD3).

## Write-set

`src/alg/force/model/**`, `src/alg/force/ForceLayoutProvider.ts`, `src/alg/force/ForceVectors.test.ts`, `test/helpers/force-replay-*.ts`.

## Read-set

The Java above, `src/core/math/KVector.ts:310`, `src/java/util/Random.ts`, T6's helpers, `decisions.md#fd3-mathlog-in-eadesmodel`, `#fd9-scope-edges-and-hand-offs`.

## Interface contract (consumed by T10)

`ForceLayoutProvider.layout`, the Java signature.

## Acceptance criteria

- Given every `force.json` row, then it replays at 1e-6, ids exact, class and first frame for throws.
- Given replay-alone coverage, then the model classes are above 90 % branches.
- Given the Eades row with `iterations=1000`, then every coordinate is within 1e-6.

## Observability / Rollback

N/A — no new observable operations. Reversible.
