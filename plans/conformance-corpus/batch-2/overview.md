<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Census + oracle retarget

Classifies the corpus using T3's parse mode, and extends the oracle with retargeting,
variants, timeouts, and exception details. T4 and T5 write disjoint files.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T4 | Corpus census | typescript-pro | tools/corpus/census.ts, test/corpus/census.test.ts, test/corpus/census.json | T3 | [ ] |
| T5 | Oracle retarget, variants, timeout, throw details | java-architect | tools/oracle/harness/ElkOracle.java (+ harness/*.java), tools/oracle/run.sh, tools/oracle/README.md, test/corpus/variants.json | T3 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
