<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: overview-status (issue #93, 2026-11-20)

## Observation: Edit-only subagents keep unchanged translation lines byte-identical

- **Context**: T2, refreshing four blocks and the `sourceHash` in 46 locale pages.
- **Finding**: Six `general-purpose` agents on `sonnet` (3 to 5 locales each, one shared brief file under `$TMPDIR`
  named in each prompt, "Edit only, five replacements per locale") finished in 43 to 87 s each. A per-file line diff
  against the English commit showed exactly three hunks per page and nothing outside the blocks, in all 46. Prettier
  then changed one file. The reports were bare file lists, as asked.
- **Impact**: For a partial refresh of translated pages, use Edit-capable agents, not `technical-writer` (Write only,
  see `docs-site.md`). Put the hashes in the brief: one value per English page serves every locale.
- **Confidence**: High

## Observation: what the translators got wrong, and where

- **Context**: Reading every translated hunk before the T2 commit.
- **Finding**: Six defects in 46 pages, all in the short or list-like parts. The home tile (a one-line summary) lost
  "in-scope" in two locales (fi, et) and so claimed every ELK algorithm. A plural list item ("the ELK JSON and textual
  graph formats") became singular in two (de, sv). A title built by analogy ("Pre-alpha" → "Pre-1.0") came back as a
  prefix glued to a number in two non-Latin locales (ko, ru). The long warning bodies had none.
- **Impact**: Check qualifiers in the shortest strings first; give non-Latin locales a described meaning ("before
  1.0") for titles, not a pattern to imitate.
- **Confidence**: Medium (one run)

## Observation: the translated conformance and architecture pages are 2026-10-11 snapshots

- **Context**: T3 step 2, checking whether an issue covers the two pages that stay stale.
- **Finding**: All 23 copies of `conformance.md` and `guide/architecture.md` record the hash of their English sources
  at `0932a534`. `docs/conformance.md` has gained 2,189 lines since; the architecture sources 71. Only
  `guide/overview.md` was stale through the hash alone (the pin moves edited its sha line in every copy). To find the
  revision a recorded hash belongs to: hash `git show <c>:<source>` (concatenated in `INCLUDED_SOURCES` order) for
  each commit of `git log -- <source>` and compare.
- **Impact**: A fresh `sourceHash` on those two pages needs a full translation pass (#133). A stale list from
  `docs:i18n-status` says nothing about how much drifted; measure before scoping.
- **Confidence**: High

## Observation: prettier and YAML front-matter scalars

- **Context**: T1 and T2, the home page's feature tiles.
- **Finding**: Prettier leaves a multi-line plain scalar (`details: text` plus six-space continuation lines) as it
  is and does not wrap an over-long one. When the first line passes `printWidth` (120) it moves the whole value below
  the key (`details:` then indented lines), which is the shape the English "Faithful to ELK Java" tile already has.
- **Impact**: Wrap tile text by hand at 120 columns; a `prettier --write` change in a front matter is this move, not
  a content change.
- **Confidence**: High
