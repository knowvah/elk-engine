<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: F6 ingest

Starts when T1's background re-record has finished (its output file exists and the process has exited cleanly) and
batch 3 is done. While waiting, the orchestrator checks liveness every ≤ 60 min (stop 7).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T10](T10-f6-ingest.md) | Install the re-recorded round-trip ref, drop the test-side transport, docs | orchestrator | see task | T1 (re-record), T9 | [x] |

Batch gate: README "Quality gates".
