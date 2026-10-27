<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3b — The T4 and T6 sites and the T1 scenarios

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3b): re-anchor nodespacing placement and sizing tests on the oracle`
`A` = `src/alg/common/nodespacing/internal/algorithm`.

## Context

Mission 6c (README). T2 recorded `nodespacing-sites.json`; T3a writes the generic replay in parallel. This task
re-anchors the remaining flagged tests (T4's two-port case, T6's five values) and the T4 scenarios T1 listed. A
mismatch is diagnosed, never fixed by editing the JSON or `src/` (stops 4, 5, 7).

## Task

1. `A/HorizontalPortPlacementSizeCalculator.test.ts:159-181` (D4, invalid premise): keep the 3-port case; **restore the
   2-port case** (ratios 0.25 and 0.75, `labelled(NORTH)`, `FIXED_RATIO`, `labelSettings(OUTSIDE)`) as its own `it`
   asserting the oracle row `fixedRatioMargins/two-ports` (margins and size). Comment cites
   `HorizontalPortPlacementSizeCalculator.java:276-277` and `:305`.
2. `A/LabelPlacer.test.ts:108-115` and `:191-200`, `A/NodeSizeCalculator.test.ts:158-170` (D4, wrong value): the
   literals `[5,5]`, `[27,19]`, the collapsed-container labels, `[100,79]`, `[79,0]` each annotated with its row id;
   comments cite `ContainerCell.java` `minWidthOfCell`/`minHeightOfCell` (zero content → 0 despite padding) and, for
   the collapsed case, `CellSystemConfigurator.java:89-116`.
3. For every row of `plans/ad13-rederivation/t4-unreached.md`: annotate the covering T4 test's literals with the `t4/…`
   row id; if the test lacks a case for the branch, add one with the oracle value.
4. If a literal disagrees with its row, do not change either: stop with the diagnosis artifact.

## Write-set

`A/{HorizontalPortPlacementSizeCalculator,PortPlacementCalculator,VerticalPortPlacementSizeCalculator,LabelPlacer,NodeSizeCalculator}.test.ts`.

## Read-set

- `test/golden/refs/java/nodespacing-sites.json`, `tools/vectors/NodespacingSiteVectors.java` header.
- `test/helpers/{port-placement-fixtures,cell-creator-fixtures,node-context-fixtures}.ts` (read only).
- `plans/ad13-rederivation/t4-unreached.md`; `decisions.md` D1, D4.

## Interface contract

Input: T2's JSON. No output consumed by another task.

## Acceptance criteria

- Given the restored 2-port case, when the size calculator runs, then margins and size equal the oracle row, and the
  3-port case still passes.
- Given the five T6 literals, when run, then each equals its oracle row and its comment names the Java mechanism.
- Given each T1 scenario, when its T4 test runs, then its literal equals the oracle row.
- Given `git show --name-only HEAD`, when inspected, then only the five test files changed.

## Observability / Rollback

N/A — tests only. Reversible: revert the commit.
