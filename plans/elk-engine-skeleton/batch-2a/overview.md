<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2a — Repo guardrails and docs root

Runs in parallel with Batch 2b after Batch 1. All four tasks are
independent (disjoint write-sets).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T2 | LICENSE, NOTICE, README, CI workflow | documentation-engineer | LICENSE, NOTICE.md, README.md, .github/workflows/ci.yml | T1 | [ ] |
| T3 | CLAUDE.md port rules | documentation-engineer | CLAUDE.md | T1 | [ ] |
| T4 | SPDX / browser-safe / module-globals fitness tests | test-automator | test/architecture/{spdx-header,no-node-builtins,module-globals}.fitness.test.ts | T1 | [ ] |
| T5 | Bundle-dependency fitness test | typescript-pro | tools/bundle-deps.ts, test/architecture/bundle-deps.json, test/architecture/module-boundaries.fitness.test.ts | T1 | [ ] |

Note: T4's SPDX test scans files created by parallel tasks; every task
already must add SPDX headers, so ordering does not matter. Re-run
`npm test` after the batch merges.
