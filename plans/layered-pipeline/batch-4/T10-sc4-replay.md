<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — SC4 re-replay of the landed `models/*` rows

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T10): replay landed layered rows through the real driver`
Scratch: a private subdirectory `<scratchpad>/T10/`.

**Rules (F16).** Landed rows, helpers and comparators are frozen; a hand-derived expectation is stop 3.

## Context

Mission 7f, F5, SC4. 7b–7e rows were replayed with `normalise` and a hand-walked `prefix`, because `GraphConfigurator` and `ElkLayered`
did not exist. This proves `GraphConfigurator` over every option combination those rows carry.

## Task

1. `src/alg/layered/LayeredPipelineReplay.test.ts`: for every `models/*` row of `layered-phases.json`, `layered-order.json`,
   `layered-placement.json`, `layered-routing.json`: `runStopRow(row, { dump, compare })` with that mission's dump and comparator
   (`phaseDump`/`compareExpected` or full-dump twin, `orderDump`/`compareOrder`, `placementDump`/`comparePlacement`, `routingDump`/`compareRouting`),
   and the plan-equality check (F5). Enum registrations each mission's rows need come from the helpers' registration functions.
2. The driver's stop condition is the row's stop: walk `runLayoutTestStep` until the last `prefix` entry has run. Rows naming a chain-forced prefix
   are not `models/*`; a `models/*` row whose plan differs from its `prefix` is a port defect in `GraphConfigurator` until shown otherwise.
3. Report per ref: row count, passes, timing. Under 30 s alone (stop 11); a stride over rows is the orchestrator's call, recorded in the journal.
4. A row that cannot replay for a reason other than a plain port defect (for example `normalise` and `configureGraphProperties` genuinely differ, or a
   recorded option cannot be applied before `prepareLayoutTest`): stop 20 with the row id and the mechanism.

## Write-set

`src/alg/layered/LayeredPipelineReplay.test.ts`, fixes in `GraphConfigurator`/`ElkLayered` (journaled, coordinated with T9 by the orchestrator).

## Read-set

`test/helpers/layered-{phase,order,placement,routing}-replay-{rows,dump,compare}.ts`, `test/helpers/layered-phase-replay-normalise.ts`,
`test/helpers/layered-pipeline-replay-{names,ops}.ts`, the existing `Layered{Phase,Order,Placement,Routing}Vectors.test.ts`, `decisions.md` F5, F14.

## Interface contract

None consumed downstream beyond the green suite.

## Acceptance criteria

- Given every `models/*` row of the four refs, when replayed through the driver, then the plan prefix equals the row's and its comparator reports no diffs.
- Given a plan with `GraphTransformer`, when named, then it is named by position.
- Given the suite alone, when timed at normal load, then at most 30 s.
- Given `git status`, when inspected, then no landed ref or helper changed.

## Observability / Rollback

N/A — no new observable operations. Reversible.
