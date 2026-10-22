<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: docs and follow-ups closure

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T5](T5-docs.md) | Runbook + cache, F7 notes removed, C4/F7 closed | documentation-engineer | `docs/architecture/{elk-json-text,elk-text}.md`, `docs/conformance.md`, `docs/translation-rules.md`, `plans/graph-json-text/follow-ups.md` | T1, T4 | [x] |

Batch gate: `npm run format:check`, `npm run docs:build`; T5 touches no `src/`, `test/` or `tools/` file, so the code
and vector gates carry over (journal that).
