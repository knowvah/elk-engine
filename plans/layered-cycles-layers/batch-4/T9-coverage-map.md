<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay-alone coverage map

**Agent:** main session (executor) · **Commit:** `docs(T9): map layered phase branches unreached by the replays`

## Context

Mission 7b (README), L4 under X5, B7. Expectations come from the oracle; anything the replays do not exercise must get
its own oracle row rather than a hand-derived literal. 7a's T9 is the precedent (`plans/layered-framework/unreached.md`,
`batch-6/T9-coverage-map.md`).

## Task

1. Run only the 7b replays with coverage restricted to the 7b classes:
   `npx vitest run --coverage --coverage.include='src/alg/layered/{p1cycles,p2layers,intermediate}/**' --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=<scratch> src/alg/layered/LayeredPhaseVectors.test.ts`
   (record the exact command and the 1-minute load). Exclude staged files and the enum's throwing arms (X).
2. Per class, list untaken branches and uncovered functions.
3. Classify each: **S** numeric/algorithmic → a step scenario (graph + steps + expected shape), grouped by shared
   graph; **J** structural with Java-derived expectations (enum constants, predicates, `toString`); **U** unreachable
   through the 7b surface or dead by construction, with the Java line and reason; **X** throwing arms.
4. Write `plans/layered-cycles-layers/unreached.md`: the command, totals, the category table, then per group
   `| # | Class | Lines / branch | Scenario id | Graph | Steps | Expected shape |`, then the U list. Stop 9 above
   about 25 numeric scenarios (then re-plan T11/T12 as 7a's X6 did).

## Write-set

`plans/layered-cycles-layers/unreached.md`.

## Read-set

`plans/layered-framework/{unreached.md,batch-6/T9-coverage-map.md}` (format), the coverage output, the 7b sources,
the Java for each branch.

## Interface contract (consumed by T11, T12)

Each S scenario has a stable id `sites/<Class>/<name>`, an inline graph description, a step list in T1's op
vocabulary, and the `expected` fields T12 asserts.

## Acceptance criteria

- Given the coverage run, when the table is written, then every untaken branch appears exactly once under S, J, U or X.
- Given the S list, when counted, then ≤ 25 scenarios or stop 9 is raised.

## Observability / Rollback

N/A. Reversible.
