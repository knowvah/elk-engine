<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered compound graphs — Mission Brief (mission 7h, issue #36)

## Objective

Make hierarchical layout (`hierarchyHandling: INCLUDE_CHILDREN`) run in the layered pipeline. Port `J/compound/**`
(`CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`, `CompoundGraphPreprocessor`, `CompoundGraphPostprocessor`) and
`HierarchicalNodeResizingProcessor` (about 1,735 Java lines), wire the last pending arm of `IntermediateProcessorStrategy`, prove
the 7f-landed hierarchical driver (`doCompoundLayout`, `hierarchicalLayout`, `ElkLayeredHierarchy.ts`) against the oracle, and
close the hand-offs of `plans/roadmap.md` § Revision 2026-11-10 (layered-loops-wrapping-compaction) "Hand-offs to 7h" (H1, H8).

Exit (issue #36 "done when"):

- all 97 `alg.layered.test` files are ported (88 at planning; the 9 of [java-baseline.md](java-baseline.md)) and green, with the
  Java's own assertions; the 3 `elk.stress` cases wait on H13's ruling issue; the oracle runs equal the baseline at mission start
  and end; the 3 graph.json methods deferred to 7h are ported (H6);
- every row of the new `test/golden/refs/java/layered-compound.json` replays at the AD-4 bar through the real pipeline (H2);
- a layered golden per direction and per hierarchy-handling mode equals the oracle: `test/golden/refs/elk-layered/` (24 refs,
  H4); the landed `refs/elk` and `refs/elk-algorithms` regenerate byte-identically;
- no processor arm is pending (enum 59 ported, 0 pending); `staged-classes.json` is `[]`; the `include-children*` site rows
  compare their recorded layout; the compound sweep matches at stride 1 with the 50 label-sweep refusals as cases (H5);
- every H8 hand-off is reached by a row or re-classified with its Java line; landed vectors, goldens and refs are byte-identical;
- the queue gates pass; one squashed commit on the base (H9); `plans/roadmap.md` gains `## Revision <end date> (layered-compound)`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full; the queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
   7g's W-rows, 7f2's G-rows and 7f's F-rows apply where H1–H14 are silent.
3. Read `.agent-notes/layered-loops-wrapping-compaction.md`, `layered-labels.md`, `layered-pipeline.md`,
   `recorder-identity-hash.md` and `layered-compound-planning.md`. State in the journal what affects the approach: whole-plan
   refusal, plans captured in the real run, `-XX:hashCode=2`, the four recorder dump rules, marker-and-row staging, `toEqual` on
   enums being vacuous, shared support inside `src/` having to be a `.test.ts`, the launcher masking short stacks, `run.sh` lacking
   `-XX:hashCode=2`, and `variants.json` feeding the corpus sweep.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is uncommitted, commit it:
   `git add plans/layered-compound .agent-notes/layered-compound-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add layered-compound mission brief"`.
5. Check the oracle stamp (`$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and patches `0001`, `0002`) and
   `git -C $ELK_SOURCE_DIR diff --stat <pin>..HEAD` over the layered, core, common, graph, graph.json and both test bundles (at
   planning: only `GraphFeature.java:45`, a prose fix the TS already has; journal any other change).
6. File H13's `needs-ruling` issue with the text in [stop-conditions.md](stop-conditions.md#h13-issue-text) (planning could not
   file it), and journal its number.
7. Run [java-baseline.md](java-baseline.md)'s commands (both parts) and journal them; any difference is stop 18.
8. Measure `npm test` (every sweep dir `/nonexistent`) and journal it with `uptime` as stop 11's baseline.
9. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec `J`, tests `JT`, `JG` | as in [decisions.md](decisions.md) |
| Recorder pattern | `tools/vectors/LayeredLoopsVectors.java` (core, `--sweep`/`--dump`, refusal, step ops), `layered-loops-vectors.sh`, `tools/oracle/loops-sweep.sh` |
| Replay pattern | `test/helpers/layered-loops-replay-*.ts`, `layered-labels-replay-*.ts`, `layered-pipeline-replay-*.ts`, `layered-loops-sweep.ts` |
| Runner | `test/helpers/layout-test-runner.ts`, `layout-test-sources.ts` |
| Goldens | `tools/oracle/regen-goldens.sh`, `test/golden/layered-goldens.test.ts`, `test/corpus/{manifest,variants}.json` |
| Models | `test/golden/inputs/**`; `$ELK_MODELS_DIR` pinned `ac5af2ba…` (`tickets/layered/{316,455,552,596,628,665,700,701,734}_*`, `examples/hierarchy/**`, the 23 `INCLUDE_CHILDREN` `.elkt`, `realworld/ptolemy/hierarchical/**`) |
| Oracle | `$ELK_ORACLE_DIR` (built; check the stamp); JDK 21; `MODELS_REPO` for the suites |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed recorder or sweep script, `tools/oracle/run.sh`,
  `test/corpus/{manifest,variants}.json`, any landed file under `test/golden/refs/`, `test/helpers/*-fixtures.ts`, or the landed
  replay helpers (new files import them). The exceptions are H4's additive `regen-goldens.sh` set and H7's files.

## Quality gates

Agents run, in the foreground, their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone** (check `uptime`; check `ps` for
orphaned vitest workers; rerun timeout-only failures at normal load):

```bash
npm run format:check && npm run typecheck && npm run complexity   # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk                        # incl. entry points and staged classes
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90 (the full suite)
env $SWEEPS npm test                                              # ≤ baseline + 20 s (stop 11)
npx vitest run src/alg/layered/LayeredCompoundVectors.test.ts     # alone ≤ 30 s, from T9
git diff --name-status <base> -- test/golden/refs/ test/corpus/ test/golden/inputs/ test/golden/*.json
#   only: A refs/java/layered-compound.json, A refs/elk-layered/**, A golden/layered.json, A inputs/compound/**,
#   M inputs/manifest.json, A corpus/compound-sweep.test.ts (plus layered-label-metrics.json added keys only, stop 20)
```

At mission end, also run the following (queue gates 1–6 plus the oracle evidence; journal each result):

```bash
npm run docs:build
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options        # byte-identical
for v in framework phase order placement routing site pipeline labels loops; do bash tools/vectors/layered-$v-vectors.sh <s>/$v; done
#   each ref cmp-identical to test/golden/refs/java (landed refs still reproduce)
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms && tools/oracle/regen-goldens.sh --set layered \
  && git diff --exit-code test/golden/refs/elk*                    # byte-identical incl. the new set
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <java-baseline.md's suites>   # equal to the baseline (+ graph.json copy)
bash tools/oracle/compound-sweep.sh && npx vitest run test/corpus/compound-sweep.test.ts   # stride 1
```

JVM recorders and sweeps: check `uptime` first (above 12, wait), then run
`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &` with foreground polls of at most 9 minutes.
Parallel agents never run `npm run coverage` and never commit.

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists 22, in the queue form (a partial block → `needs-ruling`, finish the rest). The
most likely: 3 AD-13, 17 divergence (a hashed container's order, H3), 19 a landed driver defect, 22 upstream.

Push-forward (decide and journal): splits (sections behind a facade, nested types in prefixed files, helpers at Java boundaries);
rows, families, trims to fit 16 MiB, and stop selections with their TS twins; AD-10 insertion order with a twin where iteration
is observable; sweep stride, timeout and out-of-scope counts; U with its Java line; label texts under G8's proof; agent prompts,
scratch directories, test organisation, prose typos per CLAUDE.md, 1–3 line pre-existing fixes, timeout-only reruns, journal
rows, `.agent-notes/layered-compound.md`, and `follow-up` issues for defects outside the mission.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorder, replay helpers, layered golden refs | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Cross-hierarchy edges, node resizer | T4, T5 | 1 | [x] |
| [3](batch-3/overview.md) | Compound processors (sections behind facades) | T6, T7 | 2 | [x] |
| [4](batch-4/overview.md) | Wiring, unstaging, pre-approved assertions | T8 | 3 | [x] |
| [5](batch-5/overview.md) | Replay every row with H3 twins; golden test | T9, T10 | 4 | [x] |
| [6](batch-6/overview.md) | Suites; coverage map; compound sweep | T11, T12, T13 | 5 | [x] |
| [7](batch-7/overview.md) | Site rows | T14 | 6 | [x] |
| [8](batch-8/overview.md) | Anchored unit tests, mutation checks | T15 | 7 | [x] |
| [9](batch-9/overview.md) | Docs, roadmap revision, notes, squash | T16 | 8 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T12)

## Mission summary

**Tasks done: 16 of 16** (T1-T16; batches 1-8 marked done, batch 9 is T16: the docs, the roadmap revision, the notes and this
summary; the mission-end gates and the squash are the orchestrator's, results are the open placeholders below).

**Exit evidence**, item by item against the "Exit" list:

1. 97 of 97 `alg.layered.test` Java files have a port (T11); the nine issue suites and the three graph.json methods (H6:
   `EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest`) pass with the Java's own assertions. The 3
   `elk.stress` cases wait for H13's ruling, issue #58 (`Issue665Test` 1 case, `Issue700Test` 2 of 4; `STRESS_PENDING`). Oracle
   runs at mission start equal the baseline (stop 18); mission end: equal (the nine suites 4, 2, 1, 1, 4, 1, 4, 6, 3 runs and the
   graph.json suites 1, 4, 3 runs, 0 failures).
2. `layered-compound.json` (12,237,513 bytes): `full` 355, `models` 73, `scenarios` 88, `sites` 24 (540 rows); every row replays
   through the real driver at the AD-4 bar with 0 mismatches (T9, T14: 542 tests, 5.3 s alone at batch 7).
3. `test/golden/refs/elk-layered/` holds 24 refs (T3), all equal to the TS layout at AD-4 (T10, 27 tests); the same 24 cases
   without `-XX:hashCode=2` are byte-equal to them. `refs/elk` (4) and `refs/elk-algorithms` (9) regenerated byte-identically at
   T3; mission end: `regen-goldens.sh`, `--set algorithms` and `--set layered` leave all three ref sets byte-identical.
4. Enum 59 ported, 0 pending (T8); `staged-classes.json` is `[]`; the `include-children*` site rows compare their recorded
   `layout` and `elk` (T8: `LayeredSiteVectors.test.ts` 351 of 351); the compound sweep at stride 1 matches: 1,169 oracle
   cases, 1,164 ok hash-equal, 5 throws equal, 0 mismatches (T13). The 50 label-sweep refusals are part a's candidates, 45 after
   the stress filter (T13); mission end: the sweep stamp is fresh for the final recorder source (1,169 cases, 1,164 ok, 5 throws,
   0 timeouts, recorded after T14) and `compound-sweep.test.ts` passes at stride 1 (45.5 s).
5. H8 hand-offs: 17 closure rows (reached 7, S 4, U 2, open 1, mixed 2, keep 1; T12); the 25 arms neither reached nor proven dead
   are issue #59. C3's re-measure (T9) and C7's re-evaluation (the recursion stays as ported) are journaled. Landed vectors, goldens
   and refs are byte-identical to the base (refs diff, batches 1-8); `layered-label-metrics.json` gained 16 keys (stop 20's
   push-forward); mission end: the eleven vector scripts (framework, phase, order, placement, routing, site, pipeline, labels,
   loops, compound, label-metrics) reproduce their 12 refs byte for byte, and `melk:generate` changes nothing.
6. Queue gates: batch gates 1-8 passed (journal rows); mission-end gates: all green (below). One squashed commit on the base (H9),
   with the per-task history under the tag `layered-compound/pre-squash`. `plans/roadmap.md` gains `## Revision 2026-11-10 (layered-compound)` (T16).

**Decisions made during the run** (the journal holds each row): the compound `models` and `scenarios` rows run through
`RecursiveGraphLayoutEngine`, like `full` (T1, T2); a stop is numbered as the recorder's `stopProcessor` does, also on a flat
run (T2); the dump gained `layerNodes` (T1 `fix`); `order: 'reversed'` switches for the H3 twins became per-site objects (T9);
a `sites` throw row has the shape `expected.throws` and a replay compares class and the first ELK frame by stack inspection
(T14); H5 part (c) applies `INCLUDE_CHILDREN` at the root of every ptolemy hierarchical file (T13); `STRESS_PENDING` sits in
`test/helpers/stress-pending.ts` (T11); the three stale p3order test titles went to issue #62; the H3 twins are asserted per site, and the one observable site
(`CompoundGraphPostprocessor.java:89`) as "Java order matches the oracle, reversed does not" (T9).

**Divergences fixed at origin.** The TS multimaps had no `toString` (`src/guava/Multimap.ts`, T14: the debug JSON printed
`LinkedHashMultimap@H`). Helper defects, none a port divergence: `compareLayerNodes` spread the expected graph into both
sides (T6); the value-form maps of `compareTree` (T7); `layerNodes` compared in raw form (T8); the narrowed outside-element
class (T9). No defect was found in the 7f driver and no layout divergence in the 7h classes (known divergences: none).

**Gates (batches).** Batch 8: `format:check`, `typecheck`, `complexity` clean; `test/architecture test/melk` 448 pass; coverage
98.82 / 96.83 / 98.78 / 98.82 (956 files, 45,206 tests); `npm test` 108.2 s at load 88 (baseline 82.4 s at load 11, not a
comparable reading). Mutation checks (T15): 206 mutants, 185 killed by the replay stage and the class tests and twins, 21
survived (equivalent, or reached but not observed by a recorded field); the anchored files alone kill 129. Mission-end
gates (queue gates 1-6 and the oracle evidence): `format:check`, `typecheck`, `complexity` clean; coverage 98.82 / 96.83 /
98.78 / 98.82 (956 files, 45,206 tests); `docs:build` green; refs regenerate byte-identically (above); the Java suites equal the
baseline; the sweep matches at stride 1. `npm test` re-measure at mission end: 96.1 s starting at load 4.6 (baseline 82.4 s at
load 11, budget + 20 s; other repositories' workers started during the run, load 125 at its end); `LayeredCompoundVectors.test.ts`
alone 5.0 s (budget 30 s).

**Flags for the maintainer.** Open `needs-ruling`: #61 (upstream drafts U1-U5 of this mission), #59 (25 arms neither reached nor
proven dead), #58 (three stress cases, 8b); earlier and still open: #56, #54, #53, #52, #51. `follow-up`: #60 (oracle graphs
for the mutants no recorded field observes), #62 (three test titles), #63 (the `STRIP_KEYS` hand-off), #55 (7g). The three oracle throws the port reproduces
(`SplineSegment.java:247`, `ElkGraphImporter.java:1146`, `LGraphUtil.java:944`) are pinned by `sites` throw rows and drafted in
#61; nothing is filed upstream. Hand-offs: to 9 (`tools/corpus/ts-layout-compare.ts` registers no layered algorithm), to 8b
(#58, `STRESS_PENDING`, the third stress input `588_hierarchicalLayoutNPE.elkt`), to 12 (the new architecture page).
