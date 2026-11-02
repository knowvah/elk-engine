<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T9): map crossing-minimization branches unreached by the replays`

## Context

Mission 7c (README), C11, L4 under X5. 7b's `plans/layered-cycles-layers/unreached.md` (with its T11/T12 corrections)
is the precedent and format.

## Task

1. `npx vitest run --coverage --coverage.include='src/alg/layered/{p3order,intermediate}/**' --coverage.exclude='**/*.test.ts'
   --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=<scratch> src/alg/layered/LayeredOrderVectors.test.ts`
   (log kept **outside** the reports directory, which vitest clears); record the command and the load. Exclude the 7b
   processors, staged files and the enums' throwing arms (X).
2. Classify every untaken branch and uncovered function: **S** (a step scenario: graph, steps, expected shape),
   **J** (structural, Java-derived, unit-tested), **U** (unreachable through 7c: label dummies 7f, nested graphs 7h,
   dead by construction with the Java line), X.
3. Write `unreached.md` (7b's layout). Stop 9 above about 25 S scenarios.

## Write-set

`plans/layered-crossing-min/unreached.md`.

## Read-set

`plans/layered-cycles-layers/unreached.md`, the coverage output, the 7c sources and the Java per branch.

## Interface contract (consumed by T11, T12)

Each S scenario has a stable id prefix `sites/<Class>/<name>` (rows append `/<variant>`), an inline graph description,
a step list in the recorder's op vocabulary, and the `expected` fields T12 asserts.

## Acceptance criteria

- Given the run, when the table is written, then every untaken branch appears exactly once under S, J, U or X.
- Given the S list, when counted, then ≤ 25 scenarios or stop 9.

## Observability / Rollback

N/A. Reversible.
