<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Layout harness uses `LayoutConfigurator` (exit criterion, P5)

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12): apply the test algorithm through layout configurator`
`JA` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework`.

## Context
Mission 5b (README). `test/helpers/elkt-layout-harness.ts` (5a T17) sets `CoreOptions.ALGORITHM` on every node by
hand (`applyAlgorithm`), because `LayoutConfigurator` was not ported yet. Java's test runner does it through
`TestAlgorithm`:
- `new LayoutConfigurator()`;
- `configure(ElkNode.class).setProperty(CoreOptions.ALGORITHM, algorithm.getId())` (`JA/algorithm/TestAlgorithm.java:44-49`);
- `ElkUtil.applyVisitors(graph, algorithmConfigurator)` in `apply` (`:134-138`).

The roadmap's 5b exit criterion is this switch.

## Task
1. In `layoutElkt`, replace `applyAlgorithm(root, algorithmId)` with the `TestAlgorithm` sequence above, using T5's
   `LayoutConfigurator` and the landed `ElkUtil.applyVisitors`.
   - Keep the order: load → algorithm configurator → test-specific `configurator(root)` → layout.
   - Remove `applyAlgorithm` if nothing else uses it (grep first).
2. `ElkUtil.applyVisitors` visits every element: nodes, ports, labels and edges. `configure(ElkNode)` reaches only
   nodes, so the result for nodes equals the old hand-applied loop. Confirm that the old loop covered exactly the
   nodes, root included, that `configure(ElkNode)` reaches. If it did not, stop (stop 4).
3. Update `test/helpers/elkt-layout-harness.test.ts` only by **adding** a case: given the harness, then
   `CoreOptions.ALGORITHM` arrives through a `LayoutConfigurator`. Spy on or observe the visitor, or assert that a
   port's `ALGORITHM` stays unset, consistent with Java. Existing assertions stay unchanged (AD-13).
4. Run `Issue457Test`, `Issue489Test` and `test/golden/layout-goldens.test.ts`. Then run
   `tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms && git diff --exit-code test/golden/refs/`.

## Write-set
`test/helpers/elkt-layout-harness.ts`, `test/helpers/elkt-layout-harness.test.ts`.

## Read-set
- `JA/algorithm/TestAlgorithm.java:30-140`.
- T5's `src/core/LayoutConfigurator.ts`, `src/core/util/ElkUtil.ts` (`applyVisitors`).
- `src/core/issues/{Issue457Test,Issue489Test}.test.ts`, `test/golden/layout-goldens.test.ts`.
- `plans/core-engine/decision-journal.md` (T17 row).

## Interface contracts
`layoutElkt(modelPath, algorithmId, configurator?)` keeps its signature and return value.

## Acceptance criteria
- Given `Issue457Test`, `Issue489Test` and the 9 algorithm goldens, when run after the switch, then all pass with no
  assertion changed.
- Given the harness, when a model is loaded, then `ALGORITHM` is set by `LayoutConfigurator` + `applyVisitors`, and
  no hand-written node loop remains.
- Given both golden sets, when regenerated, then `git diff --exit-code test/golden/refs/` is clean.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
