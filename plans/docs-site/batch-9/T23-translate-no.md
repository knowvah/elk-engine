<!-- SPDX-License-Identifier: EPL-2.0 -->

# T23 — Translate the docs site into Norwegian (`no`, `no-NO`)

**Commit:** `feat(docs): translate the docs site into norwegian` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `no`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/no.ts` and `site/no/`, and
`../dot-engine/docs-site/.vitepress/locales/no.ts`, for tone and formality.

## Write-set
`docs-site/no/**`, `docs-site/.vitepress/locales/no.ts`,
`docs-site/.vitepress/locales/goldens/no.json`.

## Acceptance criteria
- Given T23, when `npm test` runs, then translation lint passes for `no`.
- Given T23, when `npm run docs:build` runs, then `dist/no/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `no`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
