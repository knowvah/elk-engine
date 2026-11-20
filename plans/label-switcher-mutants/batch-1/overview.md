<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: mutant baseline and the layer-size check

One task. At the end, `mutants.md` has a `baseline` result for every M, the D6 layer-size fact is shown on the
oracle (or refuted), and each surviving mutant has a confirmed hint for T2.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-mutant-baseline.md) | Scratch mutation run of M1-M18 against the kill suite; oracle probe of layer sizes; classify the survivors | orchestrator | `plans/label-switcher-mutants/{mutants,decision-journal}.md`; scratch only under `$TMPDIR` | — | [x] |

Gate: the kill suite is green on the unmutated scratch copy and on the worktree. `git status --short` shows only
`plans/label-switcher-mutants/`.
