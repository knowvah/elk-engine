<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: docs-publish-prep (roadmap row 12, issue #43)

| ID | Decision (one line) |
| -- | ------------------- |
| DP1 | The export surface is a proposal doc plus a candidate entry module under `test/public-api/`; `src/index.ts` stays `export {}` |
| DP2 | The candidate holds only what a consumer needs to build, configure, lay out and serialize a graph; Java names, no new API |
| DP3 | TypeDoc runs from an isolated `tools/typedoc/` package on TypeScript 6.0.3; the root stays on TypeScript 7.0.2 |
| DP4 | Examples are real TS files included into a docs page; their expected output is a new oracle golden set `examples` |
| DP5 | Link check: linkinator over the built site, internal links and fragments, blocking; external links weekly, not on PRs |
| DP6 | The new pages are English-only and stay out of `navFor`/`sidebarFor` until the surface ruling (pinned tests) |
| DP7 | semantic-release configured as in dot-engine, but `release.yml` runs only by `workflow_dispatch`; nothing is run |
| DP8 | A pack rehearsal proves the tarball contents and, for the candidate, install and layout in a clean project |
| DP9 | Maintainer-only parts become two `needs-ruling` issues; nothing is published, no `npm login`, no registry write |

Planning evidence (probes run under `$TMPDIR`, never in the worktree) is in
`.agent-notes/docs-publish-prep-planning.md`.

## Auto-confirmed (unattended)

Every decision below was taken by the planner without a person present (`/plan-mission --unattended`). Each lists the
rejected options and the evidence so the maintainer can audit it.

### DP1 — Proposal, not acceptance {#dp1}

- **Decision.** `docs/architecture/public-api.md` proposes the surface: one row per export, with its Java class (`@see`),
  tier and reason, plus open questions and the steps to take on acceptance. The exact proposed entry module is committed as
  `test/public-api/candidate-index.ts`. `src/index.ts` is not edited. One mapping, `@knowvah/elk-engine` → the candidate,
  lives in `tsconfig.json` `paths`, `vitest.config.ts` `resolve.alias` and `tools/typedoc/typedoc.json` `entryPoints`;
  acceptance flips these three to `src/index.ts` and moves the candidate's content there.
- **Rejected.** (a) Export the surface from `src/index.ts` now: it would pre-empt the maintainer-only acceptance named in
  #43 and contradict CLAUDE.md ("`src/index.ts` exports nothing yet"). (b) A doc with no code: typedoc, the examples and
  the pack rehearsal would have nothing to run on, so none of #43's CI checks could prove anything.
- **Evidence.** #43 body ("accepting the export surface" is maintainer-only; "proposed in a reviewable doc"); AD-14;
  CLAUDE.md Boundaries.

### DP2 — What the candidate holds {#dp2}

- **Decision.** Tiers, each export with its Java `@see`: (1) the AD-14 contract: the ElkGraph types (AD-11) and
  `ElkGraphUtil`, plus the property types a caller needs to set options; (2) the engine: `RecursiveGraphLayoutEngine`,
  `BasicProgressMonitor`, `LayoutMetaDataService`, `CoreOptions`; (3) per in-scope algorithm, its `*MetaDataProvider` and
  `*Options` (the TS port has no `ServiceLoader`, so callers register providers, as `tools/corpus/ts-layout-pipeline.ts:75-94`
  does); (4) I/O adapters: `ElkGraphJson` and, if the executor finds them consumer-facing, the `.elkt`/`.elkj` readers,
  each with its reason. Excluded: `src/java`, `src/guava`, `src/emf`, `src/xtext`, `src/equinox`, `src/gson`, every
  algorithm internal, every test helper. No new function, wrapper or "register all" helper (YAGNI; AD-14 puts idiomatic
  wrappers in a later layer). The candidate imports `src/core/options/CoreOptions.js` first: `CoreOptions` and
  `TopdownSizeApproximator` import each other and `CoreOptions` must be evaluated first
  (`tools/corpus/ts-layout-pipeline.ts:6-7`).
- **Rejected.** Exporting every ported class (freezes thousands of internals); exporting only AD-14's model (a consumer could
  build a graph but not lay it out).
- **Open for the maintainer** (listed in the doc, not decided): whether the text readers and grandom are public; whether
  per-algorithm subpath exports (`@knowvah/elk-engine/layered`) replace one entry; the first version number.

### DP3 — TypeDoc on an isolated TypeScript 6 {#dp3}

