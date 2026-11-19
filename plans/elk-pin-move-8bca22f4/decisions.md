<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: elk-pin-move-8bca22f4 (issue #104)

Locked inputs: AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), UP1-UP9 (`plans/elk-upgrade-runbook/decisions.md`),
the runbook, and the maintainer ruling in #104 (2026-11-18: move now; #104 is the AD-13 ruling for the stamped refs).

## Auto-confirmed (unattended)

Planned by an unattended `/plan-mission` run on 2026-11-18. Each decision lists the evidence and the options rejected, so
the maintainer can audit it.

### D1: the rectpacking `sort` recorder follows the new comparator

- **Context.** #104 expects the 213 `sort` rows of #75 to "change to the total-order result". But
  `tools/vectors/RectPackingVectors.java` `sortOutcome` (`:1670`) does not call `InteractiveNodeReorderer`.
  It runs `Collections.sort` with a copy of the comparator from `InteractiveNodeReorderer.java:56-63` (`return -1` on
  ties). Re-recording without touching the recorder would leave every `sort` row unchanged.
- **Decision.** Replace the recorder's copy with the comparator at `8bca22f4` (`InteractiveNodeReorderer.java:50-74`),
  copied verbatim: a `HashMap<ElkNode,
  Integer>` model order filled in list order, ties `Integer.compare(modelOrder.get(b), modelOrder.get(a))`. Update the
  recorder's header text (group `sort`) to match. Keep the row ids, inputs, seed and the stability self-check. Journal it
  as a tool-side change that follows eclipse-elk/elk#1237.
- **Rejected.** (a) Leave the recorder alone: the ref then encodes Java that is no longer pinned, and the port's test
  could not use the new comparator. (b) Record `InteractiveNodeReorderer.process` instead: that is a different
  observable (re-inserted children), a new group, and more than #104 asks.
- **Expected.** The 310 rows of length 1-31 stay byte-equal. There, TimSort's descending-run reversal and binary
  insertion with `-1` already put ties last-index first, the same order the new comparator gives. The 213 rows change,
  and the 34 `throws` rows become `order` rows. Some of the 117 longer rows that V8 matched may change too. The proof
  that matters is the port's: with a consistent comparator, `Array.prototype.sort` must reproduce all 640 rows (D5.2).

### D2: the TS comparator keeps the Java's capture

`compareDesiredPositions` becomes a factory `compareDesiredPositions(modelOrder: Map<ElkNode, number>)` that returns
`(a, b) => number`. The factory mirrors the lambda's capture of `modelOrder`. The map is identity-keyed and used for
lookups only, so it is a plain `Map` by AD-10 (journal the site). `Integer.compare` is written as in the current port.
The exact shape is push-forward, if the test and the processor share one function.
Rejected: a third parameter on the comparator, which `Array.prototype.sort` cannot pass.

### D3: spore `jitter` rows stay invariants-only

- **Context.** PK4 (`docs/architecture/alg-packing.md` § 3.2) made the `jitter` group of `SporeLayoutVectors.java`
  invariants-only because the shift was unseeded. With `randomSeed = 1` the shift is now deterministic.
- **Decision.** Do not restructure the group. Re-record it as it is: `runsAgree` is expected to turn `true`, which
  eclipse-elk/elk#1242 explains. The exact-value evidence for the seeded shift comes from three places: the 788 corpus
  cases that become comparable (T7), the `RandomSeedTest` port (T5), and the spore goldens. File one `follow-up` issue
  that proposes exact `jitter` rows.
- **Rejected.** Turning `jitter` rows into exact rows now. That is a recorder redesign with new rows, which #104 does not
  ask for (YAGNI).

### D4: a recorded row that changes group follows the #1215 precedent

