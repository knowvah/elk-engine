<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: rows first, then the rule

## Context

`headingSlug` drops `_` and the rest of Unicode Pc; the #94 ruling keeps them and allows exactly one expected value
to change (`site-config.test.ts:74`). See the [README](../README.md#objective) and
[D1](../decisions.md#d1-the-rule-change)-[D3](../decisions.md#d3-the-new-rows).

## Read-set

- `docs-site/.vitepress/config.ts:105-155` (`headingSlug`, `referenceHeadingSlug`, `pageHeadingSlug`) and `:180-195`
  (`markdown.anchor`, `markdown.toc`)
- `test/docs/site-config.test.ts:1-77`
- `docs-site/.vitepress/README.md:125-135`
- `node_modules/github-slugger/index.js` (the `slug()` export; read to confirm, do not copy)
- `.agent-notes/docs-publish-prep.md` (T5 observations), `.agent-notes/docs-site.md` (heading ids, lizard and regex
  literals)

## Write-set

`test/docs/site-config.test.ts`, `docs-site/.vitepress/config.ts`, `docs-site/.vitepress/README.md`,
`plans/heading-slug-underscore/decision-journal.md`. Scratch scripts and inventories under `$TMPDIR` only.

## Steps

1. **Base id inventory.** On the untouched tree run `npm run docs:build`, then extract every `id="…"` of a heading
   (`<h1>`…`<h6>`) from each `docs-site/.vitepress/dist/**/*.html` outside `reference/`, as sorted `page<TAB>id`
   lines, to `$TMPDIR/hsu-ids-base.txt`. Journal the page and id counts.
2. **Re-measure the rows.** For each D3 row, compute github-slugger's `slug()` (non-whitespace rows) and the base
   `pageHeadingSlug(heading, 'guide/getting-started.md')` (all rows) with a scratch script; journal both columns.
   A disagreement with D3 is stop 5 for that row.
3. **Red.** Add the D3 `it.each` (inputs as `\u` escapes) and change row 74 to `'parallel_node'`. Run
   `npx vitest run test/docs/site-config.test.ts`: journal which rows fail. Expected red: row 74 and the
   `snake_case`, `PARALLEL_NODE`, `‿` and `＿` rows; the other four pass.
4. **Green.** Add `\p{Pc}` to `NOT_SLUG_CHARS` (D1). Rerun step 3's command: all pass. Update the four prose sites
   of D1. Keep the regex a literal without quote characters (the lizard tokenizer note in
   `.agent-notes/docs-site.md`).
5. **Final id inventory.** `npm run docs:build` again, same extraction to `$TMPDIR/hsu-ids-final.txt`;
   `diff` against the base must be empty (stop 4 otherwise). Then `npm run docs:linkcheck`: 0 broken.
6. `npx prettier --check` on the three edited files; `git diff --stat <base>` lists only the write-set. Journal a
   `fix` row with the diagnosis artifact (mechanism: `NOT_SLUG_CHARS` omits `\p{Pc}`; origin `config.ts:116`;
   causal chain to `parallelnode`; ruled out: the reference path, which uses `referenceHeadingSlug`) and commit
   (batch-1 overview).

## Acceptance criteria

- Given `pageHeadingSlug('PARALLEL_NODE', 'guide/getting-started.md')`, when the suite runs, then it returns
  `'parallel_node'`, and the reference path still returns `'parallel-node'`.
- Given the D3 rows, when they were first run (step 3), then the four Pc rows and row 74 failed, and after step 4
  all rows pass with the expected values of D3.
- Given `git diff <base> -- test/`, then the only changed existing line holding an expected value is row 74; all
  other changes are added rows and the comment at `:53`.
- Given the base and final id inventories, then `diff` prints nothing, and `npm run docs:linkcheck` reports
  0 broken links.

## Observability

N/A: a build-time slug function of the docs site; no runtime operation.

## Rollback

Reversible: revert the commit. No published id changes (step 5 proves it).
