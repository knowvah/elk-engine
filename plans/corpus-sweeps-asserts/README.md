<!-- SPDX-License-Identifier: EPL-2.0 -->

# corpus-sweeps-asserts: mission brief (issue #116)

## Objective

Run every corpus sweep with the restored Java asserts on. For each `AssertionError`, find the case and the site,
then triage the site as dev-assert D7 says: fix it, file it, or show it is Java-faithful. Mission #127 already ran the
ten layered sweeps this way on 2026-11-20 and found only #32. This mission covers what that run left out:

- the tree has changed since then (`fb4b906a`, the graphviz-dot port, the sweep results re-recorded on 2026-11-24);
- the four format sweeps (`json`, `elkj`, `elkt`, `dot-export`) were never run with assertions on;
- `loops` and `compound` match an oracle throw on presence alone, so an `AssertionError` on those cases shows only in
  their `throw-pairs:` summary, and #127 did not journal it ([D3](decisions.md#d3-collect-assertionerrors-from-verdicts-and-from-the-throw-pairs)).

Exit (#116, "Done when"):

- All thirteen sweeps have run with assertions on, at stride 1 where a stride exists, none skipped. Each summary and
  each throw-pairs line is journaled.
- Each firing site has exactly one outcome: fixed (with a test written red first), filed (`needs-ruling` or
  `follow-up`), or shown Java-faithful.
- No ref, vector, golden, oracle patch or `ELK_COMMIT` changes. No existing expected value changes. No sweep case is
  wrapped with assertions off.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base with `Refs: #116`.
  `plans/roadmap.md` gains `## Revision <date> (corpus-sweeps-asserts)`, and #116 gets a results comment.

**Not in this mission:** `ts-layout-compare` and the non-layered algorithms (#137). The five `Not a devAssert yet`
sites: #4 and #5 wait on knowvah/elk#27, #114 on knowvah/elk#28, and `ThresholdStrategy` `:395`/`:403` on #128. Also
out: #138 (the end-label rule's breadth) and #139 (the cache key).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `.agent-notes/corpus-sweeps-asserts-planning.md`, `.agent-notes/dev-assert-restore.md`, and `gh issue view 116`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/corpus-sweeps-asserts .agent-notes/corpus-sweeps-asserts-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add corpus-sweeps-asserts mission brief"`. Record the squash
   base in the journal. Use the driver's base if the prompt names one; otherwise use that commit's parent (`fb4b906a`
   at planning).
4. Oracle: check that `~/git/knowvah/elk-oracle/oracle-build.json` names `8bca22f4…` with patches 0001-0004 (true at
   planning, built 2026-11-25T00:05:58Z). Journal `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`,
   which was empty at planning (stop 7).
5. Baseline: see the journal's `plan` rows. Rerun only if the base sha differs from `fb4b906a`.
6. Find the first task in [batch-1/overview.md](batch-1/overview.md) marked `[ ]` and resume there.

## Blast radius

- **Data model and API contracts:** none. The public surface (`src/index.ts`, `docs/architecture/public-api.md`) does
  not change. `devAssert` is internal and off by default in the library.
- **Behaviour:** none, unless T2 fixes a port defect. Any such fix is inside one site's directory, changes no expected
  value, and is covered by a new test.
- **Service dependencies:** the oracle (read only, `-ea` runs to `$TMPDIR`) and `gh` (issues and a comment).

| File | Action | Task |
| ---- | ------ | ---- |
| `plans/corpus-sweeps-asserts/decision-journal.md` | Modify (append) | T1, T2, T3 |
| `test/corpus/assert-site-probe.test.ts` | Create temporarily, delete in T3, never commit | T1 |
| The firing site's `src/…/<Name>.ts` and its `<Name>.test.ts` (only if a site fires) | Modify (comment, or fix plus new test) | T2 |
| `plans/roadmap.md` | Modify (appended section only) | T3 |
| `.agent-notes/corpus-sweeps-asserts.md` | Create | T3 |
| This README (batch status, summary) | Modify | T3 |

No package, env var or database change.

## Quality gates

- **T1 and T2:** run each sweep detached under `nice -n 10`, and poll at most 9 minutes at a time. After any `src/`
  edit, run `npm run typecheck`, `npx prettier --check <changed files>`, the site's colocated tests with assertions on
  and with `ELK_DEV_ASSERTIONS=off`, and the touched sweep.
- **T3:** queue gates 1-7 ([T3](batch-1/T3-close-out.md)). `npm run coverage` takes about 15 minutes. Start it
  detached with `nohup … ; echo "exit $?"`.

Check `uptime` before every sweep or JVM run. Above 12, wait.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The stops likeliest to fire:

- Stop 1: a site that the oracle under `-ea` rejects as well. File `needs-ruling` and comment out the site.
- Stop 4: a sweep that skips or is red for a reason that is not an assert.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Sweeps with assertions on, triage, close-out | T1, T2, T3 | — | [x] |

## Execution model

Recommended executor: `fable`. One orchestrator owns all three tasks, every commit and every `gh` call, with no
subagents. The sweeps share CPU with other sessions and must run one at a time. Triage depends on the census, and
the work is mostly waiting on long runs.

**Time:**

- T1: about 40 minutes of sweeps.
- T2: 0 minutes if nothing fires; about 1 hour per site that does.
- T3: about 45 minutes, mostly the coverage run.

## Landing

1. Tag the tip `corpus-sweeps-asserts/pre-squash`.
2. Run `git reset --soft <base>`, then make one commit with `git -c commit.gpgsign=false commit -F <file>` (subject per
   [D6](decisions.md#d6-one-commit-on-the-queue-branch-the-issue-stays-open), footer `Refs: #116`, no attribution lines).
3. Never push.

## Reference

- [decisions.md](decisions.md): D1-D6 and the auto-confirmed record.
- [diagrams/component-map.md](diagrams/component-map.md) and [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedent: `plans/dev-assert/decisions.md` D7, `plans/dev-assert-restore/batch-3/T6-suite-and-sweeps.md` and its journal
  rows 22-24, and the #112 comments.

## Mission summary (2026-11-25)

Completed 2026-11-25: 3 of 3 tasks. No halt, no gate rerun, no stop condition fired.

- **Result.** All thirteen sweeps ran with assertions on, at stride 1 where a stride exists, none skipped: thirteen
  `exit 0`. No `AssertionError` in any verdict and none in the two `throw-pairs:` lines. No site fired, so T2 had
  nothing to triage and no file under `src/` or `test/` changed.
- **Landed.**
  - The journal: each sweep's summary and exit code, and both `throw-pairs:` lines verbatim.
  - [census.md](census.md): what each sweep evaluates, the 79 sites reached and the 61 not reached, and the probe.
  - The roadmap revision, `.agent-notes/corpus-sweeps-asserts.md` (five observations), and a comment on #116
    (labels unchanged).
- **Not as planned.**
  - The probe was written although nothing fired, to measure what a green sweep covers (journal, 01:37). It ran each
    sweep a second time: 45,661,377 `devAssert` evaluations with assertions on, 0 fired. The sweeps reach 79 of the
    140 `devAssert(` lines of `src/`. The four format sweeps and `label-sizing` reach one site
    (`InstancePool.ts:37`), so their green runs carry almost no assert evidence.
  - `census.md` is a file outside the README's table (journal, 01:37).
  - Comments on #151 and #152: their red sweeps come from caches in the main checkout that predate the pin move
    (journal, 02:11).
- **Decisions.** D1-D6 as planned. Push-forward rows in the journal: the sweep order in one detached job, the probe's
  shape. No deviation.
- **Gates.** Queue gates 1-7 green:
  - format, typecheck and complexity (no violation);
  - coverage: 1,258 files, 51,964 tests, 98.88 / 97.05 / 98.67 / 98.92;
  - docs build (200 typedoc warnings, as at the base), and CodeQL with no new accepted entry;
  - `test/golden/refs/` untouched against the base.
- **Open.** `follow-up` #181 (the presence-only throws rule of `loops` and `compound` would pass a port
  `AssertionError`). No `needs-ruling`. Unchanged residual: the five comment sites (knowvah/elk#27, knowvah/elk#28,
  #128), #137, #138, #139.
