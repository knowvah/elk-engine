<!-- SPDX-License-Identifier: EPL-2.0 -->

# Deferred bundles ADR: mission brief (roadmap row 11, issue #42)

## Objective

Decide, with evidence, what happens to the three bundles CLAUDE.md lists as "Deferred (roadmap decides)":
`alg.libavoid` (drives an external C++ libavoid server), `alg.graphviz.dot` (Xtext DOT grammar plus ElkGraph↔DOT
transforms) and `alg.graphviz.layouter` (drives an external Graphviz `dot` binary). For each, weigh skip, port, or delegate to
`@knowvah/dot-engine`, and record a go/no-go in an ADR. Output is an ADR, not code (roadmap § 11).

Exit (issue #42 "done when", roadmap § 11):

- `docs/architecture/deferred-bundles-adr.md` exists with **Status: Proposed**, one go/no-go per bundle and the evidence
  (callers, browser safety, dependency rules, effort), backed by `plans/deferred-bundles-adr/evidence.md` (DB1, DB5);
- a `needs-ruling` issue asks the maintainer to accept it, and #42 is commented (DB2);
- `test/architecture/bundle-deps.json` and `tools/bundle-deps.ts` are unchanged, since no bundle is adopted before the
  ruling (DB3); the existing fitness tests are cited as the enforcement (DB4);
- the queue gates pass; one squashed commit on the base; `plans/roadmap.md` gains `## Revision <date> (deferred-bundles-adr)`.

**Not in this mission:** any port or prototype; any change to `src/`, `test/`, `tools/`, refs, CLAUDE.md, the skeleton's
AD rows, or `docs/conformance.md`; an oracle rebuild or JVM run (DB7); anything in `../dot-engine`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/deferred-bundles-adr-planning.md`, `.agent-notes/conformance-corpus.md` (census) and
   `.agent-notes/graph-text.md` (the hand-written-parser cost, relevant to `GraphvizDot.xtext`). Journal what affects the
   approach.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/deferred-bundles-adr .agent-notes/deferred-bundles-adr-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add deferred-bundles-adr mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, else that commit's parent (at planning `887d11e9`, the row-10
   squash).
5. Oracle: journal what `$ELK_ORACLE_DIR/oracle-build.json` names (DB7: journal only, no rebuild). Run
   `git -C $ELK_SOURCE_DIR log --oneline 8aaa3c14..HEAD -- plugins/org.eclipse.elk.alg.libavoid plugins/org.eclipse.elk.alg.graphviz.dot plugins/org.eclipse.elk.alg.graphviz.layouter`;
   at planning it prints nothing.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

Docs-only mission. After T2: `npm run format:check` and `npm run docs:build`. At mission end T3 runs queue gates 1-6 alone
(check `uptime` first; above 12, wait) and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build
git diff --exit-code <base> -- test/golden/refs/                  # empty: no recorder input changes
```

Run `coverage` detached (`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &`) and poll in the
foreground for at most 9 minutes at a time. Commit each task with `git -c commit.gpgsign=false commit -F <file>`.

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md). Most likely to fire: 4 (a bundle whose evidence does not settle a verdict: write
"no recommendation" rather than guess) and 5 (a delegate recommendation that needs CLAUDE.md's zero-runtime-dependency rule
amended: propose, never change the rule).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Evidence per bundle | T1 | — | [x] |
| [2](batch-2/overview.md) | Proposed ADR, inventory and port-map links | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Acceptance issue, roadmap, notes, gates, squash | T3 | 2 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

Recommended executor model: `fable`. All three tasks are small enough for the orchestrator; a read-only `Explore` subagent
may run T1's greps, and `technical-writer` (sonnet) may draft T2. Subagents never commit and never write `plans/`.

## Mission summary

**Tasks.** 3 of 3 planned tasks completed (T1-T3) in 3 batches, all by the orchestrator; no subagent was used (journal
`start` `plan`). The ADR: [`docs/architecture/deferred-bundles-adr.md`](../../docs/architecture/deferred-bundles-adr.md);
its evidence: [evidence.md](evidence.md); the roadmap revision `## Revision 2026-11-13 (deferred-bundles-adr)` in
`plans/roadmap.md`; execution notes: `.agent-notes/deferred-bundles-adr.md`.

**Recommendation.** No-go for all three bundles in this package: `alg.libavoid` skip, `alg.graphviz.dot` skip,
`alg.graphviz.layouter` skip here, with a dot-engine delegate only as a separate package when a consumer asks. Acceptance is
the maintainer's, on #88.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| the ADR exists with Status Proposed, one go/no-go per bundle and the evidence (DB1, DB5) | `docs/architecture/deferred-bundles-adr.md`, three recommendation rows, each citing `evidence.md` rows; 13 DB5 rows per bundle | T1 `note`; T2 `note` |
| a `needs-ruling` issue asks for acceptance and #42 is commented (DB2) | #88, open, `needs-ruling`; comment on #42 | T3 `ruling` |
| `bundle-deps.json` and `tools/bundle-deps.ts` unchanged (DB3) | byte-identical to the base; the table equals a regeneration from the pinned manifests | T3 `note` (second row) |
| the existing fitness tests are cited as the enforcement (DB4) | `:322` always runs; `:342` runs only at the pin and is skipped here (#89) | T1 `note` (second row); T2 `note` |
| inventory and port map link the ADR and keep `Deferred` (DB6) | rows 38-40 and one sentence after `port-map.md:627` | T2 `note`, `gate` |
| no oracle or JVM work (DB7) | none run; the oracle stamp is journaled | start `start`; T1 `note` |
| the queue gates pass; one squashed commit on the base; the roadmap gains the revision | gates 1-6 green (coverage on the one allowed rerun, #87); revision appended; one commit on `887d11e9`, history under the tag `deferred-bundles-adr/pre-squash` | T3 `gate` (two rows), `note` |

**Decisions made.** DB1-DB7 as planned. Stops 4 and 5 did not fire: every verdict follows from evidence rows, and the
delegate route named for `alg.graphviz.layouter` (a separate package, AD-14) amends no locked rule. Deviations, all
journaled: shared findings are stated once as `S-n` rows instead of per bundle (T1 `plan`); the ADR says that the third
fitness test DB4 cites is skipped off the pin (T1 `note`); the ADR links the brief's evidence and carries no diagram of its
own (T2 `note`). Nothing under `src/`, `test/` or `tools/` changed, and no expected value, ref, vector or tolerance.

**Issues filed.** #88 (`needs-ruling`): accept the ADR. #89 (`follow-up`): the bundle-deps regeneration fitness check is
skipped unless the ELK checkout's HEAD is the pin. Comments: #42 (ADR path and #88), #87 (the intermittent `childPids()`
check also failed at `ts-layout-shards.test.ts:296`).

**Known issues.** The first coverage run failed on the #87 intermittent alone and passed on the rerun; its mechanism is
still unknown. Whether an LGPL-2.1-or-later port of libavoid could ship in an EPL-2.0 package was not answered; the ADR lists
it as a cost of that option.
