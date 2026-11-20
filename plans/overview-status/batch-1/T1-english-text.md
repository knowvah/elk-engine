<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: rewrite the English text

## Context

#93: `docs-site/guide/overview.md` still says "No layout algorithm is ported yet" and "the first npm publish freezes
this surface". Both are false: roadmap rows 7a-8c are done, and #90's ruling 8 (amended on #91) moves the freeze to
1.0. The home page and README carry the same text (D1).

## Read-set

`docs-site/guide/overview.md`, `docs-site/index.md`, `README.md`, [decisions.md](../decisions.md) D1-D3 and D6,
`plans/roadmap.md` (rows 7a-8c and the latest revisions), `docs-site/parity.md` (head),
`docs-site/guide/getting-started.md` (head), and the #90 ruling comment (`gh issue view 90 --comments`).

## Write-set

`docs-site/guide/overview.md` (`:14-18`, `:45-48`), `docs-site/index.md` (feature tile `:27-29`, warning `:34-37`),
`README.md` (`:9-13`, `:23-26`), `plans/overview-status/decision-journal.md`. No other line of the three files.

## Steps

1. Journal one `claim` row per D3 claim with its source (for example: claim 1 → `plans/roadmap.md` rows 7a-8c
   and the parity report's case count; claim 2 → #90 ruling comment and `src/index.ts` `export {}`; claim 3 → #90
   ruling 8 and its amendment). A claim without a source is stop 3.
2. Rewrite the blocks per D3, starting from its drafts. Keep each page's #90-dependent text to one sentence, and
   journal that sentence verbatim per file (T3 lists them on #90).
3. `npx prettier --write` on the three files, then check that the diff touches only the write-set lines (prettier may
   rewrap the paragraph it is in; nothing outside the edited blocks).
4. `npx vitest run test/docs` (all docs tests) and `npm run docs:build` (VitePress checks body links: `/parity` and
   `/guide/getting-started` must resolve). Then `npm run docs:linkcheck` against the built site (anchors and links).
   Journal the results.

## Acceptance criteria

- Given the three files, when grepped for `No layout algorithm|Pre-alpha|first npm publish freezes|No layout
  algorithms yet`, then nothing matches.
- Given `git diff <base> -- docs-site/guide/overview.md docs-site/index.md README.md`, then only the blocks of the
  write-set differ, and each file holds exactly one sentence that depends on #90 (journaled verbatim).
- Given `npx vitest run test/docs`, `npm run docs:build` and `npm run docs:linkcheck`, then all pass. A failure on a
  changed sentence is stop 4, not a test edit.
- Given the decision journal, then every D3 claim has a `claim` row naming its source.

## Interface output (consumed by T2)

The T1 commit sha. T2 hashes `docs-site/<p>/guide/overview.md` and `docs-site/<p>/index.md` against the English
files as of that commit, and translates `git diff <base> <T1> -- docs-site/guide/overview.md docs-site/index.md`.

## Observability

N/A: documentation only.

## Rollback

Reversible: revert the commit.
