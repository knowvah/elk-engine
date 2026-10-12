<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — VitePress scaffold

One task. At the end, `npm run docs:build` produces a branded English site with a placeholder home
page, and the build-time and search-index baselines are in the journal.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-scaffold.md) | VitePress + theme + brand assets; `docs:*` scripts; Packages auth | typescript-pro | `package.json`, `package-lock.json`, `.npmrc`, `.gitignore`, `.prettierignore`, `docs-site/.vitepress/{config.ts,theme/index.ts,theme/custom.css}`, `docs-site/copy-brand-assets.mjs`, `docs-site/index.md` | — | [ ] |

Batch done when T1's acceptance criteria pass and the README gates are green.
