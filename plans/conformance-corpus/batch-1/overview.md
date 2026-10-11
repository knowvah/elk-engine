<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Scope + oracle input

Records the scope amendment (D0) in docs and code, and teaches the oracle to read `.elkt` and
to run id-keyed case files. All three tasks are independent.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Scope docs + roadmap revision | documentation-engineer | CLAUDE.md, docs/architecture/inventory.md, docs/architecture/port-map.md, plans/roadmap.md | — | [ ] |
| T2 | Bundle scope in code + fitness | typescript-pro | tools/bundle-deps.ts, test/architecture/bundle-deps.json, test/architecture/module-boundaries.fitness.test.ts | — | [ ] |
| T3 | Oracle `.elkt` input, parse-only, case-file mode | java-architect | tools/oracle/harness/ElkOracle.java (+ new harness/*.java), tools/oracle/run.sh, tools/oracle/build.sh, tools/oracle/README.md | — | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
