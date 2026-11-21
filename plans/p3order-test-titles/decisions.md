<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: p3order-test-titles (issue #62)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D3 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Title wording

Each title keeps its subject and its `hand-built` marker, which is still true: the cases build the nested graph by
hand. Only the parenthetical's status clause changes. "U for the rows until 7h" / "U until 7h" becomes a clause that
names what reaches the path now, in the vocabulary of the file's own header comment (all three headers already say
"proven by the `layered-compound.json` rows (7h)", rewritten by 7h T8). Proposed:

| File | New title |
| ---- | --------- |
| `LayerSweepCrossingMinimizerSweep.test.ts:122` | `the hierarchical sweep (hand-built nested graph; the layered-compound.json rows reach it, 7h)` |
| `LayerSweepTypeDecider.test.ts:109` | `LayerSweepTypeDecider on a nested graph (hand-built; the layered-compound.json rows reach it, 7h)` |
| `GraphInfoHolder.test.ts:151` | `GraphInfoHolder: a graph nested in a node (hand-built; the layered-compound.json rows reach it, 7h)` |

Before writing a title, T1 finds the row of `plans/layered-compound/unreached.md` that backs it and journals the
cite. Planning found: row 4.1 of § H8 closure (`LayerSweepCrossingMinimizerHierarchical.ts` both functions,
`LayerSweepTypeDecider.useBottomUp`, on `full/hierarchy-aware/deep3/sweepiness-0.1`), and the § Crossing
minimisation (H8 4) table, which marks `GraphInfoHolder.parentGraphData`/`portPositions` **J** (reached by the ported
suites `LayerSweepHierarchicalTwoSidedGreedySwitchTest`, `SwitchDeciderTest`). If a path is reached only by ported
Java suites and not by a row, its title names what does reach it (for example "the 7h ported suites reach it"), so
no title overclaims. The exact words are push-forward within this rule; a title stays one line under prettier.

## D2. AD-13 is not engaged

A `describe` title is not an assertion, a vector or a golden: no expected value changes and no test can turn green
or red through it. Only the three title strings change; every `it` title, body, `expect` and header comment stays
as it is. The vitest JSON / coverage outputs carry titles, but nothing in `test/`, `tools/` or `test/golden/refs/`
matches on these three (planning grep: the strings occur only in their own files and in append-only `plans/`
history, which is not edited). There are no snapshot files for the three suites.

## D3. Scope

Exactly the three titles of #62. Other stale staging text is a `follow-up` issue, not a fix here (queue rules: new
work goes to the maintainer). Planning's grep (`until 7[a-h]|U until|U for the rows` over `src`, `test`, `tools`)
found two other hits: `src/alg/layered/ElkLayeredTestExecutionState.ts:6` ("staged until 7f": 7f landed, so likely
stale; T2 checks and files it) and `test/helpers/layout-test-runner.test.ts:182` (an `Error` message built as test
input for the runner's failure path; it is data, not a claim, so no issue).

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 | Keep subject and `hand-built`; replace only the status clause; back each by a closure cite | (a) drop the parenthetical entirely: loses the useful `hand-built` marker that tells a reader the orders are not oracle-backed in this file; (b) cite row ids in titles: titles get long and rot with the ref | Headers at `:1-6` of each file (7h T8 wording); `plans/layered-compound/unreached.md:419-440, 487+` (row 4.1); `plans/layered-compound/decision-journal.md:96,101` (titles left for this follow-up) |
| D2 | Treat as a non-assertion edit; no ruling needed | Filing `needs-ruling` first: the issue itself states "no assertion changes" and the maintainer filed it `queue:ready` | `CLAUDE.md` § Tests Are Immutable (assertions, vectors, goldens); `grep` of the three titles over `test/`, `tools/`: no consumer |
| D3 | Three titles only; other hits filed as `follow-up` | Fixing `ElkLayeredTestExecutionState.ts:6` here: a source Javadoc outside #62, and the queue rules route new cleanups to the maintainer | `grep -rn "until 7[a-h]\|U until\|U for the rows" src test tools` at `68f37f6e` |
