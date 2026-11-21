<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: overview-status (issue #93)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D6 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Scope: three English pages, two of them translated

The false claim "no layout algorithm is ported" appears in three English places, each with the same
"public API will be… / the first npm publish freezes" sentence:

| File | Lines at planning | What is false |
| ---- | ----------------- | ------------- |
| `docs-site/guide/overview.md` | `:14-18` (warning), `:45-48` (§ Public contract) | named by #93 |
| `docs-site/index.md` | `:27-29` (front-matter feature tile), `:34-37` (warning) | the same claim on the home page |
| `README.md` | `:9-13` (§ Status), `:23-26` (§ Public contract) | the same claim; ships in the npm tarball |

All three are rewritten in T1. The locale copies of `guide/overview.md` and `index.md` (23 each) are refreshed in T2.
`README.md` has no translations. Nothing else changes: not `guide/getting-started.md` (its "proposed surface"
notice goes with #90's acceptance step 5), not `reference/`, not `.vitepress/` config.

## D2. No navigation change; that belongs to the #90 implementation

#93 suggests rewriting "in the same change that adds the getting-started page to the navigation". That change is
#90's acceptance step 3. It goes with step 1 (filling `src/index.ts`), the `i18nRouting` revert and the link-check
exclusions tied to #92, and the maintainer approved its AD-13 rows (`test/docs/locale-complete.test.ts:91-119`) for
that mission. This mission does not touch `navFor`/`sidebarFor`, `locale-complete.test.ts`, `src/index.ts` or the
site config. Instead it keeps the one clause that depends on #90 to one sentence per page (D3) and lists those
sentences on #90 (D5), so the implementation mission changes one sentence per page.

## D3. Wording: true now, at most one #90-dependent sentence per page

Each rewritten block states only what is true at the base, with evidence journaled per claim (a `claim` row: the
sentence, the source that backs it):

1. **Ported and verified.** All in-scope algorithm bundles are ported (roadmap rows 7a-8c done, `plans/roadmap.md`)
   and compared with ELK built from source; link the [parity report](/parity) (English-only, so unprefixed in
   every locale, translation-spec rule 4).
2. **Not exported yet (the one #90-dependent sentence).** The maintainer accepted the export surface (#90, ruling
   2026-11-14); it is not in `src/index.ts` yet, so the package entry exports nothing public. Link
   [getting started](/guide/getting-started) (English-only, unprefixed) where the page mentions the surface.
3. **Stability.** Per ruling 8 as amended on #91: versions are 0.x until 1.0, 0.x may still change, and 1.0 freezes
   the surface. The sentence "the first npm publish freezes this surface" is removed everywhere in scope.
4. **The surface, by kind only.** § Public contract names what the accepted surface holds: the ElkGraph model and
   `ElkGraphUtil`, the layout engine, each algorithm's metadata provider and options with their value types, and
   the ELK JSON and textual formats. ELK JSON stays "an I/O adapter, not the core model". Do not name the
   registration helper or the error classes: #90 leaves their names to the implementation mission.
5. The container title `Pre-alpha` becomes `Pre-1.0`, and so does the home-page tile title.

Draft English, a starting point (the executor may reword within 1-5; prettier wraps):

```md
::: warning Pre-1.0
All in-scope ELK layout algorithms are ported and checked against ELK built from source; the
[parity report](/parity) has the results. The public export surface is accepted but not yet in
`src/index.ts`, so the package entry exports nothing public yet. Until 1.0 the API may still change.
See the [roadmap](/guide/roadmap) for what comes next.
:::
```

```md
## Public contract

The public API is the export surface accepted in [#90](https://github.com/knowvah/elk-engine/issues/90): the
ElkGraph object model and the `ElkGraphUtil` factories, the layout engine, each algorithm's metadata provider and
options with their value types, and the ELK JSON and textual graph formats. ELK JSON is an I/O adapter, not the core
model. [Getting started](/guide/getting-started) shows the surface in use. Versions stay 0.x until 1.0; 1.0 freezes
the surface.
```

The home-page tile is two short sentences (claims 1 and 3). The home-page warning is claims 1-3. README § Status and
§ Public contract follow the overview text, with repo-relative links (`plans/roadmap.md`,
`docs/architecture/public-api.md`) in place of site links.

## D4. Translations: only the changed blocks, then a fresh `sourceHash`

At the base all 23 `guide/overview.md` copies are already **stale**: the pin moves `3da09a9c` and `a23e0219` edited
the sha line in every copy without refreshing `sourceHash` (`npm run docs:i18n-status`: 3 stale pages per locale,
`conformance.md`, `guide/architecture.md`, `guide/overview.md`). The copies already carry `8bca22f4…`, so after T2
translates the blocks D1 changed and writes the new hash, `guide/overview.md` is current in every locale. All 23
`index.md` copies are current at the base and must be current after T2.

- Per locale page, the diff against the base touches only the `sourceHash:` line and the counterparts of the
  English blocks T1 changed. Every other line stays byte-identical (checked by the orchestrator, not trusted).
- `plans/docs-site/translation-spec.md` § Hard rules and § Glossary apply (front-matter keys untranslated, inline
  code and product nouns untranslated, internal links prefixed except English-only pages, `::: warning` kept with a
  translated title). Each locale keeps the vocabulary its own page already uses for "port", "oracle" and so on.
- `sourceHash` comes from `node scripts/i18n-hash.mjs docs-site/<p>/<page>` after T1 is committed. The orchestrator
  computes it and puts it in each prompt, because translators may not have Bash (`.agent-notes/docs-site.md`).
- Translators are subagents with Edit, never Write, so unchanged lines cannot drift. The orchestrator runs prettier,
  the lint and the status script, and commits.
- `conformance.md` and `guide/architecture.md` stay stale (out of scope). T3 checks whether an open issue covers them
  (#109 and #131 cover only some of that text) and files a `follow-up` if none does.

## D5. Hand-off to the #90 implementation

T3 comments on #90 listing, by path, the one #90-dependent sentence in each of the three English files and in the 46
locale pages, plus `guide/getting-started.md`'s notice, which still says the maintainer "has not accepted yet" and is
false since 2026-11-14 (it is already #90 step 5). The issue stays open, and no file in `docs/architecture/` is
edited.

## D6. AD-13 is not engaged

No test, vector or golden pins these texts. Planning grep (`Pre-alpha|No layout algorithm|features|overview` over
`test/`) found only path and fixture uses (`i18n-status.test.ts`, `locale-complete.test.ts` nav rows,
`translation-lint.test.ts` fixtures), none on the changed prose. `test/release/pack-contents.test.ts` lists
`README.md` by name, not content. If any test fails on a changed sentence, that is stop 4.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 | overview + home page + README, with both pages' translations | (a) overview only: leaves the home page contradicting the overview with the same false sentence; (b) also edit getting-started: that is #90 step 5, done when the surface lands | `grep -rn "Pre-alpha\|No layout algorithm"` at `9c31c988`: `README.md:11`, `docs-site/index.md:27,34`, `docs-site/guide/overview.md:14` + 46 locale copies |
| D2 | Leave the navigation to the #90 mission | Add the getting-started page and `/reference/` to the nav here: the AD-13 approval for `locale-complete.test.ts:91-119` is part of #90's acceptance; the page shows imports `src/index.ts` does not export yet; and the `i18nRouting` revert plus link-check exclusions (#92) come with it | #90 body "What accepting triggers" 1-5; #90 ruling comment (2026-11-14); `src/index.ts` at `9c31c988` (`export {}`) |
| D3 | Present-true wording, one #90-dependent sentence per page, freeze at 1.0 | (a) wait for #90 so the text never mentions "not yet": leaves a false page live with no date; #93 is `queue:ready` after the ruling; (b) keep "first npm publish freezes": false under ruling 8 as amended | #90 ruling 8 + amendment; roadmap rows 7a-8c; `docs-site/parity.md` |
| D4 | Edit changed blocks only, refresh the hash, subagents with Edit | (a) retranslate whole pages: churn in reviewed text; (b) leave the hash stale: the status script keeps reporting it | `npm run docs:i18n-status` at the base; `git show a23e0219 --stat`; `.agent-notes/docs-site.md` (technical-writer cannot run Bash or Edit) |
| D5 | Comment on #90 | Edit `docs/architecture/public-api.md` § On acceptance: that is the accepted proposal, and a comment reaches the planner of #90 just as well | #90 body ("The full list is the proposal's 'On acceptance' section") |
| D6 | No ruling needed | Filing `needs-ruling` first: nothing pins prose | grep above |