- **Decision.** `tools/typedoc/package.json` (private) with its own `package-lock.json`: `typescript` 6.0.3,
  `typedoc` 0.28.20, `typedoc-plugin-markdown` 4.14.1, `typedoc-vitepress-theme` 1.1.4, all exact. `npm run docs:api`
  runs `npm ci --prefix tools/typedoc` then that package's `typedoc` with `tools/typedoc/typedoc.json`, into
  `docs-site/reference/` (gitignored, generated on every `docs:build`, as in dot-engine). TypeDoc errors fail the build;
  warnings are printed and counted in the journal; no source comment is edited to silence one (generated `.melk` comments
  carry Java-side `{@link}` targets).
- **Rejected.** (a) The forward alias AD-6 anticipated (`typescript6` beside `typescript@7`): typedoc's peer is the name
  `typescript`, and `overrides` cannot redirect a peer: `npm install` fails with ERESOLVE (probe). (b) The reverse alias
  (`"typescript": "npm:@typescript/typescript6@6.0.2"`, TS 7 under another name): it works (probe: `tsc` → 7.0.2, typedoc
  sees 6.0.3), but it repoints the root `typescript` that editors and any future tool import, a toolchain change beyond
  docs. (c) Waiting for typedoc TS 7 support: none exists (latest 0.28.20, peer `5.0.x … 6.0.x`).
- **Evidence.** Probe B: typedoc 0.28.20 on TS 6.0.3 over a 12-export sample of the real sources (layered, `CoreOptions`,
  `ElkGraphJson`, `ElkGraphUtil`): 0 errors, 35 link warnings, 2.9 s.
- **AD-6 note.** AD-6 says "adds a TS 6 alias". The isolated package keeps AD-6's intent (TypeScript 7.0.2 is the
  project compiler; TS 6 serves typedoc only). The executor journals this as the reading of AD-6; it does not edit AD-6.

### DP4 — Examples and their expected values {#dp4}

- **Decision.** Examples are files `test/docs/examples/<name>.ts` that import from `@knowvah/elk-engine` (DP1 mapping),
  shown on `docs-site/guide/getting-started.md` through VitePress snippet imports (`<<< @/../test/docs/examples/<name>.ts`).
  Two or three examples: build a graph with `ElkGraphUtil` and lay it out with layered; read ELK JSON, lay out, write ELK
  JSON; optionally one non-layered algorithm. Expected values come from the oracle **before** the test is written (AD-13):
  each example has an input twin in `test/golden/examples-inputs/`, listed in `test/golden/examples.json`, laid out by a
  new set `--set examples` of `tools/oracle/regen-goldens.sh` into `test/golden/refs/elk-examples/` (with `-XX:hashCode=2`
  if a layered example is in it, as H4). `test/docs/examples.test.ts` checks that each example's graph before layout
  equals its twin, and that its output equals the ref at 1e-6 with `test/golden/compare-json.ts`.
- **Rejected.** Extracting fenced code from Markdown at test time (the shown code and the tested code can drift apart, and
  it needs a runtime transpile path); examples that assert only "no throw" (fails `rules/testing.md`); reusing a corpus
  golden as the example input (realistic graphs are too large to read in a getting-started page).

### DP5 — Link check {#dp5}

- **Decision.** `linkinator` 8.1.0 (MIT) as a root devDependency. `npm run docs:linkcheck` runs it over
  `docs-site/.vitepress/dist` with `--recurse --clean-urls --check-fragments`, skipping external URLs, and with extra roots
  for pages no nav links (`/guide/getting-started`, `/reference/`). CI runs it after `docs:build`; it blocks. A scheduled
  workflow `.github/workflows/links.yml` (weekly plus `workflow_dispatch`, never on PRs) checks external links; a failure
  there is a follow-up, not a red PR. The mission runs the external check once locally and journals the result.
- **The site has 138 broken links today** (probe on the planning-time build): on each of the six English-only pages the
  language switcher links to the 23 locale copies, which do not exist (6 × 23). Mechanism:
  `node_modules/vitepress/dist/client/theme-default/composables/langs.js:15`, `useLangs({ correspondingLink: true })`
  appends the current page path to every locale prefix unless `themeConfig.i18nRouting === false`, and the theme has no
  per-page switch. Fix: `i18nRouting: false` in `docs-site/.vitepress/config.ts`; the switcher then goes to each locale's
  home page on every page. The executor confirms the mechanism by rebuilding and rerunning the check (diagnosis mode).
- **Rejected.** lychee (a Rust binary, not installed locally, so the local gate could not run it); a skip pattern for the
  switcher links (hides a real 404); overriding the three VitePress components that call `useLangs` (more theme code, and
  it breaks on VitePress upgrades); per-locale redirect stubs (a switch that changes nothing).
