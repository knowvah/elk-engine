<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Translate the docs site into German (worked example)

**Commit:** `feat(docs): translate the docs site into german`

## Context
The first locale. Every later locale copies its conventions, so it is reviewed by the user before
batch 7 (stop condition 4). Follow [translation-spec.md](../translation-spec.md) in full; it is
the agent prompt's core.

## Procedure (orchestrator)
1. Decide the `de` `ui` labels (every `NavLabels` field), `components` strings (every
   `ComponentStrings` field), and the `englishOnly` marker. Cross-check register against
   `~/git/knowvah/dot-atlassian/site/.vitepress/locales/de.ts` and `../dot-engine/docs-site/.vitepress/locales/de.ts`
   (formal *Sie*). Fill the German glossary column in `translation-spec.md` (the only locale that
   edits the table).
2. Dispatch two technical-writer agents in one message — parts a and b from the page split. Each
   prompt = translation-spec.md verbatim + the decided `ui`/`components`/glossary + its write-set +
   the `node scripts/i18n-hash.mjs` usage + "Return only the list of files written and any rule you
   could not satisfy — no preamble, no trailing summary."
3. When both return: write `docs-site/.vitepress/locales/de.ts`, run the gates. A lint failure
   inside one part → re-dispatch that agent once with the failing assertions; a second failure →
   German quarantine = mission stops.
4. Commit (one commit), then **stop for user review**. Report: page list, glossary, wording
   judgment calls, `docs:i18n-status` output, `docs:build` time vs the T1 baseline, the `de`
   search-index size vs English.

## Write-set
`docs-site/de/**` (6 pages), `docs-site/.vitepress/locales/de.ts`,
`docs-site/.vitepress/locales/goldens/de.json`, `plans/docs-site/translation-spec.md` (glossary only).

## Read-set
English sources per the page split; `docs/conformance.md`, `docs/architecture/overview.md`,
`docs/architecture/component-map.md`; `test/corpus/manifest.json`; `docs-site/.vitepress/locales/goldens/en.json`;
dot-atlassian and dot-engine `de` modules for register only.

## Acceptance criteria
- Given T10, when `npm test` runs, then the translation lint passes for `de` with zero violations.
- Given T10, when `npm run docs:build` runs, then it passes and `dist/de/` contains the 6 pages
  plus `showcase/`.
- Given `/de/showcase/`, then the gallery controls show the `de.components` strings and the prose
  names the same strings.
- `npm run docs:i18n-status` reports `de`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers German.
