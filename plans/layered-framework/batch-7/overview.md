<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Site recorder

One task: record an oracle row for every T9 scenario group (S1–S22, X5) before any test asserts it (AD-13, L4).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T10 | `LayeredSiteVectors` recorder and its vectors, 22 scenario groups ([re-planned brief](T10-site-recorder-x5.md)) | java-architect | tools/vectors/{LayeredSiteVectors.java,layered-site-vectors.sh}, test/golden/refs/java/layered-sites.json | T9 | [x] |

The batch is done when T10's acceptance criteria pass and the README gates are green (run after the JVM finishes).
The original brief ([T10-site-recorder.md](T10-site-recorder.md), 15 scenarios) is kept for the record.
