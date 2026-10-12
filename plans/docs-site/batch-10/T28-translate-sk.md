<!-- SPDX-License-Identifier: EPL-2.0 -->

# T28 — Translate the docs site into Slovak (`sk`, `sk-SK`)

**Commit:** `feat(docs): translate the docs site into slovak` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `sk`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/sk.ts` and `site/sk/`, and
`../dot-engine/docs-site/.vitepress/locales/sk.ts`, for tone and formality.

## Write-set
`docs-site/sk/**`, `docs-site/.vitepress/locales/sk.ts`,
`docs-site/.vitepress/locales/goldens/sk.json`.

## Acceptance criteria
- Given T28, when `npm test` runs, then translation lint passes for `sk`.
- Given T28, when `npm run docs:build` runs, then `dist/sk/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `sk`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
