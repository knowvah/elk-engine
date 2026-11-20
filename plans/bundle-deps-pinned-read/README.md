<!-- SPDX-License-Identifier: EPL-2.0 -->

# bundle-deps-pinned-read: mission brief (issue #89)

## Objective

`test/architecture/module-boundaries.fitness.test.ts:342` (`regeneration › regenerated deps equal the committed
file`) is the only check that ties `test/architecture/bundle-deps.json` to `IN_SCOPE_SUFFIXES` in
`tools/bundle-deps.ts`. `regenerationSkipReason` (`:328-337`) skips it unless the ELK checkout's `HEAD` is the
committed `elkCommit`, because `readManifests` (`tools/bundle-deps.ts:142-149`) reads the working tree.

At planning (2026-11-20, base `6a16e697`): `../elk` sits at the pin `8bca22f4`, so the file runs 57 passed; with
`ELK_SOURCE_DIR=../elk-oracle` (HEAD `cb2b6d54`, the pin plus the three oracle patch commits, none touching a
`MANIFEST.MF`) it runs 56 passed, 1 skipped. The skip returns whenever `../elk` moves past the pin, as it did on
2026-11-13. `tools/melk/sync-sources.sh:43-47` has the same `HEAD` gate over reads that are already by commit id, and
the upgrade runbook (`docs/architecture/elk-upgrade.md:228`) files that under #89 too.

Exit (#89's suggested fix, [D1](decisions.md#d1-read-manifests-from-the-object-store-at-an-explicit-commit)-[D5](decisions.md#d5-docs-scope)):

- `tools/bundle-deps.ts` reads manifests with `git show <commit>:…`; `generateBundleDeps(elkDir, commit)` stamps the
  commit it read; the CLI reads at `tools/oracle/ELK_COMMIT`. A new always-running case checks the committed stamp
  equals that pin.
- The regeneration check skips only when the checkout is missing or does not contain `elkCommit`; it runs and passes
  with both `../elk` and `../elk-oracle`, and fails on a hand-edited table (negative proof, reverted).
- `sync-sources.sh` requires the pin to be present, not `HEAD`; `--check` passes with `ELK_SOURCE_DIR=../elk-oracle`.
- Two new suites drive the reader and the script on throwaway git repos, red before the change; they run in CI.
- The four runbook sites and the ADR sentence that describe the skip say what is true now.
- `test/architecture/bundle-deps.json`, `tools/melk/sources/`, `test/golden/refs/` and `tools/vectors/` are
  byte-identical to the base. Queue gates 1-7 green and journaled. One squashed commit on the base;
  `plans/roadmap.md` gains `## Revision <date> (bundle-deps-pinned-read)`.

**Not in this mission:** any change to `IN_SCOPE_SUFFIXES`, `buildBundleDeps` or the parsers; regenerating
`bundle-deps.json` or the `.melk` sources; any write in an ELK checkout or `$ELK_ORACLE_DIR`; `docs-site/` pages
(none mention the skip). No oracle build, no JVM recorder, no sweep.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/bundle-deps-pinned-read-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/bundle-deps-pinned-read .agent-notes/bundle-deps-pinned-read-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add bundle-deps-pinned-read mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`6a16e697` at planning).
4. Bookkeeping, read-only, journaled: `git -C ../elk rev-parse HEAD`, `git -C ../elk-oracle rev-parse HEAD`,
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`, and that `$ELK_ORACLE_DIR/oracle-build.json`
   names `8bca22f4…` with patches 0001-0003. No oracle output is used as evidence here, so a stale stamp is journaled,
   not rebuilt. If `../elk-oracle` no longer contains the pin, use any checkout that does and is not at it (a
   throwaway `git worktree` is a write in `../elk`: not allowed; a `git clone --shared ../elk "$TMPDIR/elk-off"` with
   `git -C "$TMPDIR/elk-off" checkout --detach <a commit after the pin>` is).
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1: `npx vitest run test/architecture/` and `npx prettier --check` on the three files.
After T2: `npx vitest run test/melk/`.
T3 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/ tools/vectors/ tools/melk/sources/ test/architecture/bundle-deps.json
```

`npm run complexity` defaults to `src`; also run `npx tsx tools/complexity/check.ts tools/bundle-deps.ts`. The full
suite takes minutes: start it detached as the queue rules show and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely ones are 3 (the now-running check fails: the table would have
to change, AD-13) and 4 (`sync-sources.sh --check` reports a difference).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Read manifests at the pin, tests first | T1 | — | [x] |
| [2](batch-2/overview.md) | `sync-sources.sh` presence check | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Docs and close-out: gates, roadmap, squash | T3 | 2 | [x] |

## Execution model

Recommended executor: `fable`, working alone. Two small tool edits, two new test files and five doc lines do not
justify a subagent; the orchestrator owns every edit, commit, `gh` call, `plans/` and `.agent-notes/`. The queue
driver supplies the session's permissions, so no `.claude/settings.autonomous.json` is generated (the path is
gitignored).

## Landing

Squash every commit of the mission into exactly one on the base: tag the tip `bundle-deps-pinned-read/pre-squash`,
then `git reset --soft <base>` and one `git -c commit.gpgsign=false commit -F <file>`. Subject
`fix(fitness): run the bundle-deps check on any checkout with the pin` (or a better one within 72 chars), a body that
says why (the check skipped whenever `../elk` moved past the pin; reads are now by object id, so presence suffices;
the CLI stamps the pin so the stamp and the content cannot drift; `sync-sources.sh` had the same gate), footer
`Refs: #89`, and the attribution trailer the session's system reminder names. Never push.

## Reference

- [decisions.md](decisions.md): D1-D5 and the auto-confirmed record.
- [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #89; `.agent-notes/deferred-bundles-adr.md` (the original finding and the archive recipe);
  `plans/deferred-bundles-adr/decision-journal.md` rows at 20:45 and 20:49.

## Mission summary (2026-11-20)

- **Tasks**: 3 of 3 done (T1, T2, T3). No subagent; one executor.
- **Result**: `tools/bundle-deps.ts` reads the manifests by commit id and its CLI stamps the pin; the regeneration
  check runs on any checkout that contains the pin (58 passed with `../elk` and with `../elk-oracle`, where it was 56
  passed, 1 skipped) and fails on a hand-edited table with both; `sync-sources.sh` asks only for the pin's presence
  (`--check` exits 0 with `../elk-oracle`). Two new suites (10 cases) and one new fitness case run in CI.
- **Decisions**: D1-D5 as planned. Journaled judgment calls, none flagged for review: a second, sharper negative
  proof; `GIT_CEILING_DIRECTORIES` and the tool imports in the `sync-sources` test; three doc edits outside D5's five
  sites (`melk-codegen.md` step 1, the runbook's section 11 list of stamp tests, the ADR's moved line citations); no
  attribution trailer (queue rules).
- **Gates 1-7**: green. Coverage 1,176 files, 49,324 tests passed, 93 skipped; 98.81 / 96.99 / 98.56 / 98.86 %.
  `docs:build` 200 typedoc warnings (as at the base). `codeql` clean with no new accepted entry. Gate 7 diff empty.
- **Issues**: #132 (`follow-up`, the pin file's path and reader repeated in 13 TypeScript files). No `needs-ruling`
  issue; no stop condition met. #89 has a summary comment and stays open until the branch merges.
- **Landing**: one commit on `6a16e697`; the per-task history is under the tag `bundle-deps-pinned-read/pre-squash`.
