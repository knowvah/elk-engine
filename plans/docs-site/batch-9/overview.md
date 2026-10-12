<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — ko, nl, no, pl, pt-br

5 locales, dispatched together: 10 concurrent technical-writer agents (parts a/b per locale,
one message). The orchestrator then registers and commits each locale separately, in table order.
Write-sets are disjoint across locales. Requires the user's approval of German (batch 6).

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T21](T21-translate-ko.md) | Korean | 2 technical-writer + orchestrator | `docs-site/ko/**`, `docs-site/.vitepress/locales/ko.ts`, `docs-site/.vitepress/locales/goldens/ko.json` | T10 | [x] |
| [T22](T22-translate-nl.md) | Dutch | 2 technical-writer + orchestrator | `docs-site/nl/**`, `docs-site/.vitepress/locales/nl.ts`, `docs-site/.vitepress/locales/goldens/nl.json` | T10 | [x] |
| [T23](T23-translate-no.md) | Norwegian | 2 technical-writer + orchestrator | `docs-site/no/**`, `docs-site/.vitepress/locales/no.ts`, `docs-site/.vitepress/locales/goldens/no.json` | T10 | [x] |
| [T24](T24-translate-pl.md) | Polish | 2 technical-writer + orchestrator | `docs-site/pl/**`, `docs-site/.vitepress/locales/pl.ts`, `docs-site/.vitepress/locales/goldens/pl.json` | T10 | [x] |
| [T25](T25-translate-pt-br.md) | Brazilian Portuguese | 2 technical-writer + orchestrator | `docs-site/pt-br/**`, `docs-site/.vitepress/locales/pt-br.ts`, `docs-site/.vitepress/locales/goldens/pt-br.json` | T10 | [x] |

Batch done when every locale is committed or quarantined (journaled), and `npm run docs:build`
passes with all committed locales registered. Record build time vs the T1 baseline and each
locale's search-index size in the journal (stop condition 8).
