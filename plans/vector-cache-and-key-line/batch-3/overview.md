<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: C4 proof (cold, warm, evicted rows)

One orchestrator task with three JVM runs; the cold run takes hours, so launch it detached and journal the command,
start time and pid. No agent; no code change.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T4](T4-cache-proof.md) | Cold `elkj-vectors.sh` (fills the cache), warm rerun, then two evicted rows; all `cmp`-identical to the refs | orchestrator | `plans/vector-cache-and-key-line/decision-journal.md` | T3 | [ ] |

Batch gate: README "Quality gates" (no `src/` change since batch 2, so typecheck, complexity and coverage carry over;
journal that).
