<!-- SPDX-License-Identifier: EPL-2.0 -->

# T25 — Translate the docs site into Brazilian Portuguese (`pt-br`, `pt-BR`)

**Commit:** `feat(docs): translate the docs site into brazilian portuguese` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `pt-br`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/pt-br.ts` and `site/pt-br/`, and
`../dot-engine/docs-site/.vitepress/locales/pt-br.ts`, for tone and formality.

## Write-set
`docs-site/pt-br/**`, `docs-site/.vitepress/locales/pt-br.ts`,
`docs-site/.vitepress/locales/goldens/pt-br.json`.

## Acceptance criteria
- Given T25, when `npm test` runs, then translation lint passes for `pt-br`.
- Given T25, when `npm run docs:build` runs, then `dist/pt-br/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `pt-br`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
