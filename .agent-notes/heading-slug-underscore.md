<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — heading-slug-underscore (issue #94 part 2, 2026-11-24)

## Observation: github-slugger's underscore rule, read from the package

- **Context**: T1. `.agent-notes/docs-publish-prep.md` ("`headingSlug` is not GitHub's rule for underscores") recorded
  this at Medium confidence, from memory.
- **Finding**: Confirmed from `node_modules/github-slugger` 2.0.0: `slug()` lowercases, removes the characters of
  `regex.js`, then replaces each ASCII space with `-`. It keeps all ten Pc code points. Since this mission `headingSlug`
  keeps `\p{Pc}` too (`PARALLEL_NODE` → `parallel_node`), so that note's finding no longer holds for the site.
- **Impact**: A canonical doc may now use a `snake_case` heading with a GitHub-style link.
- **Confidence**: High

## Observation: three measured causes for the remaining differences from github-slugger

- **Context**: T2, the D4 sweep (every code point as `a<c>b`), filed as #176.
- **Finding**: (1) github-slugger keeps 0 of 915 `No` code points (`²`, `½`) while the site's `\p{N}` keeps them: a class
  difference. (2) The 130 `So` it keeps and the site drops are the circled and squared Latin letters; all have the
  `Alphabetic` property and it drops the other 7,338 `So`. (3) Its `package.json` names `@unicode/unicode-13.0.0` as the
  generator's data; Node 26.3.1 is Unicode 17.0, and the `L`/`M`/`Nd`/`Nl` code points it drops (7,225 minus the `No`
  up to U+2FFFF) fit blocks added after 13.0. Whitespace: it also drops U+0009–U+000D, which the site turns into `-`.
- **Impact**: "As GitHub" can only mean github-slugger 2.0.0 for causes 1 and 2; cause 3 moves with every Node upgrade.
  Whether github.com itself matches the npm package on post-13.0 code points was not measured.
- **Confidence**: High for the counts and for causes 1 and 2; Medium for cause 3 (block ages from memory, not the UCD)

## Observation: `plans/roadmap.md` is a site page, so a roadmap revision adds a heading id

- **Context**: T2, the base-vs-final id inventory.
- **Finding**: `docs-site/guide/roadmap.md` includes `plans/roadmap.md`. Appending `## Revision …` adds one heading id to
  `guide/roadmap.html`, so an id inventory taken after the roadmap append differs from the base by that line.
- **Impact**: Take a "no published id changed" inventory before the roadmap append, or expect exactly the new revision id.
- **Confidence**: High

## Observation: scratch scripts that import `config.ts`

- **Context**: T1 and T2 scratch scripts under `$TMPDIR`.
- **Finding**: `npx tsx script.mts <repo root>` with a dynamic `import(pathToFileURL(…/docs-site/.vitepress/config.ts))`
  works from outside the repository. `npx tsx -e` does not: it compiles to CJS and `i18n.ts` has a top-level `await`
  ("Top-level await is currently not supported with the cjs output format").
- **Impact**: Write the scratch as an `.mts` file.
- **Confidence**: High
