<!-- SPDX-License-Identifier: EPL-2.0 -->

# models-dir-env: mission brief (issue #98)

## Objective

Two corpus test files resolve the models directory with an empty environment object, so they never see
`ELK_MODELS_DIR` (AD-15 says `test/` reads it):

- `test/corpus/census.test.ts:25`: `const resolution = resolveModelsDir({});`
- `test/corpus/corpus.test.ts:41`: `const defaultResolution = resolveModelsDir({});`, used by the
  `goldens against pinned clone` block and its `goldens not verified` placeholder.

`resolveModelsDir(env = process.env)` (`test/corpus/corpus.ts:122-131`) honours the override only for the
environment it is handed. Every other caller (22 at planning: the sweep consumers, the text parser/lexer/linker
tests, `tools/corpus/*.ts`) already passes nothing and gets `process.env`. On a checkout that provides the corpus only
through `ELK_MODELS_DIR`, six tests skip without a failure: the census drift check and the four golden-input checks
plus the placeholder. The #44 rehearsal found it (`plans/elk-upgrade-runbook/decision-journal.md`, 2026-11-14 17:10)
and the runbook works around it with a symlink (`docs/architecture/elk-upgrade.md` § 14 step 5).

Exit (#98 "Done when"):

- Both files call `resolveModelsDir()` at module scope ([D1](decisions.md#d1-both-files-resolve-from-the-real-environment)).
  The two `resolveModelsDir` tests of `corpus.test.ts` that are about the default path and the override (`:49`,
  `:58`) keep their own env objects. No assertion, title literal or expected value changes.
- Proven under `ELK_MODELS_DIR` alone: in a scratch clone whose default path does not exist, the two files skip six
  tests at the base and pass 51 of 51 with none skipped after the fix; in the queue worktree, `ELK_MODELS_DIR=/nonexistent`
  makes both files skip naming `/nonexistent` ([D2](decisions.md#d2-proof-a-scratch-clone-and-a-negative-run-no-new-test)).
- The runbook's symlink step is removed ([D3](decisions.md#d3-the-runbook-loses-the-symlink-step)).
- Queue gates 1-7 green and journaled; one squashed commit on the base; `plans/roadmap.md` gains
  `## Revision <date> (models-dir-env)`.

**Not in this mission:** any change to `test/corpus/corpus.ts` or its other 22 callers; a new fitness test; edits to
history (earlier roadmap lines, `.agent-notes/elk-upgrade-runbook.md`, `plans/elk-upgrade-runbook/`;
[D4](decisions.md#d4-history-stays-as-written)); any oracle, vector, golden or `src/` change. The translated
`docs-site/` pages hold no copy of the runbook (checked at planning).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/models-dir-env-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/models-dir-env .agent-notes/models-dir-env-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add models-dir-env mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, else that commit's parent (`6307bf36` at planning).
4. Oracle bookkeeping (no JVM run is planned, but the queue rules ask for it): `$ELK_ORACLE_DIR/oracle-build.json`
   names `8bca22f4afa3371562d2f702d59929818f7f7b71` and patches 0001-0003 (true at planning);
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` (empty at planning). Journal both. Do not
   rebuild for this mission unless the stamp is off.
5. `$ELK_MODELS_DIR` default `../../eclipse-elk/elk-models` is at `ac5af2ba511c0037e4f347e8bd91f013950951c7`, the
   commit of `test/corpus/manifest.json` (true at planning); journal it.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

Per task: the checks in its file. T2 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: empty (no recorder input changes)
```

`ELK_MODELS_DIR` must be unset (or equal to the default path) for the coverage run, so its counts compare with the
base's. The full suite takes minutes: start it detached as the queue rules show and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely one is 3: the scratch clone cannot run vitest (for example
`node_modules` resolution through a symlink), which is a proof problem, not a reason to edit the tests further.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Resolve from the real environment, prove it, drop the symlink step | T1 | — | [x] |
| [2](batch-2/overview.md) | Close-out: gates, roadmap, squash | T2 | 1 | [x] |

## Execution model

Recommended executor: `fable`, working alone. Two one-line test edits and one runbook paragraph are one unit; the
proof is a few short vitest runs. No subagent. The queue driver supplies the session's permissions, so no
`.claude/settings.autonomous.json` is generated.

**Time:** about 15 minutes of edits and proof, plus the full coverage suite (minutes) and CodeQL in T2.

## Landing

Squash every commit of the mission into exactly one on the base: tag the tip `models-dir-env/pre-squash`, then
`git reset --soft <base>` and one `git -c commit.gpgsign=false commit -F <file>`. Subject
`test(corpus): read elk_models_dir in the census and corpus tests` (or a better one within 72 chars, lowercase), a
body that says why (both files passed `{}` and so tried only the default path; six tests skipped silently on a
checkout that supplies the corpus through the variable; the runbook's symlink workaround is gone; no expected value
changed), footer `Refs: #98`, and the attribution trailer the session's system reminder names. Never push.

## Reference

- [decisions.md](decisions.md): D1-D4 and the auto-confirmed record.
- [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #98; found in #44. `.agent-notes/elk-upgrade-runbook.md` ("two corpus tests ignore `ELK_MODELS_DIR`").

## Mission summary (2026-11-20)

- **Done.** T1-T2, both batches; no stop condition fired and nothing is left for a ruling.
- **The fix.** `test/corpus/census.test.ts:25` and `test/corpus/corpus.test.ts:41` call `resolveModelsDir()`; the
  resolver's own tests at `corpus.test.ts:49` and `:58` keep their env objects. `test/corpus/corpus.ts` is unchanged.
- **Proof (D2).** Scratch clone with the default path absent and `ELK_MODELS_DIR` set: 46 passed, 6 skipped (52) at
  the base; 51 passed, 0 skipped (51) at the T1 commit. Queue worktree with `ELK_MODELS_DIR=/nonexistent`: 46 passed,
  6 skipped, skip texts naming `/nonexistent`. Unset: 51 passed, as at the base.
- **Runbook (D3).** § 14 step 5 of `docs/architecture/elk-upgrade.md` has no symlink step and no reference to #98.
- **Decisions made on the way** (journal): `defaultResolution` renamed `resolution` in `corpus.test.ts` (D1 allowed
  it; the old name misleads under the variable); the paragraph after the deleted one opens "Some differences…";
  commits carry no attribution trailer (the queue rules win over the brief's Landing).
- **Gates.** 1-7 green: coverage exit 0 with 1,178 files and 49,337 tests passed, 93 skipped, 0 failed and
  98.81 / 96.99 / 98.56 / 98.86, all equal to the base; typedoc 200 warnings; CodeQL "every finding is accepted" with
  `accepted.json` unchanged; gate 7 empty. The oracle was not rebuilt or run (`8bca22f4…`, patches 0001-0003).
- **Landing.** Tag `models-dir-env/pre-squash` keeps the per-task history; one commit on `6307bf36`, footer
  `Refs: #98`, not pushed, unsigned.
- **Open for the maintainer.** Closing #98 when the branch merges. No issue was filed.
