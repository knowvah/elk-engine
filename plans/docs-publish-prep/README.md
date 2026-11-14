<!-- SPDX-License-Identifier: EPL-2.0 -->

# Docs and first-publish preparation: mission brief (roadmap row 12, issue #43)

## Objective

Finish the docs site and prepare, without performing, the first npm publish. Add TypeDoc API docs (on a TypeScript 6
toolchain isolated from the project's TypeScript 7, AD-6), example code that CI runs against oracle output, a link check
in CI, the semantic-release configuration (in place, never run), a pack-and-install rehearsal, and a reviewable proposal
for the `src/index.ts` export surface (AD-14). The maintainer keeps three things: claiming the npm name, the first
`npm publish`, and accepting the export surface. **The first publish freezes the ElkGraph API and is irreversible.**

Exit (#43 "done when", roadmap § 12 and its revisions):

- `npm run docs:build` builds the site with the generated API reference (DP3); `npm run docs:linkcheck` passes on it,
  including fragments (DP5); the example tests pass against oracle refs (DP4); CI runs all three (T8).
- `docs/architecture/public-api.md` proposes the surface, and `test/public-api/candidate-index.ts` is that surface as
  code (DP1, DP2); `src/index.ts` is unchanged.
- `.releaserc.json`, `release.yml` (manual trigger only), the publish scripts and `PUBLISHING.md` are in place; nothing
  is run (DP7). `npm run pack:smoke` passes in both modes (DP8).
- Two `needs-ruling` issues hand over the maintainer-only parts (DP9); the queue gates pass; one squashed commit on the
  base; `plans/roadmap.md` gains `## Revision <date> (docs-publish-prep)`.

**Not in this mission:** any export from `src/index.ts`; any edit to CLAUDE.md, AD rows, `src/`, landed tests, or any
existing ref; `npm publish`, `npm login`, running semantic-release; translating the new pages; nav or sidebar changes
(DP6); an idiomatic wrapper layer.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/docs-publish-prep-planning.md`, `.agent-notes/docs-site.md` (VitePress quirks, lizard and regex
   literals, Node 24.2 floor for docs scripts) and `.agent-notes/text-sizing-seam.md` (regen scripts, oracle staleness
   #85). Journal what affects the approach.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/docs-publish-prep .agent-notes/docs-publish-prep-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add docs-publish-prep mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, else that commit's parent (at planning `0e1db3a6`, the row-11
   squash).
5. Oracle: `$ELK_ORACLE_DIR/oracle-build.json` must name `tools/oracle/ELK_COMMIT` and patches 0001-0003 (true at
   planning). If not, rebuild with `build.sh` (see #85 for its staleness filter) and journal it. Journal
   `git -C $ELK_SOURCE_DIR log --oneline 8aaa3c14..HEAD -- plugins/org.eclipse.elk.core plugins/org.eclipse.elk.graph plugins/org.eclipse.elk.graph.json plugins/org.eclipse.elk.alg.layered`;
   at planning it prints only `8bd00922` (prose in `graph`).
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npm run format:check`; after T2 onward also `npm run docs:build`.
New `tools/` and `scripts/` files are outside `npm run complexity` and the coverage gate: check them with an explicit
`lizard -C 10 -a 5 -T nloc=30 -w <files>` run and journal it. At mission end T9 runs queue gates 1-6 (check `uptime`;
above 12, wait) and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build && npm run docs:linkcheck && npm run pack:smoke && npm run pack:smoke -- --entry test/public-api/candidate-index.ts
for s in default algorithms layered trees force-disco packing examples; do nice -n 10 tools/oracle/regen-goldens.sh --set $s; done
git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/elk-examples'   # empty
```

Run `coverage` and the regen loop detached (`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &`)
and poll in the foreground for at most 9 minutes at a time. Commit each task with `git -c commit.gpgsign=false commit -F <file>`.

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md). Most likely to fire: 4 (the pinned nav/sidebar rows, already planned as part of
the DP9 surface ruling), 6 (an example or the bundled candidate differs from the oracle) and 7 (TS 6 compile errors).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Surface proposal and candidate entry | T1 | — | [x] |
| [2](batch-2/overview.md) | TypeDoc toolchain; examples with oracle refs | T2, T3 | 1 | [x] |
| [3](batch-3/overview.md) | Site pages; link check and switcher fix | T4, T5 | 2 | [x] |
| [4](batch-4/overview.md) | Release configuration | T6 | 3 | [x] |
| [5](batch-5/overview.md) | Pack rehearsal; CI wiring | T7, T8 | 4 | [x] |
| [6](batch-6/overview.md) | Rulings, roadmap, notes, gates, squash | T9 | 5 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

Recommended executor model: `fable`. The orchestrator owns `package.json`, `package-lock.json`, CI files, `plans/` and
every commit. T2 (`build-engineer`) and T3 (`typescript-pro`, sonnet) may run in parallel in batch 2; their write-sets are
disjoint. T3's oracle regen runs from the orchestrator (shared oracle). Subagents never commit and never write `plans/`.

## Landing

One squashed commit on the base, subject `docs(site): api reference, example tests and release prep (12)` (or another
≤ 72-character Conventional Commit subject), body with the why, footer `Refs: #43`, no attribution lines; per-task history
under the tag `docs-publish-prep/pre-squash`. `git reset --soft <base>` then one commit; never push.

## Mission summary

**Tasks.** 9 of 9 planned tasks completed (T1-T9) in 6 batches, all by the orchestrator; no subagent was used (journal
`start` `plan`). Roadmap revision: `## Revision 2026-11-14 (docs-publish-prep)` in `plans/roadmap.md`; execution notes:
`.agent-notes/docs-publish-prep.md`. **Nothing was published or run**: no `npm publish` (not even `--dry-run`), no
`npm login`, no semantic-release run, no tag pushed.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| `npm run docs:build` builds the site with the generated API reference (DP3) | typedoc 0.28.20 on the isolated TypeScript 6.0.3 package: 0 errors, 200 warnings, 72 pages; root compiler still 7.0.2 | T2 `note`, `gate`; T9 `gate` (gate 5) |
| `npm run docs:linkcheck` passes, fragments included (DP5) | 555 links, 0 broken; the 138 switcher 404s and 18 dead reference anchors diagnosed and fixed | T5 `gate`, three `fix` rows; T9 `gate` |
| the example tests pass against oracle refs (DP4) | three examples equal `refs/elk-examples` at 1e-6; refs recorded before the test | T3 `gate` (three rows); T4 `gate` |
| CI runs all three (T8) | `ci.yml`: `docs:build`, `docs:linkcheck`, examples inside `coverage`, `publish:check`, both `pack:smoke` modes | T8 `plan`, `gate` |
| `public-api.md` proposes the surface and `candidate-index.ts` is that surface as code; `src/index.ts` unchanged (DP1, DP2) | 69 exports, four tiers, a test keeps doc and code equal | T1 `plan`, `note`, `gate`; T9 `gate` (unchanged list) |
| `.releaserc.json`, `release.yml` (manual only), publish scripts, `PUBLISHING.md` in place; nothing run (DP7) | in place; target registry proven with npm's resolver | T6 `note` (two rows), `plan`, `gate` |
| `npm run pack:smoke` passes in both modes (DP8) | 4,212 files, contents ok, clean install and import; bundled candidate equals an oracle ref in a clean process | T7 `gate`; T9 `gate` |
| two `needs-ruling` issues hand over the maintainer-only parts (DP9) | #90 (surface), #91 (first publish) | T9 `ruling` |
| the queue gates pass; one squashed commit on the base; the roadmap gains the revision | gates 1-6 green; revision appended; one commit on `372d7871`, history under the tag `docs-publish-prep/pre-squash` | T9 `gate` (five rows), `note` |

**Decisions made.** DP1-DP9 as planned. Deviations, all journaled: tasks T2, T3 and T7 done by the orchestrator instead of
subagents (start `plan`); `NOTICE.md` added to the tarball (T6 `plan`); `release.yml` checks the npm version instead of
installing `npm@latest` (T6 `plan`); `npm publish --dry-run` not run, the target shown with `pickRegistry` (T6 `note`);
versioning described for merge commits, not PR titles (T6 `plan`); link-check flags kept in two config files and three
roots chosen from linkinator's recursion rule (T5 `fix`, `plan`); reference pages get heading ids by the generator's rule
(T5 `fix`); files outside the planned write-sets, each with its reason (T2, T4, T5, T8 `plan`). Nothing under `src/`
changed, and no landed expected value, ref, vector or tolerance.

**Issues filed.** #90 and #91 (`needs-ruling`). #92, #93, #94 (`follow-up`): translation after acceptance, the stale
overview notice, search index size and the underscore slug rule. Comments: #43 (results), #87 (the `childPids()` check also
failed at `ts-layout-shards.test.ts:263` under load).

**Flagged for review.** The language switcher now opens each locale's home page (the fix for the dead links; #90). The
first publish freezes the ElkGraph API (AD-14); it is the maintainer's (#91).

**Known issues.** One coverage run during T8 failed on the #87 intermittent alone at load 47 and passed on the rerun; the
final gate's coverage passed on its first run. The weekly external link check will report nine GitHub `blob/main` links as
404 until `chore/issue-queue` reaches `main`. `actionlint` is not installed here, so the three workflow files were read by
eye and checked by script for triggers and permissions only; their first real run is on GitHub.
