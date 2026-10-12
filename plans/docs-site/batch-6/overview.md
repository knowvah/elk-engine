<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — German, the worked example

One locale, two concurrent technical-writer agents (parts a/b), then the orchestrator registers
and commits. **Ends with a mandatory stop for user review** (README stop condition 4); batch 7
does not start until the user approves German or requests changes.

| ID | Language | Agents | Writes | Depends On | Done |
|----|----------|--------|--------|------------|------|
| [T10](T10-translate-de.md) | German | 2 technical-writer + orchestrator | `docs-site/de/**`, `docs-site/.vitepress/locales/de.ts`, `docs-site/.vitepress/locales/goldens/de.json`, `plans/docs-site/translation-spec.md` (glossary column) | T1–T9 | [ ] |
