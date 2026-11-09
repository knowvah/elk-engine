<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Labels replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T2): add the layered labels replay helpers`
Scratch: a private subdirectory `<scratchpad>/T2/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate such as `X || X` is collapsed with a comment naming
the Java line; everything else stays verbatim. No assertion the Java lacks in a ported suite. L4 and the CodeQL collapse rule
apply.

## Context

Mission 7f2, G2, G3, G6, F4. The 7f helpers `test/helpers/layered-pipeline-replay-{rows,ops,names}.ts` (landed, never edited;
new files import them) are the pattern: row loader, step-op interpreter, plan names. T1's recorder defines the row format and
three new ops; T2 consumes T1's **header contract** (the ops, `expected.logged`, manager kinds), not its output, and runs
against the 7f rows until T1 lands. `.agent-notes/layered-pipeline.md` § "a plan must be captured during the real run" and
"removed-element encoding" apply.

## Task

1. `layered-labels-replay-rows.ts`: loader for `test/golden/refs/java/layered-labels.json` (groups `full`, `models`, `scenarios`,
   `sites`), `rowCounts` check, selection helpers by id prefix and by the last prefix entry (never "the plan runs the
   processor"); re-export the 7f row types rather than copying them.
2. `layered-labels-replay-ops.ts`: TS twins of the new step ops. `labelManager <kind>`: the G6 manager as an `ILabelManager`
   (`src/core/labels/ILabelManager.ts`) identical to the recorder's definition (shrink a label to the target width, keep its
   height; `none` leaves it unset), installed through `LabelManagementOptions.LABEL_MANAGER` on the graph; `interactive`: applies
   `InteractiveLayeredGraphVisitor` between two layouts (calls a factory, since the class arrives in T10); `logging`: runs with a
   monitor whose `isLoggingEnabled()` is true and records the graphs logged through `BasicProgressMonitor.logGraph`
   (`src/core/util/BasicProgressMonitor.ts`). Unknown ops throw naming the op.
3. `layered-labels-replay-logged.ts`: the **G3 comparator**: DOT strings compared exactly; JSON strings parsed, every property
   list (the `properties` objects of the graph, nodes, edges, ports) compared as an unordered map, everything else exactly,
   including key order outside property lists. A difference only in property order passes (pre-decided, not stop 17).
4. Tests colocated: the comparator on hand-built strings (equal, property order only, a changed value, a changed key outside a
   property list, a changed DOT line), the manager twin's arithmetic on three sizes, row selection on a small in-memory ref, an
   unknown op. Literals in tests are the helper's contract, not behaviour of the port (not L4 expectations).
5. Registry hooks only: the ops attach to 7f's op registry by import, never by editing it.

## Write-set

`test/helpers/layered-labels-replay-{rows,ops,logged}.ts` and their `.test.ts` files.

## Read-set

`test/helpers/layered-pipeline-replay-{rows,ops}.ts` (exports and registry only), `test/helpers/layered-pipeline-pinned-rows.ts:1-12`,
`src/core/labels/ILabelManager.ts`, `src/core/util/BasicProgressMonitor.ts` (`logGraph`, `isLoggingEnabled`),
`src/core/util/IGraphElementVisitor.ts`, `decisions.md` G2, G3, G6, F4, F16, `.agent-notes/layered-pipeline.md` (the plan-capture
and unboxing notes).

## Architecture decisions

G2 (row groups, new ops), G3 (comparator), G6 (manager twin), F4 (the bar: ids, counts, topology and non-numerics exact, numbers
1e-6), F16.

## Interface contract (consumed by T11, T12, T15, T16, T17)

`loadLabelsRows()`, `rowsByGroup(group)`, `rowsByClass(prefix)`; `compareLogged(actual, expected): string[]` (empty when equal,
else the first differing paths); `createLabelManager(kind): ILabelManager`; op names `labelManager`, `interactive`, `logging`
registered with the 7f interpreter.

## Acceptance criteria

- Given two JSON debug strings that differ only in the order of keys inside a `properties` object, when compared, then
  `compareLogged` returns no differences.
- Given two JSON strings that differ in one property value or one key outside a property list, when compared, then the result
  names the path.
- Given a DOT string differing in one character, when compared, then it is reported (exact).
- Given the manager twin and a label wider than the target, when applied, then width equals the target and height is unchanged.

## Observability / Rollback

N/A — no new observable operations. Reversible.
