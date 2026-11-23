<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: three constructive searches

Three independent searches, run as parallel background subagents (README § Execution model). Each owns one group of
[arms.md](../arms.md) and one `tools/arm-search/<group>/` directory, with a 4 h wall-clock budget from its spawn
(D4). They share no class and no write target.

| Task | Arms | Writes | Owner |
| ---- | ---- | ------ | ----- |
| [T2](T2-north-south.md) | 1-6 | `tools/arm-search/north-south/**`, `$TMPDIR/layered-arm-search/north-south/` | subagent (debugger, opus) |
| [T3](T3-model-order.md) | 7-17 | `tools/arm-search/model-order/**`, `$TMPDIR/layered-arm-search/model-order/` | subagent (debugger, opus) |
| [T4](T4-barycenter-forster.md) | 18-25 | `tools/arm-search/barycenter/**`, `$TMPDIR/layered-arm-search/barycenter/` | subagent (debugger, opus) |

Arms that T1 found already taken are dropped from the prompts.

The subagent prompt is the task file, plus [decisions.md](../decisions.md) D1-D4, D7 and D9, [arms.md](../arms.md),
`tools/arm-search/README.md` and `.agent-notes/layered-arm-search-planning.md`. Add the queue rules that bind a
subagent: no `git`, no write outside its two directories, no recorder run against the repository, `nice -n 10`, and an
`uptime` check before any JVM run. End the prompt with "Return only the structured result — no preamble, no trailing
summary."

The orchestrator:

- polls in foreground waits of at most 9 minutes;
- journals each report;
- copies the outcomes into the arms.md outcome column;
- re-runs every claimed oracle hit itself (one probe per arm) before batch 3, so a subagent's claim is never recorded
  unchecked;
- reads every outcome-3 proof against the Java lines it cites.

One commit for the batch (the three `tools/arm-search/<group>/` directories plus arms.md), or one per task if they land
apart. Gate: `npm run typecheck`, `npx prettier --check tools/arm-search`, `npm run complexity` (report read).

Status: [x] T2 · [x] T3 · [x] T4
