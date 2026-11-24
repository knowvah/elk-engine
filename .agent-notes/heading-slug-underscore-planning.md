<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: heading-slug-underscore (issue #94 part 2, 2026-11-24)

## Observation: github-slugger keeps all of Unicode Pc

- **Context**: Checking the #94 ruling ("keep `_` and the rest of Pc, as GitHub does") against the package.
- **Finding**: Node 26.3.1's Unicode is 17.0; `\p{Pc}` is ten code points (U+005F, U+203F, U+2040, U+2054, U+FE33,
  U+FE34, U+FE4D, U+FE4E, U+FE4F, U+FF3F). `slug('a' + c + 'b')` from `node_modules/github-slugger` (2.0.0) keeps
  each one. `slug('a\u00a0b')` is `ab` and `slug('foo\u2003bar')` is `foobar`; the site gives `a-b`, `foo-bar`.
- **Impact**: Adding `\p{Pc}` to `NOT_SLUG_CHARS` is the whole ruled change; whitespace rows pin the site's values.
- **Confidence**: High

## Observation: beyond Pc and whitespace, 7,355 code points still differ from github-slugger

- **Context**: Sweep of U+0020–U+2FFFF (no surrogates) as `a<c>b`, the D1 rule vs github-slugger.
- **Finding**: The site keeps 915 `No`, 5,567 `Lo`, 222 `Mn`, 150 `Lm`, 129 `Ll`, 120 `Nd`, 93 `Lu`, 26 `Mc`, 3 `Nl`
  that github-slugger drops (examples: U+00B2, U+00B3, U+00B9, U+0870–U+088F); github-slugger keeps 130 the site
  drops. github-slugger's `regex.js` is a fixed list; Node's `\p{…}` is Unicode 17.
- **Impact**: Out of the ruling's scope; T2 files it as a `follow-up`.
- **Confidence**: High (measured); the "older Unicode list" cause is Medium (not traced to a version)

## Observation: baseline at 1e601a2b

- **Context**: Phase 8 pre-flight for this brief.
- **Finding**: `npm run typecheck` clean; `npm run format:check` clean apart from the planner's own untracked
  `.plan-mission-progress.md` (deleted at hand-off). Full suite result: see the decision-journal `plan` row.
- **Impact**: The executor may take the planning baseline instead of rerunning gates at start.
- **Confidence**: High
