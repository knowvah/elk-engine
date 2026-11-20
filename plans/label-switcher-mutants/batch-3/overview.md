<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: anchored cases and the mutation rerun

One task. At the end, each new row has anchored cases (D5), and the mutation rerun shows every M as `killed` or
`equivalent` with a proof.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T3](T3-anchored-and-rerun.md) | Anchored cases per new row in `LabelDummySwitcherSites.test.ts`; scratch mutation rerun; verdicts | orchestrator, or `test-automator`/`typescript-pro` (sonnet) for the cases | `src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts`; plan files (orchestrator) | T2 | [x] |

Gate: the kill suite is green on the worktree; `mutants.md` has no `survived` or empty `verdict`.
