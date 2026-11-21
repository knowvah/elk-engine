<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: fitness test red, carry the bundles, JVM baseline

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-carry-bundles.md) | `tools/oracle/java-tests.sh`; `test/architecture/java-tests-bundles.fitness.test.ts`; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`fix(T1): carry every ported test bundle in java-tests.sh` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
