<!-- SPDX-License-Identifier: EPL-2.0 -->

# overview-status: mission brief (issue #93)

## Objective

The site's overview page still carries the pre-alpha notice "No layout algorithm is ported yet… `src/index.ts`
exports nothing public yet", and says "The first npm publish freezes this surface". The first claim has been false
since roadmap rows 7a-8c landed (all in-scope algorithm bundles ported, parity report on the site). The second is
false since #90's ruling 8, as amended on #91 (0.x may change; 1.0 freezes the surface). The home page
(`docs-site/index.md`) and `README.md` carry the same text (D1).

Rewrite those blocks so that each states only what is true at the base, with at most one sentence per page that
depends on the #90 implementation (D3). Then refresh the 23 translations of the two site pages (only the changed
blocks plus a fresh `sourceHash`, D4).

Exit (#93: "rewrite the notice … then refresh the 23 translations of that paragraph"):

- No file in scope says "No layout algorithm(s)", "Pre-alpha" or "first npm publish freezes", in English or in its
  locale form. Every remaining claim has a journaled source.
- `npm run docs:i18n-status` lists neither `guide/overview.md` nor `index.md` as stale in any locale. At the base,
  every overview copy is already stale through its hash (D4), so that changes too.
- Per locale page, only the `sourceHash:` line and the counterparts of the changed English blocks differ.
- #90 has a comment listing every #90-dependent sentence by path (D5). Queue gates 1-7 green and journaled, plus
  `npm run docs:linkcheck`. One squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (overview-status)`.

**Not in this mission (D2):** the getting-started page and `/reference/` in the navigation, the
`locale-complete.test.ts` rows, `src/index.ts`, the `i18nRouting` revert, and the getting-started notice. All of
these are #90's acceptance steps. Also out: the stale `conformance.md` and `guide/architecture.md` translations,
which T3 checks for an issue and files as a `follow-up` if none exists. No oracle run, no recorder, no JVM, no ref
change.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/overview-status-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/overview-status .agent-notes/overview-status-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add overview-status mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`9c31c988` at planning).
4. Oracle bookkeeping (no oracle run in this mission, but the queue rules ask for the record): check that
   `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003, and run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`. Journal both.
5. Run `npm run docs:i18n-status` and journal the base stale list per locale (planning: `conformance.md`,
   `guide/architecture.md`, `guide/overview.md` in all 23).
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1 and after T2: `npx vitest run test/docs`, `npm run docs:build`, `npm run docs:linkcheck`, and
`npx prettier --check` on the edited files. T3 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build && npm run docs:linkcheck                      # typedoc warnings: journal the count (200 at the last mission)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

The full suite takes minutes (about 200 s at planning). Start it detached as the queue rules show, and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely ones are 4 (a test pins a sentence; planning found none)
and 6 (a locale fails the lint twice).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Rewrite the English text | T1 | — | [x] |
| [2](batch-2/overview.md) | Refresh the 46 locale pages | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Close-out: #90 hand-off, follow-up, gates, roadmap, squash | T3 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1 and T3, every commit, every `gh` call, `plans/` and
`.agent-notes/`. T2 fans out to translation subagents running in the background, with disjoint locale directories
(write-set rule of `~/.claude/rules/parallelism.md`). Each is an Edit-capable agent on `sonnet` with a
self-contained prompt (T2 step 3). The orchestrator verifies their hunks rather than trusting their reports. Log the
dispatch plan (groups, agent type, model) to the journal before dispatch.

## Landing

Subject `docs(site): say the algorithms are ported on the overview and home page` (≤ 72, lowercase). The body gives
the why: the pre-alpha notice became false when roadmap rows 7a-8c landed; the freeze sentence became false with #90
ruling 8 as amended; the navigation stays with the #90 implementation; the 46 locale pages change only in the
rewritten blocks and their hash. Footer `Refs: #93`, no attribution lines (queue rule). Tag
`overview-status/pre-squash`, `git reset --soft <base>`, one commit with `git -c commit.gpgsign=false commit -F
<file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[batch-1/T1-english-text.md](batch-1/T1-english-text.md) · [batch-2/T2-translations.md](batch-2/T2-translations.md) ·
[batch-3/T3-close-out.md](batch-3/T3-close-out.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-20)

- **Tasks**: 3 of 3 done (T1, T2, T3). T2 used six `general-purpose` subagents on `sonnet` (Edit only), one per
  group of locale directories; the orchestrator did T1, T3, every check and every commit.
- **Result**: the overview page, the home page and the README say that all in-scope ELK layout algorithms are ported
  and checked against ELK built from source, that the accepted export surface is not in `src/index.ts` yet, and that
  1.0 (not the first npm publish) freezes the surface. The 46 locale pages carry the same four blocks and a fresh
  `sourceHash`; each differs from the base in three hunks and nothing else. `docs:i18n-status` lists two stale pages
  per locale (`conformance.md`, `guide/architecture.md`) where it listed three.
- **Decisions**: D1-D6 as planned. Journaled judgment calls, none flagged for review: `/guide/roadmap` stays
  unprefixed in the locale pages (the brief's T2 step 3 said to prefix it; the page is English-only); six wording
  corrections by the orchestrator after reading every hunk (de, sv, fi, et, ko, ru); subagents ran in the foreground
  (driver prompt); no attribution trailer (queue rules).
- **Finding**: the two pages that stay stale are not stale through the hash alone, as the brief assumed. Their
  copies are snapshots of the English sources at `0932a534` (2026-10-11); the conformance source has gained 2,189
  lines since. Filed as #133.
- **Gates 1-7**: green. Coverage 1,176 files, 49,324 tests passed, 93 skipped; 98.81 / 96.99 / 98.56 / 98.86 %.
  `docs:build` 200 typedoc warnings (as at the base); `docs:linkcheck` 555 links, none broken. `codeql` clean with no
  new accepted entry. Gate 7 diff empty.
- **Issues**: #133 (`follow-up`). #90 has the hand-off comment listing every #90-dependent sentence by path. No
  `needs-ruling` issue; no stop condition met. #93 has a summary comment and stays open until the branch merges.
- **Landing**: one commit on `9c31c988`; the per-task history is under the tag `overview-status/pre-squash`.
