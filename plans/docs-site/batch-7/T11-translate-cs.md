<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Translate the docs site into Czech (`cs`, `cs-CZ`)

**Commit:** `feat(docs): translate the docs site into czech` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `cs`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/cs.ts` and `site/cs/`, and
`../dot-engine/docs-site/.vitepress/locales/cs.ts`, for tone and formality.

## Write-set
`docs-site/cs/**`, `docs-site/.vitepress/locales/cs.ts`,
`docs-site/.vitepress/locales/goldens/cs.json`.

## Acceptance criteria
- Given T11, when `npm test` runs, then translation lint passes for `cs`.
- Given T11, when `npm run docs:build` runs, then `dist/cs/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `cs`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
