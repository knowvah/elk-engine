<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Drift tracking + workflows

Two parallel tasks with disjoint write-sets.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T7](T7-drift-tracking.md) | `sourceHash`, stale banner, `docs:i18n-status` | typescript-pro | `scripts/{i18n-hash,docs-i18n-status}.mjs`, `docs-site/.vitepress/theme/{StaleBanner.vue,index.ts}`, `package.json`, `test/docs/i18n-status.test.ts` | T5 | [x] |
| [T8](T8-workflows.md) | CI docs gate, Pages deploy workflow, repo docs | devops-engineer | `.github/workflows/{ci.yml,docs.yml}`, `README.md`, `CONTRIBUTING.md`, `docs-site/.vitepress/README.md` | T1 | [x] |

Batch done when both tasks' criteria pass and the README gates are green.
