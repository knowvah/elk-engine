<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal — npm-1-0-release

Append only. Kinds: `start`, `ruling`, `gate`, `fix`, `note`.

| Time             | Task | Kind    | Entry |
| ---------------- | ---- | ------- | ----- |
| 2026-11-23 07:30 | -    | start   | Maintainer asked to start publishing `@knowvah/elk-engine`; first said 0.1, then "let's go 1.0". `src/index.ts` was `export {}`, #90 and #91 open (`PUBLISHING.md`). Branch `feature/public-api-1-0` from `main` at `4c380f26`. |
| 2026-11-23 07:40 | N1   | ruling  | Asked whether to accept the 69-export surface as is. Answer: "Close. We should also support an async render call, if possible/appropriate." Accepted with one addition (N3). |
| 2026-11-23 07:42 | N3   | ruling  | Shape chosen from three offered: `layout(json, options?) => Promise<json>`. See `decisions.md` N3. |
| 2026-11-23 07:53 | N3   | note    | `src/layout.test.ts` written first; expected values are the oracle ref and input twin of the `json-roundtrip` example (recorded before this file existed, AD-13). Red (module missing), then green after `src/layout.ts`: 7 of 7. |
| 2026-11-23 07:55 | N5   | note    | A guessed `ProbeRegistry` in a first draft did not exist (typecheck caught it). `Registry.register` is a `Map.set` keyed by id (`LayoutMetaDataService.ts:92-100`), so registering a provider twice replaces equivalent entries and cannot throw; the once-per-instance `WeakSet` guard is all that is needed. Test "works when the caller registered a provider first" covers it. |
| 2026-11-23 08:10 | N1   | ruling  | Accepting "as is" is taken to keep the answers the proposal gave to its open questions 1 to 6; recorded in `docs/architecture/public-api.md`. Question 7 is answered by N3/N5, question 8 by N2. |
| 2026-11-23 08:15 | N1   | note    | On-acceptance steps 1 to 5 applied: `src/index.ts` (71 export statements, 72 names), `candidate-index.ts` deleted, `candidate-index.test.ts` moved to `src/index.test.ts` and repointed (named in the doc as a ruling, AD-13); it gains a tier 5 exemption from the Java-class check, with a test that the exempt rows are exactly `layout`, `ElkJsonGraph`, `LayoutOptions`. Mappings in `tsconfig.json`, `vitest.config.ts`, `tools/typedoc/typedoc.json`, `tools/typedoc/tsconfig.json` flipped; `ci.yml` drops the `--entry` step; `pack-smoke` default mode now also lays out through the installed `layout`. Nav and sidebar gain Getting started and API reference as English-only links; `test/docs/locale-complete.test.ts` pinned lists extended accordingly (the 4 expectations the doc names). |
| 2026-11-23 08:20 | N2   | gate    | `npm run pack:smoke` (default mode, real entry): 4221 files, contents ok, import ok with 57 exports (= the 57 value rows), `layout`-free consumer replaced by a `layout` consumer, equals the oracle ref at 1e-6. |
| 2026-11-23 08:30 | N4   | ruling  | AD-8 fitness test failed on `src/layout.ts` (2 failures: import direction, unmapped directory): only `src/index.ts` was exempt as a composition root. The first edit was denied by the permission classifier; the maintainer was asked and chose "Exempt layout.ts as 2nd root". `module-boundaries.fitness.test.ts` gains `COMPOSITION_ROOTS = [index.ts, layout.ts]` and a test that `layout.ts`, and no other root file, is exempt. No other assertion changed. AD-8 amendment. |
| 2026-11-23 08:45 | gate | gate    | `typecheck` clean; `complexity` exit 0 (the same 2 AST-only approximations); `codeql` ok; `docs:build` ok; `pack:smoke` ok; `publish:check` ok (4,221 files, 4.5 MB); touched tests 1,148 passed. `npm run coverage`: 49,523 passed, 2 failed, so no coverage table: `labels-sweep` and `phase-sweep`. Both fail identically on a detached worktree of `main` at `4c380f26` with the local caches copied in, so not caused by this branch (see `.agent-notes/npm-1-0-release.md`). Coverage thresholds and `docs:linkcheck` (`linkinator` not installed locally) not verified here. |
| 2026-11-23 09:00 | gate | ruling  | The maintainer: file the two sweep failures to be diagnosed immediately after the publish; "a bug fix doesn't generate a major version change". Filed as #151 (labels sweep, `273_insideSelfLoopsWithLabels`) and #152 (phase sweep, `DepthFirstModelOrderLayerer`), label `bug`, no `queue:*` label so the queue does not pick them up before the publish. They do not block 1.0.0. |
| 2026-11-23 10:00 | N2   | fix     | After the 1.0.0 publish (npm `gitHead` `304ef29f`, 4,221 files, 23,392,404 bytes unpacked, `latest` 1.0.0 at 15:25Z; a `0.0.0-stage` placeholder created 15:21Z by npm sits beside it) the maintainer pointed out the README Status was wrong. Stale claims ("Pre-1.0", "export surface accepted but not yet in `src/index.ts`", "Until 1.0 the API may still change", "Versions stay 0.x until 1.0", "Nothing has been published yet") rewritten in `README.md`, `docs-site/index.md`, `docs-site/guide/overview.md`, `PUBLISHING.md` and the `release.yml` header. Each new claim has a source in this journal or `docs/architecture/public-api.md`; "differences still open are tracked as issues" is #151 and #152. The 23 translated copies of the two site pages still carry the old text: English only in this change. |
| 2026-11-23 11:00 | N2   | fix     | Refreshed the 23 translations of `guide/overview.md` and `index.md` for #155's notice and tile. Brief 1 to six `general-purpose` agents on Sonnet (3 to 4 locales each, Edit only): hash plus notice (plus tile in `index.md`). Checked: every changed line of the 46 pages lies in the `sourceHash` line, the notice or the tile; qualifiers read in all 23 locales ("in scope", "still open", 72, frozen, semver). Locale hashes had matched the English files at `1b864c3b` before #155, so the notices were the only drift. |
| 2026-11-23 11:20 | N2   | fix     | While reading the pages I found the English "Public contract" paragraph (`docs-site/guide/overview.md`, `README.md`) still said "Versions stay 0.x until 1.0; 1.0 freezes the surface", which #155 missed, and was inaccurate against `docs/architecture/public-api.md`: it listed "the ELK JSON and textual graph formats" (text formats are not exported), gave options "with their value types" (only the core options' value types are exported), and omitted `layout`. English fixed (72 exports, core options' value types, ELK JSON adapter, async `layout`, frozen at 1.0.0, semver, removing an export is a major version). Overview hash became `a7927ee7…`; brief 2 re-ran the six agents on that one paragraph and hash in the 23 overview pages. The Icelandic notice used "Að byrja" for the getting-started link where the site says "Fyrstu skref": aligned to "Fyrstu skrefum" in both Icelandic pages. `docs:i18n-status` lists only `conformance.md` and `guide/architecture.md` as stale (#133), as before; `test/docs` 897 passed; `docs:build` ok. |

