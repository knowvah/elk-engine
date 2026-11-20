<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: rename the three titles

## Context

Mission 7h's H7 allowed header-comment edits only, so these `describe` titles still claim the nested-graph paths
are U "until 7h" (`plans/layered-compound/decision-journal.md:96,101`). 7h's recorded nested rows now reach them.
See [README](../README.md#objective) for the table and [D1](../decisions.md#d1-title-wording) for the wording rule.

## Read-set

- `src/alg/layered/p3order/LayerSweepCrossingMinimizerSweep.test.ts:1-6,122`
- `src/alg/layered/p3order/LayerSweepTypeDecider.test.ts:1-6,109`
- `src/alg/layered/p3order/GraphInfoHolder.test.ts:1-5,151`
- `plans/layered-compound/unreached.md:419-440` (§ Crossing minimisation (H8 4)) and § H8 closure (from `:487`,
  row 4.1)

## Write-set

The three title lines above (one line each), and `plans/p3order-test-titles/decision-journal.md`.

## Steps

1. Record the three suites' test counts and results on the base:
   `npx vitest run src/alg/layered/p3order/{LayerSweepCrossingMinimizerSweep,LayerSweepTypeDecider,GraphInfoHolder}.test.ts`.
2. For each path, find the closure row (or ported suite) that reaches it; journal the cite. Missing backing is
   stop 3 for that title.
3. Edit the three titles per D1. Change nothing else.
4. Rerun step 1's command and `npx prettier --check` on the three files. `git diff --stat` shows 3 files,
   3 insertions, 3 deletions.
5. Journal a `fix` row with each old and new title and the cite. Commit (batch-1 overview).

## Acceptance criteria

- Given the three files, when `grep -n "until 7h\|; U " ` runs over them, then it prints nothing.
- Given `git diff <base> -- src/`, then exactly three lines change, each a `describe(` title in one of the three
  files, and no `it(`, `expect`, or comment line changes.
- Given step 1's command, when run after the edit, then the test count and pass result equal the base's.
- Given each new title, then the journal names the `unreached.md` row or ported suite that backs its claim.

## Interface contracts

None: no other task consumes T1's output.

## Observability

N/A: test titles only; no runtime behaviour.

## Rollback

Reversible: revert the three lines.
