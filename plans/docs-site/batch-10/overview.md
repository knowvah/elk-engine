<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 10 — ro, ru, sk, sv, tr

5 locales, dispatched together: 10 concurrent technical-writer agents (parts a/b per locale,
one message). The orchestrator then registers and commits each locale separately, in table order.
Write-sets are disjoint across locales. Requires the user's approval of German (batch 6).

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T26](T26-translate-ro.md) | Romanian | 2 technical-writer + orchestrator | `docs-site/ro/**`, `docs-site/.vitepress/locales/ro.ts`, `docs-site/.vitepress/locales/goldens/ro.json` | T10 | [x] |
| [T27](T27-translate-ru.md) | Russian | 2 technical-writer + orchestrator | `docs-site/ru/**`, `docs-site/.vitepress/locales/ru.ts`, `docs-site/.vitepress/locales/goldens/ru.json` | T10 | [x] |
| [T28](T28-translate-sk.md) | Slovak | 2 technical-writer + orchestrator | `docs-site/sk/**`, `docs-site/.vitepress/locales/sk.ts`, `docs-site/.vitepress/locales/goldens/sk.json` | T10 | [x] |
| [T29](T29-translate-sv.md) | Swedish | 2 technical-writer + orchestrator | `docs-site/sv/**`, `docs-site/.vitepress/locales/sv.ts`, `docs-site/.vitepress/locales/goldens/sv.json` | T10 | [x] |
| [T30](T30-translate-tr.md) | Turkish | 2 technical-writer + orchestrator | `docs-site/tr/**`, `docs-site/.vitepress/locales/tr.ts`, `docs-site/.vitepress/locales/goldens/tr.json` | T10 | [x] |

Batch done when every locale is committed or quarantined (journaled), and `npm run docs:build`
passes with all committed locales registered. Record build time vs the T1 baseline and each
locale's search-index size in the journal (stop condition 8).
