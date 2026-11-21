<!-- SPDX-License-Identifier: EPL-2.0 -->

# vector-recorder-debts: mission brief (issue #50)

## Objective

Issue #50 names three recorder-tooling debts, all from `plans/roadmap.md` § Revisions 2026-10-28 and 2026-10-29:

1. **Multi-file build.** Every recorder is one `java` single-file source program (JDK 21's launcher takes one file),
   so the layered recorders run 1,858 to 4,752 lines. A `javac` multi-file build lets them be split.
2. **melk `List<Integer>`.** The melk recorder, `test/melk/recorder.ts`, cannot encode the `List<Integer>` default of
   `cmEnforcedGroupOrders`. It cannot tell an int from a double without an INT or DOUBLE option type. So
   `test/melk/layered-options.test.ts` and `test/melk/layered-registry.test.ts` filter that record out of their
   comparison with the dump and check it separately (`ShapePrimer`).
3. **`KVectorChain` dump.** `dumpLGraph` in `test/helpers/layered-framework-replay.ts` (the TS port of 7a T1's dump)
   writes a `KVectorChain` property value as `{ class: "KVectorChain" }`. The Java recorder writes a list there.
   `test/helpers/layered-site-replay-dump.ts` patches those values afterwards.

Planning found two facts the issue does not state:

- Items 2 and 3 are TS test-helper debts. They touch no recorder and no ref.
- The Java recorders already encode `KVectorChain` as a list: 9,893 `"c":"KVectorChain"` values in the refs and no
  `{class: …KVectorChain}`.

Exit (#50 "Done when"):

- **Item 1 done** ([D1](decisions.md#d1-an-opt-in-javac-build-beside-the-single-file-launcher)-[D3](decisions.md#d3-split-one-recorder-layeredloopsvectors-as-the-proof)).
  - `tools/vectors/java-program.sh` adds an opt-in `javac` build. `vector-cache.sh`, `layered-loops-vectors.sh` and
    `tools/oracle/loops-sweep.sh` launch through it.
  - `LayeredLoopsVectors.java` is split into an entry file and helper sources under `tools/vectors/LayeredLoopsVectors/`.
  - The other recorders are unchanged. Splitting them is filed as a `follow-up`.
- **Item 2 done** ([D4](decisions.md#d4-the-melk-recorder-takes-list-element-types-from-the-melk-model)).
  - The melk recorder encodes `List<Integer>` defaults, taking the element type from the vendored `.melk` model.
  - Both melk tests compare the `cmEnforcedGroupOrders` record (option and support) inside the full `diffCalls`
    comparison. No `ShapePrimer` exclusion is left for it.
- **Item 3 done** ([D5](decisions.md#d5-the-ts-dump-encodes-kvectorchain-as-the-recorder-does)).
  - `dumpLGraph` encodes a `KVectorChain` the way the recorder does.
  - The patch in `layered-site-replay-dump.ts` is removed once instrumentation shows that it patches nothing else
    (or it is narrowed, with the reason journaled).
- **Every ref is byte-identical** ([D6](decisions.md#d6-proof-every-cached-recorder-cold-the-loops-sweep-byte-equal)).
  - The proof: every script that sources `vector-cache.sh` reruns on a changed salt (no `hit`), and
    `git diff --exit-code <base> -- test/golden/refs/` is empty.
  - The loops sweep's `results.jsonl` is `cmp`-identical to its before-side.
  - Any ref change is an AD-13 STOP.
- Queue gates 1-7 are green and journaled. The mission lands as one squashed commit on the base, and
  `plans/roadmap.md` gains a `## Revision <date> (vector-recorder-debts)` section.

**Not in this mission:**

- Splitting any recorder other than `LayeredLoopsVectors.java`.
- Sharing one `Dump` encoder across the ten layered recorders.
- Changing what any recorder records, including the `LayeredOrderVectors.java:2491` row that skips its full dump
  (a comment-only update there is allowed, T3).
- Any `-XX:hashCode` change, #134 and #135, and any oracle patch, `ELK_COMMIT` change or rebuild.
- The translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md),
   [decision-journal.md](decision-journal.md), and these notes: `.agent-notes/recorder-identity-hash.md`,
   `.agent-notes/recorder-pin-source.md` (cold timings, load gate, the superset classpath) and
   `.agent-notes/vector-cache-and-key-line.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/vector-recorder-debts` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add vector-recorder-debts mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`f9e33263` at planning).
4. Oracle bookkeeping. At planning, `$ELK_ORACLE_DIR/oracle-build.json` names
   `8bca22f4afa3371562d2f702d59929818f7f7b71` and patches 0001-0004 (`builtAt` 2026-11-21T05:47:58Z), matching
   `tools/oracle/patches/`, and `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.
   Record its `shasum -a 256`, rerun the `git log`, and journal all three. If the stamp is off, rebuild with
   `tools/oracle/build.sh` and journal it.
5. `$ELK_MODELS_DIR` is at the commit in `test/corpus/manifest.json`. Journal it; the loops sweep reads it.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

Each task runs the checks in its own file. T6 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # the java suite scans tools/vectors, the split files too
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: empty
```

The full suite takes minutes. Start it detached as the queue rules show, and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest stop is 3: the split changes a byte of
`layered-loops.json`. The known trap is that the ref records the binary class name
`LayeredLoopsVectors$ShrinkWidthManager`, and the labels sweep records `LayeredLabelsVectors$ShrinkWidthManager`.

## Batch progress

| Batch                    | Name                                                    | Tasks      | Depends on | Status |
| ------------------------ | ------------------------------------------------------- | ---------- | ---------- | ------ |
| [1](batch-1/overview.md) | Build helper and launch sites; melk and dump TS debts   | T1, T2, T3 | —          | [x]    |
| [2](batch-2/overview.md) | Split `LayeredLoopsVectors.java`                        | T4         | 1 (T1)     | [x]    |
| [3](batch-3/overview.md) | Proof: cached recorders, the `elkj` lane, loops sweep   | T5         | 2          | [x]    |
| [4](batch-4/overview.md) | Close-out: docs, gates, follow-up, roadmap, squash      | T6         | 3          | [x]    |

## Execution model

Recommended executor: `fable`. T2 and T3 are TS-only and have write-sets disjoint from T1. They may run as one async
subagent while you do T1, or after it, in sequence.

- **T1 and T4 stay with the orchestrator.** Each must reproduce a ref byte for byte, and the orchestrator owns the
  long JVM runs.
- **Subagent briefs.** Hand a subagent the task file, the read-set, AD-13 and the commit rules from your system prompt.
- **Permissions.** The queue driver supplies the session's permissions, so no `.claude/settings.autonomous.json` is
  generated.

**Time:** about 2 h of edits and short runs, plus the `elkj` lane (4 h 03 min cold last time).

- T1 changes `vector-cache.sh`, which is in every salt, so every cached recorder goes cold once.
- Start the lane as soon as T1 is committed (T5 step 2 says how). Its two row programs' rows key on the salt only,
  so T2-T4 leave them warm.
- Do T2-T4 and the rest of T5 beside the lane, polling for at most 9 minutes at a time. Never end a turn while it runs.

## Landing

1. Tag the tip `vector-recorder-debts/pre-squash`.
2. `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>`.
3. The message:
   - Subject: `chore(vectors): add a multi-file recorder build and close tool debts` (or a better one within 72
     characters).
   - Body, saying why: the single-file launcher forces 4,000-line recorders; the melk record and the dump patch were
     workarounds; refs are proven byte-identical by a changed-salt run.
   - Footer `Refs: #50`, and the attribution trailer the session's system reminder names.
4. Never push.

## Reference

- [decisions.md](decisions.md): D1-D6 and the auto-confirmed record.
- [diagrams/component-map.md](diagrams/component-map.md).
- Issue #50. Precedent: `plans/recorder-pin-source/` (#96: the same cold-proof shape). Runbook
  `docs/architecture/elk-upgrade.md` § 7 and § 7.1 (the script list and cold times).

## Mission summary (2026-11-21)

**Tasks:** 6 of 6 done (T1-T6), in one session. No halt, no `needs-ruling`.

**Exit criteria.**

- Item 1 done: `tools/vectors/java-program.sh` (`jp_sources`, `jp_run`); `vector-cache.sh`, `layered-loops-vectors.sh`
  and `tools/oracle/loops-sweep.sh` launch through it; `LayeredLoopsVectors.java` is an entry file and ten helper
  sources. The other recorders are unchanged; splitting them is #143.
- Item 2 done: the melk recorder encodes `List<Integer>` defaults from the `.melk` model; both melk tests compare the
  `cmEnforcedGroupOrders` records in the full comparison, with no `ShapePrimer` exclusion.
- Item 3 done in its narrowed form: `dumpLGraph` encodes `KVectorChain`; the patch module stays because it still
  patches five other classes (journaled with counts; #144).
- Every ref is byte-identical: all 26 cached scripts recorded on a changed salt, the loops sweep is `cmp`-equal to its
  before-side, gate 7 is empty.
- Queue gates 1-7 green and journaled; one squashed commit on `f9e33263`; roadmap revision appended.

**Decisions made in execution** (all journaled; the ones worth a review):

1. `jp_run` takes the source-launcher command line as its arguments, so the pin fitness test still sees three
   `java -Delk.commit=…` lines in `vector-cache.sh` and stays unedited (T1).
2. The loops sweep stamp also hashes `java-program.sh` (T1; the task named only the sources).
3. The helpers of the split recorder are one chain of superclasses, not independent classes with qualified calls (T4):
   it keeps the static initialization order by rule and the diff to 123 insertions.
4. Every helper class name keeps the prefix `LayeredLoopsVectors`, because `elkFrame` filters stack frames by it (T4;
   a trap planning did not list).
5. `layered-loops-vectors.sh` passes `--plan-dump` through (T4; outside the write-set: the header's direct `java`
   recipe no longer compiles).
6. T3's `KVectorChain` arm encodes its items through `encodeValue`, as the recorder's collection arm does; the
   subagent's version skipped the depth rule for the items.
7. The cutting tool (Python, `$TMPDIR`) is not committed; its method is in `.agent-notes/vector-recorder-debts.md`.

**Planning assumptions that did not hold:** the patch module patches only `KVectorChain` (it patches five more
classes); it has 10 importers (56); the loops sweep dir is fresh at the base (it was stale, so the base run is the
before-side); an untracked planner note exists under `.agent-notes/` (none did).

**Gates:** `format:check`, `typecheck`, `complexity` exit 0; coverage 98.81 / 97.00 / 98.56 / 98.86 with 49,509 tests
passed and 0 failed; `docs:build` exit 0, 200 typedoc warnings; `codeql` ok, no new accepted entry; gate 7 empty.

**Agents used:** two `typescript-pro` subagents in the foreground, T2 and T3, each audited by the orchestrator.

**Follow-ups:** #143 (split the other recorders, shared `Dump` as a separate decision), #144 (`dumpLGraph`'s five
remaining `{ class }` values).

**Per-task history:** tag `vector-recorder-debts/pre-squash`.