- **Evidence.** Probe: linkinator without `--clean-urls` reports 528 false 404s (`cleanUrls: true` at `config.ts:147`);
  with it, 547 links, 409 OK, 138 broken, all of the switcher pattern above.

### DP6 — English-only pages, outside the pinned nav {#dp6}

- **Decision.** `guide/getting-started.md` and `reference/` join `TRANSLATABLE_EXCLUDES` in both copies
  (`docs-site/.vitepress/i18n.ts:128` and `scripts/docs-i18n-status.mjs:31`; `test/docs/i18n-status.test.ts:224` pins them
  equal). `navFor` and `sidebarFor` are not changed: `test/docs/locale-complete.test.ts:107-119` pins the root nav and
  sidebar exactly and `:91-105` pins the English-only sidebar links (AD-13). The pages are reachable by URL, by site search,
  from `README.md` and from the proposal; both pages carry a "proposed surface, not published" notice. Adding them to the
  nav is part of the surface ruling (DP9), which names those test rows. No existing English page is edited (that would make
  23 translations stale), and no locale module changes.
- **Rejected.** Appending nav items in `config.ts` around `navFor` (passes the pinned test while defeating its intent);
  translating the getting-started page now (its content changes on acceptance; filed as a follow-up instead).

### DP7 — Release configuration, not run {#dp7}

- **Decision.** As dot-engine: `.releaserc.json` (branches `main`, `tagFormat` `v${version}`, the four standard plugins),
  semantic-release and plugins as exact-range devDependencies, scripts `release`, `publish:check`
  (`typecheck && build && npm pack --dry-run`) and `prepublishOnly` (`typecheck && build`), `PUBLISHING.md` (the
  maintainer's first-publish and trusted-publisher runbook). Differences from dot-engine: `release.yml` has
  `on: workflow_dispatch` only, `if: github.ref == 'refs/heads/main'`, and environment `release`; its header comment says
  that switching to `push: main` is the maintainer's step after the first publish. `package.json` gains `homepage` and
  `publishConfig.registry` plus `publishConfig["@knowvah:registry"]`, both `https://registry.npmjs.org/`.
- **Why the registry pins matter.** The repo `.npmrc` maps `@knowvah` to GitHub Packages, and `publishConfig` today holds
  only `access`, so a plain `npm publish` of this package would go to GitHub Packages. dot-engine pins both keys for this
  reason (its `package.json` and `release.yml` comments).
- **Rejected.** `on: push: main` as in dot-engine (merging the queue branch would attempt a release before the npm name
  exists); a `semantic-release --dry-run` against the remote (needs a token and contacts GitHub: that is running it).

### DP8 — Pack rehearsal {#dp8}

- **Decision.** `tools/release/pack-smoke.ts` (run with `tsx`, script `pack:smoke`): `npm pack` into a temp directory,
  check the file list (has `dist/index.js`, `dist/index.d.ts`, `LICENSE`, `README.md`; no `*.test.ts`, no `test/`), install
  the tarball into a fresh temp project with no network and import it. With `--entry test/public-api/candidate-index.ts`
  it bundles the candidate with esbuild the way `build:js` does, into a scratch copy of the package, installs that, lays out
  the first example's input in a clean Node process and compares the output with its ref at 1e-6. CI runs both modes. The
  pure parts (file-list check) have a unit test.
- **Why.** Roadmap row 12's exit asks that the published package "installs and lays out a graph in a clean project"; the
  publish is the maintainer's, the rehearsal is not. It also tests the `CoreOptions` import order inside an esbuild bundle.

### DP9 — Maintainer hand-off {#dp9}

- **Decision.** Two `needs-ruling` issues: (1) accept, amend or reject the surface in `public-api.md`; on acceptance, move
  the candidate into `src/index.ts`, flip the three DP1 mappings, add the two pages to `navFor`/`sidebarFor` (changing the
  pinned rows of `locale-complete.test.ts` named in DP6), update CLAUDE.md's "exports nothing yet"; (2) claim the npm name
  by the first manual publish, choose the first version, configure the trusted publisher, and switch `release.yml` to
  `push: main`. #43 gets a comment with the brief path's results. Nothing is published, no `npm login`, no write to any
  registry.

## Rollback classification

Reversible: nothing is published and no data format changes. Revert the squash commit to restore the tree. The only new
committed data are the `elk-examples` refs (additive, regenerated by script). The first publish, which is irreversible, is
excluded from this mission (DP9).
