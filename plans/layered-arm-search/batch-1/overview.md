<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: baseline measurement and the search harness

One task, run by the orchestrator. It fixes which of the 25 arms are still untaken under today's refs, and it builds the
tools that the three searches of batch 2 share.

| Task | Writes | Owner |
| ---- | ------ | ----- |
| [T1](T1-baseline-and-harness.md) | `tools/arm-search/README.md`, `tools/arm-search/instrument.sh`, `tools/arm-search/coverage.sh`, [arms.md](../arms.md) (line check) | orchestrator |

One commit. Gate: `npm run typecheck`, `npx prettier --check <changed files>`, `bash -n` and a dry run of both scripts.

Status: [x] T1
