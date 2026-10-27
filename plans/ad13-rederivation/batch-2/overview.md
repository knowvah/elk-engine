<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Targeted oracle recorder

One task. It records every flagged scenario and every T1 scenario from the oracle **before** any TS consumer exists
(AD-13). T3a and T3b are its only consumers.

| ID  | Description                                      | Agent          | Writes                                                                                                                 | Depends On | Done |
| --- | ------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- | ---- |
| T2  | `NodespacingSiteVectors` recorder and its vectors | java-architect | tools/vectors/{NodespacingSiteVectors.java,nodespacing-site-vectors.sh}, test/golden/refs/java/nodespacing-sites.json | T1         | [x]  |

The batch is done when T2's acceptance criteria pass and the README gates are green. The orchestrator's coverage gate
runs after the recording is finished, never concurrently with the JVM.