## 2026-11-23 — conformance.md becomes English-only (ruling in #133)

The maintainer ruled "English only" on #133 and asked to keep `guide/architecture.md` translated. Done: the 23
`docs-site/<locale>/conformance.md` pages are removed, `conformance.md` is in `TRANSLATABLE_EXCLUDES`
(`docs-site/.vitepress/i18n.ts`) and in the copy in `scripts/docs-i18n-status.mjs`, the nav and sidebar entries use
`english()` (unprefixed `/conformance`, "(English)" mark), the showcase generator (`docs-site/copy-goldens.mjs`) links
`/conformance`, and the `/<locale>/conformance` links in the locale pages (5 per locale) point to `/conformance`.
Makes #109 and #131 moot.

**AD-13 note.** Five test assertions changed because they encode the removed behavior, not because an implementation
failed: `goldens-i18n` (the showcase link is unprefixed), `locale-complete` (the Conformance link is English-only),
`translation-lint` (`/conformance` is an English-only URL), `i18n-status` (the fixture's English page set no longer
lists `conformance.md`). No tolerance, vector or golden changed. Flagged to the maintainer in the PR.

## 2026-11-23 — refresh of the architecture translations (#133)

The built English page `/guide/architecture` was broken: `docs-site/guide/architecture.md` included line ranges of
`docs/architecture/overview.md` and `component-map.md` that had gone stale as both grew, so the page lacked "What
elk-engine is" and "Key flows" and cut the document table mid-row. Ranges fixed (overview `{3,43}`, `{62,70}`, `{85,}`;
component map `{3,20}`, `{71,100}`, `{125,}`). The maintainer chose to show everything, so the translations carry the whole
overview (22-row document table, the mission-by-mission status paragraph, the three adapter paragraphs, the toolchain
section) and the component map's new paragraph. Stale English fixed first: "Nothing is published yet" (now `1.0.0` was
published on 2026-11-23), the release row (runs on every push to `main`), the `--entry` mention of `pack:smoke`.

All 23 `docs-site/<locale>/guide/architecture.md` pages refreshed by six Sonnet agents (3-4 locales each, Edit only), new
`sourceHash` `b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21`. Verified: every page carries the 43
GitHub links the English sections contain and no bare relative `.md` link; every number in the English sections appears in
every page (Estonian writes four-digit numbers unseparated); prettier clean; `test/docs` 782 passed; `docs:i18n-status`
reports no stale or missing page; `docs:build` ok. Repo-only docs link to `github.com/.../blob/main/docs/architecture/`,
as `rewriteIncludedHref` does on the English page.

## 2026-11-24 — carry #171's overview edit into the architecture translations

#171 (merged while this refresh was open) changed one line of `docs/architecture/overview.md`: mission 7g's oracle rows
1,627 → 1,642 (`sites` 64 → 79), and issue #58's three `elk.stress` cases "wait (mission 8b)" → "waited for mission 8b
and run since its ruling was carried out (mission layered-stress-cases)". Both facts updated in all 23
`docs-site/<locale>/guide/architecture.md` pages (number separators kept per locale). The edit keeps the overview at 135
lines, so the include ranges stay valid. New `sourceHash`
`bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5` (merged overview + component map).
