<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Translate the docs site into Danish (`da`, `da-DK`)

**Commit:** `feat(docs): translate the docs site into danish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `da`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/da.ts` and `site/da/`, and
`../dot-engine/docs-site/.vitepress/locales/da.ts`, for tone and formality.

## Write-set
`docs-site/da/**`, `docs-site/.vitepress/locales/da.ts`,
`docs-site/.vitepress/locales/goldens/da.json`.

## Acceptance criteria
- Given T12, when `npm test` runs, then translation lint passes for `da`.
- Given T12, when `npm run docs:build` runs, then `dist/da/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `da`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
