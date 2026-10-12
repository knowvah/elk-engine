<!-- SPDX-License-Identifier: EPL-2.0 -->

# T29 — Translate the docs site into Swedish (`sv`, `sv-SE`)

**Commit:** `feat(docs): translate the docs site into swedish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `sv`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/sv.ts` and `site/sv/`, and
`../dot-engine/docs-site/.vitepress/locales/sv.ts`, for tone and formality.

## Write-set
`docs-site/sv/**`, `docs-site/.vitepress/locales/sv.ts`,
`docs-site/.vitepress/locales/goldens/sv.json`.

## Acceptance criteria
- Given T29, when `npm test` runs, then translation lint passes for `sv`.
- Given T29, when `npm run docs:build` runs, then `dist/sv/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `sv`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
