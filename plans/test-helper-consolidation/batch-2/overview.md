<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: migrate the call sites, three directory lanes

Needs T1 (helpers exist, [inventory.md](../inventory.md) maps every object to an export or to "kept"). The lanes own
disjoint directories and run as three parallel subagents (`typescript-pro`, sonnet). Each task file plus its inventory
rows is the prompt. A lane edits only the files its inventory rows name, inside its directories.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T5](T5-lane-p3order.md) | `src/alg/layered/p3order/**` | typescript-pro | test files under `p3order/` | T1 | [x] |
| [T6](T6-lane-intermediate.md) | `src/alg/layered/intermediate/**` | typescript-pro | test files under `intermediate/` | T1 | [x] |
| [T7](T7-lane-rest.md) | the rest of `src/alg/layered/**` and `test/corpus/*.test.ts` | typescript-pro | test files under `src/alg/layered/{*.test.ts,p1cycles,p2layers,p4nodes,p5edges,components,issues}`, `test/corpus/` | T1 | [x] |

`src/alg/layered/ElkLayered.test.ts` belongs to T4, not T7. Lane rules: no edit to a helper (report a needed change to
the orchestrator), no edit to an `expect` line, never commit, never run the full suite; run `npx vitest run <own files>`
before and after and report the per-file counts.
