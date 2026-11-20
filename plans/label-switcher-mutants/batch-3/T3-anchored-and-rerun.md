<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: anchored cases and the mutation rerun

## Context

The replay of the new rows (T2) already compares every field. Anchored cases name the branch each row decides, and
they survive later refactors of the replay helpers (the 7f2 T17a pattern). The rerun is the evidence for #48's
"done when".

## Read-set

`src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts` (the pattern: `row()`, `replay()`, `assignmentsOf()`);
the new rows by id in `test/golden/refs/java/layered-labels.json`; `plans/label-switcher-mutants/mutants.md`; Java
`LabelDummySwitcher.java:407-530`; decisions D2, D3, D5, D6.

## Write-set

`src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts` (new `describe` blocks only; existing cases untouched).
The orchestrator writes `plans/label-switcher-mutants/{mutants,decision-journal}.md`.

## Steps

1. For each new row: a `describe` with a `finds the recorded row` case, a case asserting `replay().layers` (literal
   copied from the row), and, where the mutant changes `assignLayer` order or targets, a spy-twin case with the
   `[width, layer]` sequence from the row. Each literal gets a comment `// oracle: <row id> …; LabelDummySwitcher.java:<line>`.
   If the file passes 500 lines, add `LabelDummySwitcherSpaceEfficientSites.test.ts` beside it with the same helpers
   (push-forward; journal it).
2. Run the file, `npm run typecheck`, prettier and complexity.
3. Rerun every M in the scratch copy (refresh it from the worktree first) against D2. Record `after`.
4. Verdicts: `killed`, or `equivalent` with the D6 proof written in the row (cite the probe for runtime facts). Any
   mutant still `survived` without a proof is stop 6.
5. Journal the counts: killed / equivalent / open.

## Interface contracts

To T4: the final `mutants.md` and the counts.

## Acceptance criteria

- Given each new row, when its anchored cases run, then they pass, and each literal cites the row id.
- Given M1-M18 (and any `M19+`), when rerun against D2, then each is `killed` or carries a D6 `equivalent` proof.
- Given the existing cases of `LabelDummySwitcherSites.test.ts`, then none is edited (diff shows only additions).

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
