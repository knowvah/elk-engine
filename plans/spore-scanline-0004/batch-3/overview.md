<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: sweep evidence, docs, close-out

T4 and T5 have disjoint write-sets and may run in parallel (T4 is the orchestrator's JVM work; T5 may be a subagent).
T6 runs after both.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T4](T4-sweep-evidence.md) | `sporeOverlap` oracle sweep to scratch + TS comparison; journal verdicts | orchestrator | journal only | T3 | [x] |
| [T5](T5-docs.md) | `docs/conformance.md`: four patches, carried-upstream entry, refs moved | orchestrator or `documentation-engineer` (sonnet) | `docs/conformance.md` (+ any tracked doc with patch-count prose) | T2, T3 | [x] |
| [T6](T6-close-out.md) | Queue gates 1-7, roadmap revision, agent notes, PR recheck, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/spore-scanline-0004.md`, journal | T4, T5 | [x] |
