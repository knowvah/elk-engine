<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: shared helpers, inventory, and the four small items

Runs after the D7 baseline ([README](../README.md#mission-start) step 6). The four tasks have disjoint write-sets and
may run in parallel. T1 is the orchestrator's (it writes `plans/`); T2-T4 may be subagents (`typescript-pro`, sonnet).
Batch 2 needs T1's helpers and [inventory.md](../inventory.md).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-helpers-and-inventory.md) | Factories, order-site and spline-caller helpers; final inventory | orchestrator | new `test/helpers/layered-replay-factories*.ts`, `layered-order-site-replay.ts`, `layered-spline-callers.ts`; `plans/…/inventory.md` | — | [x] |
| [T2](T2-junit-delta-and-polyomino.md) | `AssertionFailure` into `junit-delta`; `fromPattern` to a helper | typescript-pro | `test/helpers/{junit-delta,edge-route-orthogonal,polyomino-fixtures}.ts`, two polyomino tests | — | [x] |
| [T3](T3-harness-to-runner.md) | Issue457/489/475 onto `defineLayoutTest`; retire the harness | typescript-pro | three issue tests, `layout-test-runner.test.ts`, harness + test (delete), `docs/architecture/core-engine.md` | — | [x] |
| [T4](T4-elklayered-loop.md) | Drop `ElkLayered.test.ts`'s duplicated 199-row loop | typescript-pro | `src/alg/layered/ElkLayered.test.ts` | — | [x] |

Subagents never commit, never run `npm run coverage` or the full suite (shared `coverage/`, load), never start a JVM,
and return a short report (files changed, per-file case counts from `npx vitest run <files>`, proofs) to the
orchestrator, which journals it and commits one commit per task.
