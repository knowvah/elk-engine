<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK pin move e7eaea57 → 8bca22f4: mission brief (issue #104)

## Objective

Move `tools/oracle/ELK_COMMIT` from `e7eaea5747f2e5187a7b83cfdc256b501ca00d3c` to
`8bca22f4afa3371562d2f702d59929818f7f7b71` (upstream `master` after eclipse-elk/elk#1244), following runbook
`docs/architecture/elk-upgrade.md` sections 2-13 as #99 did. Port the net Java diff (six upstream PRs, 11 files: 6 main,
5 test) with its JUnit classes. Rebuild the oracle, re-record every stamped ref, regenerate the goldens, rerun every
sweep and the ported suites, and triage every diff against the issue's "Expected ref and verdict changes". Issue #104 is
the maintainer's ruling for the move and for regenerating the stamped refs (AD-13, runbook § 1).

Exit (#104):

- The oracle at `../elk-oracle` is built at `8bca22f4` plus patches 0001-0003. Every recorder, regen and sweep is rerun.
  Every ref diff is classified as stamp-only, content (traced to a row of #104's net-diff table) or tool-side.
- The five upstream JUnit classes are ported (tests first). The five main Java changes and the two `.melk` changes are
  ported at their sites with `@see` kept, and the Java line references after each hunk are renumbered.
- The expected changes are confirmed or refuted with evidence: the 213 `sort` rows (#75), the `placeBeside` stops (#78,
  #73), `modelOrderCycleBreaking` (#84), and the 788 `sporeOverlap`/`sporeCompaction` cases that become comparable plus
  the #79 cases and the ptolemy scanline throws. #73, #75, #79 and #84 each get a comment with the result.
- Queue gates 1-7 are green and journaled. One squashed commit lands on the base. `plans/roadmap.md` gains
  `## Revision <date> (elk-pin-move-8bca22f4)`, and `.agent-notes/elk-pin-move-8bca22f4.md` is written.

**Not in this mission:** any write in `../elk` (it is already at `8bca22f4`; build.sh's worktree metadata is the one
exception), `git worktree remove|prune` there, and writes to `~/git/knowvah/elk-upgrade-before/` (`$B`, read-only). Also
out: editing an oracle patch, filing upstream, the deferred bundles, and #96, #97 and #89 (single sha source, the
`java-tests.sh` bundle list, the HEAD check). The runbook's rehearsal mode is out too.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   then the runbook `docs/architecture/elk-upgrade.md` in full.
3. Read these `.agent-notes/` files: `elk-pin-move-8bca22f4-planning.md` (this brief's planning facts),
   `elk-pin-move-e7eaea57.md` (the last move: line renumbering, the `pgrep` self-match, ref counts under `test/helpers/`),
   `elk-upgrade-runbook.md` (costs, stamp sites, the vitest `--silent=false` caveat) and `ts-parity-dashboard.md` (sweep
   runbook). Journal anything that changes the approach.
4. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/elk-pin-move-8bca22f4 .agent-notes/elk-pin-move-8bca22f4-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add elk-pin-move-8bca22f4 mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`9c420f07` at planning).
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npm run format:check`. After a docs edit: `npx vitest run test/docs`.
T8 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build && npm run docs:linkcheck                      # typedoc warnings stay at 200
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --stat <base> -- test/golden/refs/                       # every changed ref journaled with its class (T3)
```

Gate 7: every recorder and regen script reruns (the pin and every recorder constant change). So the ref diff is not
empty. Each changed ref is journaled as stamp-only or content, and each content ref with its #104 row (D5).

Long JVM jobs run detached (`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &`), capture
their pid with `$!`, and are polled in the foreground for at most 9 minutes at a time. Check `uptime` before each JVM job:
above 12, wait. Never run more than two JVM jobs at once.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The ones most likely to fire: 4 (a ref change that no #104 row explains),
5 (an assertion change outside D5), 7 (a new spore TS finding without a mechanism).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Preconditions, bump, oracle build, metadata | T1 | — | [x] |
| [2](batch-2/overview.md) | Re-record vectors and goldens; triage the ref diff | T2, T3 | 1 | [x] |
| [3](batch-3/overview.md) | Port rectpacking, spore and layered changes with their JUnit classes | T4, T5, T6 | 2 (T3) | [x] |
| [4](batch-4/overview.md) | Sweeps, ported suites, #79 classification | T7 | 3 | [x] |
| [5](batch-5/overview.md) | Close-out: prose, renumbered docs refs, issues, gates, squash | T8 | 4 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns every JVM run, the oracle, `plans/`, every commit and every `gh`
call. T4, T5 and T6 have disjoint write-sets and may run as three parallel subagents (`typescript-pro`, sonnet) once T3
has re-recorded `rectpacking.json` and `spore-layout.json`; T6 needs no ref and may start once T1 has regenerated the
options. Subagents never commit, never start a JVM, never write `plans/` or `.agent-notes/`, and return their findings to
the orchestrator. The `elkj` lane (T2) runs for hours; T3-T6 run beside it.

## Landing

Land one squashed commit on the base with subject `chore(oracle): move the elk pin to 8bca22f4` (Conventional Commits,
≤ 72 characters, lowercase). The body gives the why: the five upstream PRs, the ported files, the content refs with
their PRs, the sweep outcome, and any `needs-ruling` issue. Footer: `Refs: #104, #73, #75, #79, #84`, no attribution
lines (queue rule). Tag the per-task history `elk-pin-move-8bca22f4/pre-squash`, then `git reset --soft <base>` and make
one commit with `git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-18)

**State: halted at gate 4 on one test that needs a ruling (#105). Everything else is done, committed and unsquashed.**

- **Tasks.** T1-T7 complete. T8 complete except the green coverage gate and the squash, which wait for #105.
- **Pin and oracle (T1).** `tools/oracle/ELK_COMMIT` and the 41 recorder constants name `8bca22f4…`; the oracle built in
  167 s with patches 0001-0003 on JDK 21.0.1. `SPOrE.melk` and `Layered.melk` changed; the four regenerated option files
  are exactly the two hunks.
- **Refs (T2, T3).** Every stamped ref is re-recorded: 44 vector refs (38 stamp-only, the six `elkj` refs among them), 10 golden `_meta.json`, the census, the `.melk` manifest and `bundle-deps.json`. Content refs, each traced to a PR in the journal: `metadata.json`,
  `layered-framework.json`, `layered-compound.json`, `spore-layout.json`, `rectpacking.json`. The 15 JDK-only refs and every
  golden output are unchanged. Two recorder changes follow the Java (D1: the `sort` comparator copy; D4: `scanlineHitboxes`
  re-planned as a full row with its stops).
- **Port (T4-T6).** The six changed Java files and the five JUnit classes, tests first. Line references renumbered in
  `src/`, `test/`, `tools/` and `docs/`.
- **Sweeps and suites (T7).** All twelve sweeps reran, the `elkj` sweep last and alone (5 h 47 min, byte-equal to the old oracle's). Spore: no nondeterministic case left; the port agrees on all 1,812 spore
  cases; the only TS finding is the accepted #68 case. Ten other sweeps are byte-equal to the old oracle's; `compound` differs
  in 5 `frame` fields. JUnit: the 92 old classes identical, 100 classes and 51,299 runs with 0 failures; the five new or
  changed classes pass on the oracle.
- **#104's expectations.** #73, #75, #84 confirmed; #79 settled; one refuted: 27 `sporeOverlap` cases still throw
  "Invalid hitboxes" (through `NaN` rectangles, #108).
- **Decisions.** D1-D9 applied as written. Push-forward decisions journaled: `ensureNoModelOrderStrategies` lives in
  `ElkGraphImporterModelOrder.ts` with its `switch` in a helper (D6); `createRandom()` split out of spore's `importGraph`
  (complexity); the spore source texts are rewritten, not removed (D5.4); the second sweep was spore-only. For review: the
  D5.6 reading of the comparator's tie test (in #105).
- **Gates.** Format, typecheck, complexity, docs build (200 typedoc warnings), link check, both pack smokes and CodeQL are
  green. Coverage is 98.92 / 96.99 / 98.84 / 98.92 with one failing test, the #105 row: gate 4 is red.
- **Issues.** Filed: #105 (`needs-ruling`), #106-#109 (`follow-up`). Commented: #73, #75, #79, #84, #104. Closed: none.

**To finish after the ruling on #105** (if yes):

1. `git apply plans/elk-pin-move-8bca22f4/needs-ruling-updateGraph-collapse.patch`, then
   `npx vitest run src/alg/spore/ElkGraphImporter.test.ts` (192 of 192).
2. Check `oracle-build.json` still names `8bca22f4…` and patches 0001-0003; rerun gates 1-6 and
   `git diff --stat 9c420f07 -- test/golden/refs/` (the journal's T3 and T2 rows list every changed ref).
3. Journal the result, append one line to the roadmap revision of this mission, and commit.
4. `git tag elk-pin-move-8bca22f4/pre-squash`, `git reset --soft 9c420f07cb73bac91ca7584f7faa1e5fbef8d0d2`, one commit
   `chore(oracle): move the elk pin to 8bca22f4` with `Refs: #104` and no `Closes`.

If the ruling is no, the test stays and the port of #1244's `updateGraph` hunk is the open question; nothing else depends
on it.

## Close-out after the ruling (2026-11-19)

**State: done.** #105 was ruled yes on 2026-11-19; the section above is the state at the halt and is kept as written.

- **The ruled test.** The patch is applied as proposed: the `updateGraph` test of `ElkGraphImporter.test.ts` asserts the
  shift of #1244 (two map entries, the first two draws of `Random(1)`, both nodes placed); 192 of 192.
- **One fix on the way.** The patch left `const PADDING` of that file unused and CodeQL reported it; the constant is removed
  (no assertion touched). Three docs passages that called #105 open now say it is ruled.
- **Gates.** 1-7 green on the final tree: coverage exit 0 with 49,476 passed, 93 skipped, 0 failed and
  98.92 / 96.99 / 98.84 / 98.92; typedoc 200 warnings; CodeQL "every finding is accepted" with `accepted.json` unchanged; the
  ref diff against the base is the same 54 files. No oracle run was needed: the oracle is still built at `8bca22f4…` with
  patches 0001-0003, and no recorder input changed.
- **Landing.** Tag `elk-pin-move-8bca22f4/pre-squash` keeps the per-task history; one commit on `9c420f07`, footer
  `Refs: #104`, not pushed, unsigned.
- **Open for the maintainer.** Review of the D5.6 tie test with the branch; closing #105 and #104; #106-#109 (`follow-up`).