The new Java can move a planned row into another group. Expected cases: spore `throws/overlap/scanlineHitboxes` may stop
throwing (eclipse-elk/elk#1244), and the rectpacking `stops/arm/staleParentRow*` rows may change (eclipse-elk/elk#1239).
When the recorder's self-check then refuses to write (`is planned throws but ran`), re-plan that row in its new group,
as #99 did for `throws/arm/noBestCandidate`. Keep the id stem, update the row-count constants of the TS replay, and
journal the move with its PR. A row move that no row of #104's table explains is stop 4.

### D5: what #104 approves under AD-13

#104 approves these changes. The executor journals each one with its before and after values and the #104 row it falls
under:

1. Regenerated stamped refs. Content changes need a mechanism traced to one of the six net-diff PRs.
2. #75: `test/helpers/rectpacking-sort-classified.ts` is deleted. `RectPackingVectors.test.ts` "PK7: the sort proof"
   then asserts that all 640 rows reproduce, with no classified ids.
3. #78: `CHILDREN_NOT_X_GROUPED_ROWS` (`src/alg/rectpacking/util/RectRow.test.ts`) changes only as the re-recorded
   `stops` rows require (ruled final on #78; the list is recomputed, not hand-picked).
4. #79: the six `issue: 79` entries of `tools/corpus/ts-findings.json` whose cases now compare `ok` are removed. The
   spore entries of `NONDETERMINISM_SOURCES` (`tools/corpus/parity-report.ts:69-73`) and the strings that
   `test/corpus/parity-report.test.ts` asserts about them follow the new Java.
5. Row-count constants (`FULL_ROWS`, `THROWS_ROWS`, …) and counts under `test/helpers/` that move with D4 or the
   re-record.
6. Test call sites forced by a changed Java signature (D2). The expected values stay the same.
7. PK4: the two jitter blocks hard-code the unseeded shift. They are `src/alg/spore/ElkGraphImporter.test.ts:166-169`
   and `src/alg/spore/SporeLayoutVectors.test.ts:229-232`, which assert `invariants.runsAgree` is `false` and
   `dumps.size` equals `RUNS`. These follow #104's eclipse-elk/elk#1242 row ("(#79, PK4)"): they become the recorded
   `runsAgree` (expected `true`) and one distinct dump. If the re-recorded ref still says `false`, that is a finding
   against #1242: diagnose it (stop 4) and do not edit the test.

Any other assertion change is stop 5. Planning found items 2, 4 and 7 by reading the tests. The executor greps for more
before T4/T5 (`git grep -n "Math.random\|runsAgree\|nondetermin" -- src test tools/corpus`) and journals each hit's D5
item.

### D6: the #84 check is ported into the hierarchical importer

Port `ensureNoModelOrderStrategies` (`ElkGraphImporter.java:525-566` at `8bca22f4`) as a private method next to the
nested-graph branch of `src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:126`. Call it right after
`nestedGraph.setParentNode(lnode)`, as the Java does at `:377`. Keep the switch fall-through groups, the message string
verbatim, and `HierarchyHandling` and `GroupOrderStrategy` by their `toString`. If the complexity hook blocks it, a split
into `ElkGraphImporterModelOrder.ts` is push-forward and journaled.

### D7: closing issues on one branch

The footer says `Refs: #104, #73, #75, #79, #84`. Under `--branch` the maintainer closes issues at merge. The executor
comments on #73, #75 and #84 with the evidence that confirms or refutes each one, and on #79 with how its cases settled.
It closes nothing itself.

### D8: lanes

The `elkj` recorder (about 4.5 h) runs alone in its own lane from T2. The `elkj` sweep (about 5.5 h) starts only after
it exits, never beside it. Every other recorder, regen, sweep and suite runs one at a time beside the `elkj` lane. The
port tasks (T4-T6) run while `elkj` records.

### D9: Java line references

The six changed main files insert or remove lines mid-file. Every `<Name>.java:N` reference that points past a hunk is
renumbered from `git -C ../elk diff -U0 e7eaea57 8bca22f4`. This covers `src/`, `test/`, `tools/` and `docs/`
(`docs-site/` only where a page mirrors a renumbered line). References into a changed line are edited by hand. `plans/`
keeps the old numbers. `ElkGraphImporter.java` names two different files (layered and spore, and force has one too), so
disambiguate each reference by its bundle path or its surrounding text before renumbering it.
