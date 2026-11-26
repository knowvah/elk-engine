<!-- SPDX-License-Identifier: EPL-2.0 -->

# heading-slug-underscore: mission brief (issue #94, part 2)

## Objective

The docs site gives headings their ids with `headingSlug` (`docs-site/.vitepress/config.ts:116-118`). Its
`NOT_SLUG_CHARS` drops connector punctuation, so a heading that names a Java identifier loses its underscores:
`## PARALLEL_NODE` gets `id="parallelnode"`, where GitHub's slugger gives `parallel_node`. The maintainer ruled on
#94 (comments of 2026-11-20):

- **Part 2, underscores:** match the Java. Keep `_` and the rest of Unicode category Pc (`‿`, `⁀`, `＿`, …), as
  github-slugger does. `PARALLEL_NODE` → `parallel_node`.
- **AD-13:** `test/docs/site-config.test.ts:74` may change from `'parallelnode'` to `'parallel_node'`. It is the
  **only** expected-value change allowed.
- **Non-ASCII whitespace:** keep `-` (unlike GitHub, which drops it). New rows pin the site's current values:
  U+00A0 → `a-b`, U+2003 → `foo-bar`.
- **New rows** pin the planner's probe table (issue comment 1), whitespace rows with the site's values.
- **Part 1** (search index size) is closed by ruling: leave it. No work here; the roadmap revision records it.

Exit:

- `headingSlug` keeps every `\p{Pc}` character ([D1](decisions.md#d1-the-rule-change)); non-ASCII whitespace still
  becomes `-` ([D2](decisions.md#d2-whitespace-is-unchanged)).
- `site-config.test.ts:74` reads `'parallel_node'`; every other existing assertion is byte-identical to the base.
  New rows ([D3](decisions.md#d3-the-new-rows)) were written and seen red (the Pc rows) before the regex changed.
- The comments that describe the rule (`config.ts:107-115`, `:135`; `docs-site/.vitepress/README.md:132`;
  `site-config.test.ts:53`) state the ruled rule, not "exactly as GitHub".
- The built site's heading ids outside `reference/` are unchanged (base vs. final id inventory, journaled), and
  `npm run docs:linkcheck` reports 0 broken links.
- The remaining differences from github-slugger (planning sweep, [D4](decisions.md#d4-other-differences-are-a-follow-up))
  are filed as one `follow-up` issue, not fixed.
- Queue gates 1-7 green and journaled. One squashed commit on the base, footer `Refs: #94`. `plans/roadmap.md`
  gains `## Revision <date> (heading-slug-underscore)`.

**Not in this mission:** the search index (part 1, closed), `referenceHeadingSlug` and every `reference/` id, any
character class other than Pc, any whitespace change. No oracle run, no JVM, no recorder, no ref change.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/heading-slug-underscore-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/heading-slug-underscore .agent-notes/heading-slug-underscore-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add heading-slug-underscore mission brief"`. Record the
   squash base in the journal: the driver's base if the prompt names one, else that commit's parent (`1e601a2b` at
   planning).
4. Oracle bookkeeping (no oracle run here, but the queue rules ask for the record): check that
   `$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and the current `tools/oracle/patches/` set,
   and run `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`. Journal both. Do not rebuild for
   this mission even if stale: nothing here reads the oracle; journal the mismatch instead.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1: `npx vitest run test/docs/site-config.test.ts` all passing, `npx prettier --check` on the touched files,
the id-inventory diff empty, `npm run docs:linkcheck` 0 broken. T2 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # journal the typedoc warning count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

The full suite takes minutes: start it detached as the queue rules show and poll it. `config.ts` is outside
coverage's `include` and `tsconfig.json`'s `include`; the test file is in both.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The plausible ones are 3 (a second expected value would change) and 4
(a built id outside `reference/` changes).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Rows first, then the rule | T1 | — | [x] |
| [2](batch-2/overview.md) | Close-out: follow-up, gates, roadmap, squash | T2 | 1 | [x] |

## Execution model

Recommended executor: `fable`, working alone. A one-character-class regex change and a handful of test rows do not
justify a subagent; the orchestrator owns every edit, commit, `gh` call, `plans/` and `.agent-notes/`.

## Landing

Subject `fix(docs): keep connector punctuation in heading ids` (≤ 72, lowercase). The body gives the why: headings
that name Java identifiers lost their underscores; the #94 ruling keeps Unicode Pc as GitHub does, keeps `-` for
non-ASCII whitespace, and allowed the one row at `site-config.test.ts:74` to change; no landed page's id changed.
Footer `Refs: #94`, no attribution lines (queue rule). Tag `heading-slug-underscore/pre-squash`,
`git reset --soft <base>`, one commit with `git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[batch-1/T1-rows-and-rule.md](batch-1/T1-rows-and-rule.md) · [batch-2/T2-close-out.md](batch-2/T2-close-out.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-24)

- **Tasks:** 2 of 2 (T1, T2). No halt, no stop condition fired, no `needs-ruling` issue.
- **Change:** `NOT_SLUG_CHARS` in `docs-site/.vitepress/config.ts` keeps `\p{Pc}`; `headingSlug('PARALLEL_NODE')` is
  `parallel_node`. Row 74 of `test/docs/site-config.test.ts` changed under the #94 ruling, the only expected-value change;
  eight new rows were seen red first (5 failed of 26, counting row 74) and pass.
- **Scope proof:** heading ids of the built site before and after the rule change are identical (871 ids on 177 pages
  outside `reference/`; 6,038 on all 252 pages). After the roadmap append the only difference is the new revision
  heading's own id on `guide/roadmap.html`. `docs:linkcheck`: 515 links, 0 broken.
- **Decisions journaled:** 3 push-forwards (prose wording and a fifth prose site, the `pageHeadingSlug` doc comment; the
  full-range and control-character sweep beyond the planning range; a second full-suite run on the close-out tree). None
  is flagged for review.
- **Gates 1-7:** green; numbers in the [decision journal](decision-journal.md).
- **Filed:** #176 (`follow-up`): the remaining differences from github-slugger outside whitespace and Pc, with three
  measured causes. Comment on #94 with this summary; #94 is left open for the maintainer.
- **Known issues:** none.
