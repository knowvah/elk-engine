<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: re-record, regenerate, triage

**Agent:** orchestrator. **Runbook:** §§ 7.1, 7.2 (AWT remeasure), 7.3, 8, 11. **Decisions:** D1, D4, D5, D8.

## Task

1. **D1 first.** In `tools/vectors/RectPackingVectors.java` `sortOutcome` (`:1670`), replace the copied comparator with
   the one at `InteractiveNodeReorderer.java:50-74` at `8bca22f4`, verbatim: the model order map is filled in list order,
   and ties return `Integer.compare(modelOrder.get(b), modelOrder.get(a))`. Update the group-`sort` header text
   (`:86-91`) and the `InteractiveNodeReorderer.java:N` line references in the file. Keep ids, inputs, `SEED` and the
   self-check. Journal it as tool-side, following eclipse-elk/elk#1237.
2. **Every recorder of § 7.1 except `elkj`**, one at a time beside T2, under `nice -n 10`, with a load check before each.
   Then the § 7.2 AWT remeasure `cmp`, and the § 7.3 JDK-only recorders (their refs must not change). After each one,
   run `git diff --stat test/golden/refs/java`.
3. **D4.** If a recorder's self-check refuses a row because the new Java moved it to another group (expected:
   `spore-layout-vectors.sh` on `throws/overlap/scanlineHitboxes`, eclipse-elk/elk#1244), re-plan that row in its new
   group in the recorder (spore `Spec` near `SporeLayoutVectors.java:1647`). Rerun the recorder and journal the move.
   A refusal no #104 row explains is stop 4.
4. **§ 8.** Run all `regen-goldens.sh` sets, `regen-parse-refs.sh` (after the default set), `regen-elkt-refs.sh`,
   `regen-elkj-refs.sh` (6 min), `regen-generated.sh` and `census.ts --write`.
5. **§ 11 triage.** Run the normalizing loop (`$NEW` → `$OLD`) over every changed file under `test/golden/refs`,
   `test/corpus`, `tools/melk/sources` and `bundle-deps.json`. Patches are unchanged, so `patches` needs no normalizing.
   Classify every file as stamp-only, content or tool-side. For each content file, list the changed row ids and give
   each the #104 row that explains it, with a mechanism (diagnosis mode: origin `file:line` at `8bca22f4`, causal chain,
   ruled out). Expected content: `rectpacking.json` (`sort` rows under D1; `stops`/`full` rows through `placeBeside`,
   `Compaction.java:413`, #1239), `spore-layout.json` (`jitter` `runsAgree`, #1242; the scanline row, #1244; any row
   that reaches `updateGraph`'s new shift), `metadata.json` (T1). Possibly `layered-framework.json` or a golden through
   the new nested-graph check (#1241), if a recorded input sets a model order strategy under `INCLUDE_CHILDREN`.
   Anything else is stop 4.
6. Journal a table: file, class, row count changed, #104 row, mechanism. Commit the re-records and the recorder change
   as one task commit; the TS suite is red on the content rows until T4-T6 land.

## Write-set

`tools/vectors/RectPackingVectors.java`; `tools/vectors/SporeLayoutVectors.java` (D4 re-planning and line references
only); `test/golden/refs/**` except T2's six files; `test/corpus/census.json`, `test/corpus/elkt-curated/`,
`test/corpus/elkj-curated/`, `test/corpus/generated/`.

## Read-set

The runbook §§ 7-8, 11; the recorder headers (`RectPackingVectors.java:1-120`, `SporeLayoutVectors.java:1-120`,
`:595-640`); `git -C ../elk diff e7eaea57 8bca22f4 -- plugins/`; `.agent-notes/elk-upgrade-runbook.md` (costs).

## Acceptance criteria

- Given the D1 recorder change, when `rectpacking-vectors.sh` re-records, then the 310 `sort` rows of length 1-31 are
  byte-equal, every one of the 213 ids in `test/helpers/rectpacking-sort-classified.ts` changes, and no row throws. Journal
  how many of the other 117 rows of length 32-64 also change: TimSort's merges with the old `-1` comparator need not have
  produced the total order even where V8 matched them. A changed row of length 1-31 is a D1 finding: diagnose it
  before going on.
- Given all re-records, when the normalizing loop runs, then every printed file has a journal row with its #104 row and
  mechanism.
- Given the § 7.3 recorders and `layered-label-metrics-vectors.sh`, when their refs are diffed, then there is no change.

## Interface contracts

Output for T4: the re-recorded `rectpacking.json` (`sort`, `stops`, `full` rows). Output for T5: `spore-layout.json`.
Output for T7 and T8: the content table in the journal.

## Observability / rollback

N/A: no new observable operations; journal each recorder's cold wall time (runbook "Cold" columns). Reversible.
