<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 11 — zh-cn, zh-tw

2 locales, dispatched together: 4 concurrent technical-writer agents (parts a/b per locale,
one message). The orchestrator then registers and commits each locale separately, in table order.
Write-sets are disjoint across locales. Requires the user's approval of German (batch 6).

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T31](T31-translate-zh-cn.md) | Simplified Chinese | 2 technical-writer + orchestrator | `docs-site/zh-cn/**`, `docs-site/.vitepress/locales/zh-cn.ts`, `docs-site/.vitepress/locales/goldens/zh-cn.json` | T10 | [ ] |
| [T32](T32-translate-zh-tw.md) | Traditional Chinese | 2 technical-writer + orchestrator | `docs-site/zh-tw/**`, `docs-site/.vitepress/locales/zh-tw.ts`, `docs-site/.vitepress/locales/goldens/zh-tw.json` | T10 | [ ] |

Batch done when every locale is committed or quarantined (journaled), and `npm run docs:build`
passes with all committed locales registered. Record build time vs the T1 baseline and each
locale's search-index size in the journal (stop condition 8).
