<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Generated corpus + manifest schema

Adds the grandom generate mode and the seeded graphs for the 7 algorithms with no elk-models
coverage (D7), and lets curated goldens name their algorithm and variant. Disjoint writes.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | Oracle generate mode + generated corpus | java-architect | tools/oracle/harness/ElkOracle.java (+ harness/*.java), tools/oracle/run.sh, tools/oracle/regen-generated.sh, tools/oracle/README.md, test/corpus/generated/**, test/corpus/generated.test.ts | T5 | [x] |
| T7 | Manifest schema: algorithm, variant, retarget | typescript-pro | test/corpus/manifest.json, test/corpus/corpus.ts, test/corpus/corpus.test.ts, tools/oracle/regen-goldens.sh | T5 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
