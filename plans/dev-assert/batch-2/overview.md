<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: restore the sites, four disjoint lanes

Four tasks with disjoint write-sets, by the **TS file's directory** (D5.6). They run in parallel as subagents
(`typescript-pro`, sonnet) or in sequence in the orchestrator. Planning counts are by the Java file's package; the
inventory's lane (by TS path) is authoritative.

| ID | Description | Agent | Writes (directories) | Sites at planning | Depends On | Done |
| -- | ----------- | ----- | -------------------- | ----------------- | ---------- | ---- |
| [T3](T3-core-common-trees.md) | core, grandom, alg.common, mrtree, force | typescript-pro | `src/core/**`, `src/alg/common/**`, `src/alg/mrtree/**`, `src/alg/force/**` | 17 | T1, T2 | [x] |
| [T4](T4-layered-loops.md) | layered self-loop package | typescript-pro | `src/alg/layered/intermediate/loops/**` | 42 | T1, T2 | [x] |
| [T5](T5-layered-intermediate.md) | layered intermediate processors (all but `loops/`) | typescript-pro | `src/alg/layered/intermediate/*.ts`, `src/alg/layered/intermediate/{wrapping,preserveorder}/**` and any other `intermediate/` subdirectory except `loops/` | 46 | T1, T2 | [x] |
| [T6](T6-layered-phases.md) | layered phases, graph, compound, components, options | typescript-pro | `src/alg/layered/**` outside `intermediate/` | 38 | T1, T2 | [x] |

## Shared rules (every lane; pass this section with the task file)

1. **Read first:** the lane's inventory rows (`plans/dev-assert/inventory.md`), [D1](../decisions.md#d1-lazy-thunks-devassertcheck-detail)
   and [D5](../decisions.md#d5-site-convention), and `src/java/lang/DevAssert.ts`. Import with the relative path the
   file's other `src/java/lang` imports use.
2. **Per site:** read the Java method around the line, write `devAssert(() => <expr>)` (or with a detail thunk) at the
   Java position, remove the omission comment, and set the row's status. The colocated `.test.ts` may be read but not
   changed (AD-13); the one exception is D6 in T4.
3. **Run** the tests of each touched directory with assertions on (`npx vitest run <dir>`). Before returning, also run
   the golden and vector suites that reach the lane (`npx vitest run test/golden src/alg/layered` for layered lanes).
   A firing assertion is not fixed by deleting the site: report the test, the site and the values (D7). The
   orchestrator triages it in T7.
4. **No production effect:** a thunk reads only. Never change TS narrowing, control flow or a non-null assertion.
   Never touch a file outside the lane's directories; report the need instead.
5. **Complexity:** `npm run complexity` clean. A function pushed over a limit by a site gets a helper split in the same
   file or a same-directory sibling, following the file's existing split pattern; report each split.
6. **Return** only: the updated inventory rows (status, final TS line), the splits, any firing assertion with its test
   and values, and any `not-portable` reason. No preamble, no trailing summary. Never commit, never run
   `npm run coverage`, never start a JVM, never write `plans/` or `.agent-notes/`.

## After the batch (orchestrator)

Write the returned rows into `inventory.md`, then commit each lane: `refactor(tN): restore java asserts in <lane>`
(unsigned). Run `npm run typecheck`, `npm run complexity`, `npm run format:check`.
