<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — fr, hu, is, it, ja

5 locales, dispatched together: 10 concurrent technical-writer agents (parts a/b per locale,
one message). The orchestrator then registers and commits each locale separately, in table order.
Write-sets are disjoint across locales. Requires the user's approval of German (batch 6).

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T16](T16-translate-fr.md) | French | 2 technical-writer + orchestrator | `docs-site/fr/**`, `docs-site/.vitepress/locales/fr.ts`, `docs-site/.vitepress/locales/goldens/fr.json` | T10 | [x] |
| [T17](T17-translate-hu.md) | Hungarian | 2 technical-writer + orchestrator | `docs-site/hu/**`, `docs-site/.vitepress/locales/hu.ts`, `docs-site/.vitepress/locales/goldens/hu.json` | T10 | [x] |
| [T18](T18-translate-is.md) | Icelandic | 2 technical-writer + orchestrator | `docs-site/is/**`, `docs-site/.vitepress/locales/is.ts`, `docs-site/.vitepress/locales/goldens/is.json` | T10 | [x] |
| [T19](T19-translate-it.md) | Italian | 2 technical-writer + orchestrator | `docs-site/it/**`, `docs-site/.vitepress/locales/it.ts`, `docs-site/.vitepress/locales/goldens/it.json` | T10 | [x] |
| [T20](T20-translate-ja.md) | Japanese | 2 technical-writer + orchestrator | `docs-site/ja/**`, `docs-site/.vitepress/locales/ja.ts`, `docs-site/.vitepress/locales/goldens/ja.json` | T10 | [x] |

Batch done when every locale is committed or quarantined (journaled), and `npm run docs:build`
passes with all committed locales registered. Record build time vs the T1 baseline and each
locale's search-index size in the journal (stop condition 8).
