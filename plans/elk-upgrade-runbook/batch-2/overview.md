<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: scratch clone, scratch Maven repo, oracle at `b715fb10`, net-diff triage

Sets up the scratch space (UP2, UP3), builds the scratch oracle by the runbook's sections 3-5 and 14, and gives T3 and T4
their environment. The orchestrator does everything here because it touches `../elk` worktree metadata.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T2 | [Scratch setup and oracle build](T2-scratch-oracle.md) | orchestrator | `$TMPDIR/elk-upgrade-rehearsal/**`, journal | T1 | [x] |
