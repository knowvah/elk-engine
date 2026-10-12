<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — VitePress scaffold

**Agent:** typescript-pro · **Commit:** `feat(docs): scaffold the vitepress site with the knowvah theme`

## Context
elk-engine has no docs site. `../dot-engine/docs-site` is the reference (decisions D1, D2, D11).
The site is served from the domain root of `https://elk-engine.knowvah.com`, so `base` is `'/'`.

## Task
1. Add devDependencies `vitepress@^1.6.4`, `@knowvah/theme@0.3.0`, `@fontsource/jetbrains-mono@^5.3.0`
   (`npm install --save-dev`; `.npmrc` must exist first so the theme resolves from GitHub Packages).
2. Create `.npmrc` with the `@knowvah:registry` scope line and dot-engine's rationale comment
   (no auth in the file).
3. Create `docs-site/.vitepress/config.ts`: `base: '/'`, title `@knowvah/elk-engine`, description
   from `package.json`, `lang: 'en-US'`, `cleanUrls: true`, `search: { provider: 'local' }`,
   `head` icon + `themeConfig.logo` pointing at `/knowvah_logo.svg`, an English `nav` and
   `sidebar` literal for now (T2 replaces them with `navFor`/`sidebarFor`), `themeConfig.socialLinks`
   to the GitHub repo. Keep dot-engine's comment explaining why `base` must be `'/'`.
4. Create `theme/index.ts` (extends the default theme; imports `@knowvah/theme/vitepress`, the two
   JetBrains Mono weights, `./custom.css`; no components yet) and `theme/custom.css` (copy
   dot-engine's and drop DOT-specific rules).
5. Create `docs-site/copy-brand-assets.mjs` (copy of dot-engine's) and `docs-site/index.md` with a
   `layout: home` hero (name `@knowvah/elk-engine`, text/tagline from README.md, actions:
   Overview `/guide/overview`, GitHub). T3 rewrites the page; keep it minimal.
6. `package.json` scripts: `docs:brand`, `docs:dev` (`npm run docs:brand && vitepress dev docs-site`),
   `docs:build` (`npm run docs:brand && vitepress build docs-site`), `docs:preview`. Later tasks
   extend the chains.
7. `.gitignore`: `docs-site/.vitepress/cache/`, `docs-site/.vitepress/dist/`,
   `docs-site/public/knowvah_logo.svg`. `.prettierignore`: `docs-site/.vitepress/cache/`,
   `docs-site/.vitepress/dist/`, `docs-site/public/`.
8. Record the baseline in the journal: `time npm run docs:build` wall-clock and the byte size of
   `docs-site/.vitepress/dist/assets/@localSearchIndexroot*.js`.

## Write-set
`package.json`, `package-lock.json`, `.npmrc`, `.gitignore`, `.prettierignore`,
`docs-site/.vitepress/config.ts`, `docs-site/.vitepress/theme/index.ts`,
`docs-site/.vitepress/theme/custom.css`, `docs-site/copy-brand-assets.mjs`, `docs-site/index.md`.

## Read-set
- `../decisions.md#toolchain`, `#ci`
- `../dot-engine/.npmrc` (all), `../dot-engine/docs-site/.vitepress/config.ts:1-60, 70-140`
  (skip the DOT markdown plugin and vite alias blocks), `theme/index.ts`, `theme/custom.css`,
  `copy-brand-assets.mjs`, `../dot-engine/package.json:70-90` (scripts)
- `README.md` (hero text), `package.json` (description)

## Interface contract (consumed by T2–T8)
Script names above; `docs-site/public/` is the static root; `theme/index.ts` is the single place
components get registered (T5 and T7 edit it later).

## Acceptance criteria
- Given `npm ci` with `.npmrc`, when run, then `@knowvah/theme@0.3.0` is in `node_modules`.
- Given `npm run docs:build`, when run, then exit 0, `dist/index.html` exists, and the HTML
  references the theme's CSS variables (grep `--vp-c-brand` in `dist/assets/*.css`).
- Given `config.ts`, then `base === '/'` and `search.provider === 'local'`.
- Given the journal, then the build-time and index-size baseline row exists.

## Quality bar
README gates. SPDX line 1 in every new file. `npm run format:check` clean (Prettier formats
`.ts`, `.mjs`, `.md`, `.css`).

## Observability
N/A — the baseline row is the only measurement.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/` or `test/` files. No locales, no components beyond the theme. Do not add TypeDoc.
