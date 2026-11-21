<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-evidence-gaps: mission brief (issue #49)

## Objective

Close the four coverage-evidence gaps the layered missions left open (#49; sources `plans/roadmap.md` revisions
2026-10-27 lines 610-612, 2026-10-30 line 773, 2026-11-02 lines 874-875, 2026-11-03 line 942). Each item ends with
oracle rows or a journaled unreachability proof. New expected values come only from the oracle (AD-13). No `src/` change
is planned: this is evidence work in recorders, refs and tests.

| # | Item | Gap today (verified at planning) | Task |
| - | ---- | -------------------------------- | ---- |
| 1 | `InvertedPortProcessorTest.testValidNodeOrder` vacuous | The 13 ptolemy rows of `layered-order.json` have no edge with a WEST source or EAST target after `INVERTED_PORT_PROCESSOR` (the 9 vendored ptolemy inputs contain none), so its assertions never run | [T1](batch-1/T1-inverted-port-rows.md) |
| 2 | `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` two-dummy row | `scenarios/port-dummy-size/*` put at most one N/S dummy in a layer, so `delta`/`step` (`HierarchicalPortDummySizeProcessor.ts:30-31, :69-86`) are proven by reading | [T2](batch-1/T2-port-dummy-size-sites.md) |
| 3 | Three Medium splitter arms | `HyperEdgeSegmentSplitter.ts:220 if[1]`, `:400 if[1]`, `:406 if[1]` unreached (`plans/layered-edge-routing/unreached.md:105, :114, :226`) | [T3](batch-1/T3-splitter-arms.md) |
| 4 | Port alignment and N/S border offsets end to end | No whole-layout layered row sets any `portAlignment.*`; only 3 `full/options/port-border-offset/*` rows set a border offset | [T4](batch-1/T4-alignment-offset-scenarios.md) |

Exit (#49): every item has oracle rows that reach it, or (item 3 only) a proof in [unreached.md](unreached.md); every
changed ref differs from the base only by rows this mission adds plus its `rowCounts` header ([D5](decisions.md#d5));
the TS replay matches every new row at the AD-4 bar; queue gates 1-7 green; one squashed commit on the base;
`plans/roadmap.md` gains `## Revision <date> (layered-evidence-gaps)`; `.agent-notes/layered-evidence-gaps.md` written.

**Not in this mission:** vendoring new ptolemy corpus models ([D1](decisions.md#d1)); `node-micro-layout.json`
(layered never calls `NodeMicroLayout`, [D4](decisions.md#d4)); editing any earlier mission's `plans/*` file (their
`unreached.md` stays as written; corrections go in this mission's [unreached.md](unreached.md)); oracle patches; the
parity report; any write to `~/git/knowvah/elk`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `.agent-notes/layered-evidence-gaps-planning.md`, and `gh issue view 49`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/layered-evidence-gaps .agent-notes/layered-evidence-gaps-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add layered-evidence-gaps mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`df990567` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning,
   built 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it. Record
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered
   plugins/org.eclipse.elk.alg.common` (empty at planning; a change is journaled, not a stop).
5. Baseline at planning: journal row `plan`. Rerun only if the base sha differs from `df990567`.
6. Before touching a ref, copy `test/golden/refs/java/` to `$TMPDIR/layered-evidence-gaps/refs-before/` and write the
   id-keyed diff script of [D5](decisions.md#d5) (scratch, not committed).
7. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. Files (each owned by one task):

| File | Action | Task |
| ---- | ------ | ---- |
| `src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts` | Modify | T1 |
| `tools/vectors/LayeredPlacementVectors.java`, `test/golden/refs/java/layered-placement.json` (regen) | Modify | T2 |
| HPDS class or placement replay test that pins `sites/*` ids, if any (T2 finds it) | Modify | T2 |
| `tools/vectors/LayeredRoutingVectors.java`, `test/golden/refs/java/layered-routing*.json` (regen) | Modify | T3 |
| `test/helpers/layered-routing-replay-ops.ts` (a `calls/HyperEdgeSegmentSplitter/*` handler, only if D3 step 2 is used) and the routing tests that pin row counts | Modify | T3 |
| `tools/vectors/LayeredPipelineVectors.java`, `test/golden/refs/java/layered-pipeline.json` (regen) | Modify | T4 |
| `plans/layered-evidence-gaps/unreached.md` | Modify | T3 |
| `docs/conformance.md`, `docs/architecture/alg-layered-placement.md`, `alg-layered-routing.md`, `alg-layered-pipeline.md` | Modify | T5 |
| `plans/roadmap.md`, `.agent-notes/layered-evidence-gaps.md`, this README, the journal | Modify/Create | T6 |

## Quality gates

After each task: its own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed files>`,
and the D5 id-keyed diff of the ref it regenerated. T6 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # journal the typedoc warning count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --stat <base> -- test/golden/refs/                       # gate 7: only the D5 refs
```

Gate 7: T6 reruns the three recorders (placement, routing, pipeline) once more on the final tree and checks
`git diff --exit-code test/golden/refs/`. JVM runs: check `uptime` (wait above 12), run under `nice -n 10`, detached with
`echo "exit $?"` as the log's last line, polled in ≤ 9-minute foreground waits. Recorder runtimes are unknown at
planning: journal each.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). Most likely to fire: 2 (a TS replay mismatch on a new row) and 4 (item 3,
`:406`, neither constructed nor proven).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | The four items | T1, T2, T3, T4 | — | [x] |
| [2](batch-2/overview.md) | Docs; close-out and squash | T5, T6 | 1 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns every JVM run, every ref regeneration, every commit, every `gh`
call, `plans/` and `.agent-notes/`. Batch 1 write-sets are disjoint: T1 (no JVM) and T3's floating-point search may run as
subagents (`typescript-pro`, sonnet) with private `$TMPDIR/layered-evidence-gaps/<task>/` scratch; the task file is the
prompt. Subagents never commit, never run the full suite or a JVM, and return their report for the orchestrator to
journal. Run the three recorders one at a time (load). One commit per task before the squash.

## Landing

Subject `test(layered): close four coverage-evidence gaps` (48 characters). Body: per item, the rows added (ids, counts) or the proof; the refs that moved by script (D5 diff result);
any finding or `needs-ruling` issue. Footer `Refs: #49`, no attribution lines (queue rule). Tag
`layered-evidence-gaps/pre-squash`, `git reset --soft <base>`, one commit with `git -c commit.gpgsign=false commit -F
<file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[unreached.md](unreached.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-21)

**Tasks.** T1-T6 of 6 completed. T1 was written by a `typescript-pro` subagent (sonnet) and finished by the
orchestrator; T3's floating-point search ran in a fork of the orchestrator; everything else, every JVM run, ref, commit
and `gh` call was the orchestrator's.

| Item | Closed by |
| ---- | --------- |
| 1 `testValidNodeOrder` | Found rows: six of the 16 other IPP rows execute assertions and pass; the 13 ptolemy rows stay vacuous (0 edges each); `freePorts` is outside the Java test's contract |
| 2 HPDS `delta` / `step` | Six `sites/HierarchicalPortDummySizeProcessor/*` rows (`layered-placement.json` 604 → 610) |
| 3 Three splitter arms | Seven `sites/HyperEdgeSegmentSplitter/*` layout rows, rung 1 for all three (`layered-routing-steps.json` 277 → 284); each arm counted on the oracle JVM with jdb; [unreached.md](unreached.md) |
| 4 Port alignment, border offsets | 72 `scenarios/PortAlignment/*` and `scenarios/PortBorderOffset/*` rows (`layered-pipeline.json` 1,239 → 1,311) |

**Decisions journaled.** 29 journal rows. Push-forward calls worth a look: six HPDS rows instead of three (T2); the
`consumed` splitter variants, on which the recorded bends depend on the arm (T3); each T4 graph recorded twice
(`…/ports` at `LABEL_AND_NODE_SIZE_PROCESSOR`, `…/end` at the plan's end), because a whole-plan row records no port
position, and two overhang rows beyond D4's matrix; `freePorts` left out of the T1 rows with the diagnosis in the journal.
Write-set extensions, each journaled: `HierarchicalPortDummySizeProcessor.test.ts`, `OrthogonalEdgeRouter.test.ts`,
`test/helpers/layered-routing-replay-rows.test.ts` (D6 inventories), the new
`HyperEdgeSegmentSplitter.sites.test.ts`, and `docs/architecture/overview.md` (three counts).

**Gates.** Queue gates 1-7 green on the final tree (journal rows `T6 gate`): format, typecheck, complexity exit 0;
coverage 98.81 / 97.00 / 98.56 / 98.86 with 49,487 tests passed; docs build with 200 typedoc warnings; codeql with no
new accepted entry; the three recorders reproduce the committed refs byte for byte. Two fixes were needed on the way
(a recorder helper deleted by a comment edit; an unchecked `parseInt` CodeQL flagged), one attempt each.

**Issues.** #140, #141, #142 (`follow-up`). No `needs-ruling`; no stop condition fired.

**Known gaps.** The ptolemy rows of item 1 stay vacuous (#140). `HyperEdgeSegmentSplitter.ts:406 if[1]` is recorded
only with negative coordinates (#141). One recorder run of T4 started above the load bar (journaled; rerun under gate 7).
