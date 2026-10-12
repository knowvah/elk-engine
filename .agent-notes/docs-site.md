<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — docs-site (2026-10-11 → 2026-10-12)

## Observation: VitePress `@include` is a text substitution

- **Context**: T2/T3, wrapping `docs/*.md` as site pages (D3).
- **Finding**: `processIncludes` splices the included text before markdown-it runs, so relative
  links inside the included file resolve against the _wrapper_ page. `docs/architecture/overview.md`'s
  `inventory.md` became `/guide/inventory` by luck, `component-map.md` and `../translation-rules.md`
  went dead. Front matter of the included file is stripped only for whole-file includes (no
  range/region).
- **Impact**: Any include wrapper needs the `link_open` rewrite in `config.ts`
  (`INCLUDE_SOURCE_DIR` + `CANONICAL_PAGES`); add a row there when a new canonical doc is wrapped.
- **Confidence**: High

## Observation: VitePress heading ids are not GitHub's

- **Context**: German review; the English conformance TOC links `#1-oracle` did not resolve.
- **Finding**: VitePress 1.6.4's default slugify prefixes `_` on digit-leading slugs
  (`_1-oracle`) and turns inner punctuation into hyphens (`2.0 How` → `2-0-how`); GitHub drops
  punctuation and keeps the digit (`20-how`). VitePress never checks in-page anchors. The client
  scrolls with `getElementById`, and the outline uses a quoted attribute selector, so digit-leading
  ids are safe. `markdown.anchor.slugify` and `markdown.toc.slugify` take the same function;
  `headers` is unused here.
- **Impact**: `headingSlug` in `config.ts` implements github-slugger's rule; translated pages keep
  diacritics in anchors. The scratchpad anchor check (ids vs `href="#…"` over every built page) is
  the only guard.
- **Confidence**: High

## Observation: VitePress dead-link check scope

- **Context**: T3, linking to pages that do not exist yet.
- **Finding**: `linkPlugin` records only body `link_open` hrefs; front-matter `link:` values (hero
  actions) and links to non-page files (`.ts`, `.json`) are never checked. Nav/sidebar links are
  not checked either.
- **Impact**: A hero action can point at a not-yet-generated page; body prose cannot.
- **Confidence**: High

## Observation: lizard mis-tokenizes regex literals in TS/JS

- **Context**: Every lizard gate from T4 on.
- **Finding**: lizard 1.17 treats a `/…"…/` or `/…`…/`regex literal as the start of a string and
merges every following function into one (a 5-line`escapeXml`reported as 68 NLOC). Writing
the quote as`\x22`/`\x27`/`\x60`or building the pattern with`new RegExp` avoids it.
- **Impact**: Spurious NLOC failures on otherwise small functions; check the regex first.
- **Confidence**: High

## Observation: `import.meta.main` raises the docs floor to Node 24.2

- **Context**: T5–T7 copy scripts, copied from dot-engine.
- **Finding**: `if (import.meta.main) main()` is the import-without-side-effects guard; Node added
  `import.meta.main` in 24.2. `package.json` `engines` still says ≥ 22 for the library.
- **Impact**: Docs scripts need Node 24.2+ (CI and volta use 26); documented in README.
- **Confidence**: High

## Observation: technical-writer agents cannot run commands or edit

- **Context**: Batches 6–11, 46 translation agents.
- **Finding**: The `technical-writer` tool set is Read/Write/Glob/WebFetch/Grep: no Bash (cannot
  compute `sourceHash`, cannot run Prettier), no Edit (cannot fix a typo after writing). Four of 23
  locales came back with a one-line fix request the orchestrator applied; one came back without the
  `sourceHash` line.
- **Impact**: Precompute hashes in the prompt, run Prettier and the lint from the orchestrator, and
  keep a pre-registration lint runner (`scratchpad/lint-locale.mts`) because the vitest suite only
  covers registered locales.
- **Confidence**: High

## Observation: local search index sizes

- **Context**: Stop condition 8 measurements.
- **Finding**: The chunk lives at `dist/assets/chunks/@localSearchIndex<p>.*.js` (not `assets/`).
  English (15 pages incl. the long reference wrappers) is ~177 KB; each locale (8 pages) is
  58–76 KB; CJK locales are the largest. A one-page site emits a 232-byte chunk.
- **Impact**: The 3× locale/English clause has large headroom; the build-time clause is noise-bound
  at this size (1.6–5.8 s cold).
- **Confidence**: High

## Observation: `npm audit` has no fix inside VitePress 1.6.x

- **Context**: T1 install.
- **Finding**: vitepress 1.6.4 nests vite ≤ 6.4.2 with esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99, dev
  server only); `npm audit` reports 3 findings with "No fix available".
- **Impact**: Accepted under D1; revisit on a VitePress 1.6.5+ or stable 2.x.
- **Confidence**: High

## Observation: `overrides` lifts VitePress 1.6.4 onto vite 6 cleanly

- **Context**: Fixing the 4 Dependabot alerts (vite ≤ 6.4.2 ×3, esbuild ≤ 0.24.2) on 2026-10-12.
- **Finding**: vite 5.x has no patched release (5.4.21 is the last). `"overrides": { "vitepress":
{ "vite": "^6.4.4" } }` in `package.json` resolves vite 6.4.4 + esbuild 0.25.12 under vitepress
  1.6.4; `@vitejs/plugin-vue` 5.2.4 already peers on vite 6. `npm audit` reports 0, and
  `docs:build`, `typecheck`, and `coverage` are unchanged. Supersedes the "no fix inside VitePress
  1.6.x" observation above.
- **Impact**: D1 (VitePress 1.6.4 line) stands. Drop the override when moving to VitePress 2.x,
  which depends on vite 8 directly.
- **Confidence**: High
