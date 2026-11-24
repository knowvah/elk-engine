<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: heading-slug-underscore (issue #94, part 2)

AD-1…AD-17 (`plans/elk-engine-skeleton/decisions.md`), the queue rules and the maintainer's rulings on #94
(2026-11-20) apply. D1-D4 were auto-confirmed at planning (unattended run, 2026-11-24); evidence and rejected
options are under [Auto-confirmed](#auto-confirmed-unattended).

## D1. The rule change

`NOT_SLUG_CHARS` becomes `/[^\p{L}\p{N}\p{M}\p{Pc}\s-]/gu`: the one change to `headingSlug`'s code. `trim`,
`toLowerCase` and `.replace(/\s/g, '-')` stay as they are, in that order. Pc at Node's Unicode 17 is exactly ten
code points (U+005F, U+203F, U+2040, U+2054, U+FE33, U+FE34, U+FE4D, U+FE4E, U+FE4F, U+FF3F); planning probed all
ten through github-slugger 2.0.0 (`node_modules/github-slugger`, a transitive dev dependency) and it keeps every one.

The doc comment at `config.ts:107-115` says "Heading ids exactly as GitHub computes them". After the change that is
still false (D2, D4), so T1 rewrites it to state the rule as ruled: github-slugger's rule for letters, numbers, marks
and connector punctuation (kept, so Java identifiers keep `_`; #94), with every whitespace character turned into `-`,
where GitHub drops non-ASCII whitespace (#94 ruling). The comment at `:135` (`headingSlug` gives `parallelnode`)
becomes `parallel_node`; its argument (the reference link `#parallel-node` would miss) still holds.
`docs-site/.vitepress/README.md:132` and `test/docs/site-config.test.ts:53` say "GitHub's rule": T1 qualifies each
the same way. Prose only; wording is push-forward.

## D2. Whitespace is unchanged

The final ruling keeps `-` for non-ASCII whitespace. No code change; two new rows pin it with the site's current
values (`a\u00a0b` → `a-b`, `foo\u2003bar` → `foo-bar`), taken from the issue's probe table and re-measured at
planning.

## D3. The new rows

A new `it.each` in `test/docs/site-config.test.ts`, calling `pageHeadingSlug(heading, 'guide/getting-started.md')`
(the non-reference path the existing row 74 uses; `headingSlug` is not in the test's `SiteConfigModule` interface,
and going through `pageHeadingSlug` also proves the dispatch). Rows, expected values from github-slugger for the
non-whitespace rows and from the site for the whitespace rows (all re-measured at planning):

| Heading | Expected | Source |
| ------- | -------- | ------ |
| `snake_case heading` | `snake_case-heading` | github-slugger |
| `PARALLEL_NODE` | `parallel_node` | github-slugger (also the changed row 74) |
| `a\u203fb` (`‿`) | `a\u203fb` | github-slugger |
| `a\uff3fb` (`＿`) | `a\uff3fb` | github-slugger |
| `1. Oracle` | `1-oracle` | github-slugger and site (unchanged) |
| `A \u2014 B` (`—`) | `a--b` | github-slugger and site (unchanged) |
| `a\u00a0b` | `a-b` | site (ruling: keep `-`) |
| `foo\u2003bar` | `foo-bar` | site (ruling: keep `-`) |

The `＿` row is the one row beyond the probe table: the ruling names all of Pc, and it is the non-ASCII Pc a reader
is likeliest to paste. More Pc rows are push-forward, each expected value taken from github-slugger before the edit.
Write inputs with `\u` escapes so prettier and editors cannot normalise them.

Row 74 changes to `'parallel_node'` under the ruling. No other existing `expect` line, title or row changes: the
`describe`/`it` titles stay (a title is not an assertion; renaming is out of scope).

## D4. Other differences are a follow-up

Planning swept every code point U+0020–U+2FFFF (no surrogates) as `a<c>b` through the D1 rule and through
github-slugger. Besides the 19 whitespace cases (D2), 7,355 differ, none of them Pc: the site keeps 915 `No`
(`²`, `³`, `¼`…), 5,567 `Lo`, 222 `Mn`, 150 `Lm`, 129 `Ll`, 120 `Nd`, 93 `Lu`, 26 `Mc`, 3 `Nl` that github-slugger
drops (its `regex.js` is a fixed character list, apparently from an older Unicode version than Node's 17.0), and
github-slugger keeps 130 that the site drops. None is in the ruling, so T2 files them as one `follow-up` issue with
T2's own re-run of the sweep, and changes nothing.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 | Add `\p{Pc}` to the kept classes; rewrite the "exactly as GitHub" comment | (a) add only `_`: the ruling names all of Pc; (b) depend on github-slugger at build time: it differs from the ruled whitespace rule and from Node's Unicode (D4), and is only a transitive dependency of linkinator | #94 ruling comments (2026-11-20); planning probe of the ten Pc code points through `node_modules/github-slugger` (all kept) |
| D2 | No whitespace change; pin the site's values | Follow GitHub (drop): ruled out by the maintainer | #94 final ruling comment |
| D3 | One `it.each` through `pageHeadingSlug` on the getting-started path; `\u` escapes; one extra `＿` row | (a) export `headingSlug` into the test interface: adds a second entry point for no gain; (b) a row per Pc code point: ten near-identical rows; the class is the rule, two rows sample it | `test/docs/site-config.test.ts:20-27,72-77`; ruling "new rows pin the probe table" |
| D4 | File the rest as `follow-up` | Fix them here: outside the ruling, and the maintainer decides what joins the queue | Planning sweep numbers above; queue rules ("New defects or cleanups … `follow-up`") |
| Scope | No landed page id changes, proven by a base-vs-final id inventory of the built site | Trust the planner's grep alone | Planning grep: no heading with a Pc character in `docs/`, `plans/roadmap.md`, `README.md`, `CONTRIBUTING.md` or `docs-site/` outside `reference/` (only `#` comment lines inside code blocks) |
