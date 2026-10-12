<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — cs, da, es, et, fi

5 locales, dispatched together: 10 concurrent technical-writer agents (parts a/b per locale,
one message). The orchestrator then registers and commits each locale separately, in table order.
Write-sets are disjoint across locales. Requires the user's approval of German (batch 6).

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T11](T11-translate-cs.md) | Czech | 2 technical-writer + orchestrator | `docs-site/cs/**`, `docs-site/.vitepress/locales/cs.ts`, `docs-site/.vitepress/locales/goldens/cs.json` | T10 | [ ] |
| [T12](T12-translate-da.md) | Danish | 2 technical-writer + orchestrator | `docs-site/da/**`, `docs-site/.vitepress/locales/da.ts`, `docs-site/.vitepress/locales/goldens/da.json` | T10 | [ ] |
| [T13](T13-translate-es.md) | Spanish | 2 technical-writer + orchestrator | `docs-site/es/**`, `docs-site/.vitepress/locales/es.ts`, `docs-site/.vitepress/locales/goldens/es.json` | T10 | [ ] |
| [T14](T14-translate-et.md) | Estonian | 2 technical-writer + orchestrator | `docs-site/et/**`, `docs-site/.vitepress/locales/et.ts`, `docs-site/.vitepress/locales/goldens/et.json` | T10 | [ ] |
| [T15](T15-translate-fi.md) | Finnish | 2 technical-writer + orchestrator | `docs-site/fi/**`, `docs-site/.vitepress/locales/fi.ts`, `docs-site/.vitepress/locales/goldens/fi.json` | T10 | [ ] |

Batch done when every locale is committed or quarantined (journaled), and `npm run docs:build`
passes with all committed locales registered. Record build time vs the T1 baseline and each
locale's search-index size in the journal (stop condition 8).
