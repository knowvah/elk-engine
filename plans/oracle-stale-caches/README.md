<!-- SPDX-License-Identifier: EPL-2.0 -->

# oracle-stale-caches: mission brief (issue #85)

## Objective

`tools/oracle/build.sh` reuses an existing oracle worktree only if `verify_worktree` (`build.sh:90-102`) finds it
clean. Every `git status --porcelain` line not matched by `OUTPUT_FILTER` (`build.sh:26`) counts as dirt, and the
filter exempts only build output, `oracle-build.json` and the untracked `census/` and `sweep/` roots. The vector
cache that `tools/vectors/vector-cache.sh` writes at `$ELK_ORACLE_DIR/vector-cache/` (192 MB at planning; a cold
refill of the elkj recorder alone took 3 h 58 min) is not exempt. So an in-place rebuild, which
`docs/conformance.md` § 4 step 1 promises keeps the caches, exits `2`. The only documented fix for exit `2`
(§ 5) removes the worktree and every cache with it.

At planning (2026-11-20) the live worktree's porcelain is exactly:

```text
?? census/
?? oracle-build.json
?? sweep/
?? vector-cache/
```

The issue's three ad hoc output directories (`t4/`, `rerecord/`, `final-gate/`) are already gone (the pin move to
`8bca22f4` on 2026-11-18 built a fresh worktree), so `?? vector-cache/` is the one line that makes it stale today.

Exit (#85, option 1, [D1](decisions.md#d1-exempt-vector-cache-at-the-root-only)):

- `OUTPUT_FILTER` also exempts the untracked `vector-cache/` root, and nothing else new. `verify_worktree` on a
  worktree that holds `census/`, `sweep/`, `vector-cache/` and `oracle-build.json` reports it verified; any other
  untracked root directory, a nested `vector-cache/`, or a tracked change still gives exit `2`.
- A vitest suite drives the real `verify_worktree` on a throwaway git repo and worktree ([D2](decisions.md#d2-test-seam-a-source-guard-and-a-throwaway-worktree)),
  red before the filter change and green after.
- The live oracle is proven verified **read-only**, with `oracle-build.json` byte-identical before and after
  ([D3](decisions.md#d3-live-proof-is-read-only-never-run-buildsh-on-the-live-oracle)), so the vector cache stays warm.
- `docs/conformance.md` §§ 1, 4, 5, `docs/architecture/elk-upgrade.md` (the "Stale worktree (issue #85)" hazard)
  and `docs/architecture/elk-json-text.md` step 5 say what is true now ([D5](decisions.md#d5-docs-scope)).
- Nothing in `test/golden/refs/` and nothing under `tools/vectors/` changes. Queue gates 1-7 green and journaled.
  One squashed commit on the base; `plans/roadmap.md` gains `## Revision <date> (oracle-stale-caches)`.

**Not in this mission:** moving caches under one root (#85 option 2, rejected in D1), the translated
`docs-site/<locale>/conformance.md` pages (D5), any oracle patch or `ELK_COMMIT` change, and any write inside
`$ELK_ORACLE_DIR`. No Maven build, no JVM recorder, no sweep.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/oracle-stale-caches-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/oracle-stale-caches .agent-notes/oracle-stale-caches-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add oracle-stale-caches mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`b6b94601` at planning).
4. Oracle bookkeeping: check that `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it
   did at planning, `builtAt` 2026-11-18T15:18:16Z), record `shasum -a 256 "$ELK_ORACLE_DIR/oracle-build.json"`, and
   run `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`. Journal all three. **Do not rebuild**,
   even if the stamp is off: that is stop 3, not a rebuild (D3).
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1: `npx vitest run test/architecture/oracle-build.test.ts` and `npx prettier --check` on the two files.
After T2: `npx vitest run test/docs/elk-upgrade-runbook.test.ts`, `npx prettier --check` on the edited docs.
T3 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/ tools/vectors/   # gate 7: both empty
```

The full suite takes minutes: start it detached as the queue rules show and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely ones are 3 (live porcelain lists an untracked entry beyond
the four above) and 5 (the test needs a change to `build.sh` beyond the guard and the filter).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Exempt `vector-cache/`, tests first | T1 | — | [x] |
| [2](batch-2/overview.md) | Live read-only proof and docs | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Close-out: gates, roadmap, squash | T3 | 2 | [x] |

## Execution model

Recommended executor: `fable`, working alone. One shell-script line, one guard, one test file and three doc
paragraphs do not justify a subagent; the orchestrator owns every edit, commit, `gh` call, `plans/` and
`.agent-notes/`. The queue driver supplies the session's permissions, so no `.claude/settings.autonomous.json` is
generated (the path is gitignored).

## Landing

Squash every commit of the mission into exactly one on the base: tag the tip `oracle-stale-caches/pre-squash`, then
`git reset --soft <base>` and one `git -c commit.gpgsign=false commit -F <file>`. Subject
`fix(oracle): exempt the vector cache from the stale-worktree check` (or a better one within 72 chars), a body that
says why (the cache is script-managed and costly to refill; the in-place rebuild of § 4 must keep it; the live proof
stayed read-only), footer `Refs: #85`, and the attribution trailer the session's system reminder names. Never push.

## Reference

- [decisions.md](decisions.md): D1-D5 and the auto-confirmed record.
- [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #85; `.agent-notes/text-sizing-seam.md` (the original finding and the env-scoped excludes workaround).

## Mission summary (2026-11-20)

- **Tasks:** 3 of 3 (T1, T2, T3). Squash base `b6b946015df56a9130f2016c67f01afe242b5b07`; per-task history under the
  tag `oracle-stale-caches/pre-squash`.
- **Result:** `tools/oracle/build.sh` exempts the untracked `vector-cache/` root (filter and comment) and ends in a
  source guard: 4 lines added, 3 removed. `test/architecture/oracle-build.test.ts` (8 cases) drives the real
  `verify_worktree` on a throwaway worktree; red twice before green, as D2 planned. The live oracle verifies with the
  new script (`existing oracle worktree verified`, exit 0) and failed the base filter over `?? vector-cache/` alone;
  the proof was read-only (`oracle-build.json` sha256 `87705f69…9911` and the worktree index unchanged), so there was
  no rebuild and the vector cache is warm. Five doc paragraphs in three files say what is true now.
- **Decisions:** D1-D5 as planned. Push-forwards, journaled: the nested case is two cases (untracked and tracked
  parent); § 5 row 1 keeps its length so prettier does not re-pad the table, and the "removal deletes the caches"
  warning sits in row 2; the docs state that the exemption keeps the directory, not the warmth, across a rebuild;
  `tools/oracle/README.md` is not edited. One correction to the brief: 23 translated conformance pages, not 21.
- **Gates (1-7):** all green. `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718 functions);
  coverage 98.81 / 96.99 / 98.56 / 98.86 with 1,174 files and 49,313 tests passed, 93 skipped; `docs:build` 200
  typedoc warnings (as at the base); `codeql` every finding accepted, no new entry; `test/golden/refs/` and
  `tools/vectors/` diffs empty.
- **Stops:** none met. No `needs-ruling` issue. No write outside this worktree.
- **Follow-up:** #131 (`follow-up`), the four changed paragraphs in the 23 translated `docs-site/<locale>/conformance.md`.
- **Notes:** `.agent-notes/oracle-stale-caches.md`.
