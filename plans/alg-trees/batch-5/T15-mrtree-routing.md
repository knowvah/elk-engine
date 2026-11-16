<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — mrtree edge routing

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T15): port mrtree edge routing`
Scratch: `$TMPDIR/alg-trees/T15/`

## Context

Mission 8a, TR3. `M/p4route/EdgeRouter.java` (705; `nodeGaps` `HashMap<Long, …>` lookup only `:167-260`; the three
`EdgeRoutingMode`s; four directions) and `M/p4route/MultiLevelEdgeNodeNodeGap.java` (218). `EdgeRouter` is a T6 staged file.
`Long` keys: check the key arithmetic against translation rules §1.4 (a `long` beyond 2^53 needs `bigint`; journal the bound).

## Task

1. Port both classes whole; split `EdgeRouter` into sections behind a facade only where the limits force it (journal).
2. Tests: `EdgeRouter` from the stop before it to the stop after it for every T1 row (each routing mode × direction, multi-level
   edges); `MultiLevelEdgeNodeNodeGap` through the rows that reach it (replay-alone coverage).

## Write-set

`src/alg/mrtree/p4route/{EdgeRouter,MultiLevelEdgeNodeNodeGap}{,.test}.ts` (and any `EdgeRouter*` section files).

## Read-set

The two Java files, `src/alg/mrtree/TreeUtil.ts`, T6's helpers, `docs/translation-rules.md` §1.4, `decisions.md` TR3.

## Interface contract (consumed by T17)

`EdgeRouter` as an `ILayoutPhase<TreeLayoutPhases, TGraph>`.

## Acceptance criteria

- Given every T1 row reaching `EdgeRouter`, when it runs on the recorded "before" state, then the "after" stop (bend points
  included) equals the row at 1e-6.
- Given the `nodeGaps` keys, then the journal states their maximum magnitude and the `number`/`bigint` choice.

## Observability / Rollback

N/A — no new observable operations. Reversible.
