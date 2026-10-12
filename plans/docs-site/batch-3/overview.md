<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Showcase + reports

Two parallel tasks. T5 owns `package.json`, `.gitignore`, and `theme/index.ts` for this batch and
pre-registers the `docs:copy-reports` script and ignore line that T6's script needs, so T6 writes
only its own files.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T5](T5-showcase.md) | `copy-goldens.mjs`, `GoldenGallery.vue`, English golden descriptions, component registration | typescript-pro | `docs-site/copy-goldens.mjs`, `docs-site/.vitepress/theme/{GoldenGallery.vue,index.ts}`, `docs-site/.vitepress/locales/goldens/en.json`, `.gitignore`, `package.json`, `test/docs/goldens-i18n.test.ts` | T2, T4 | [ ] |
| [T6](T6-reports.md) | `copy-reports.mjs`: parity report into the site | typescript-pro | `docs-site/copy-reports.mjs`, `test/docs/copy-reports.test.ts` | T2, T3 | [ ] |

Batch done when both tasks' criteria pass, `npm run docs:build` emits `showcase/` and `parity`
pages, and the README gates are green.
