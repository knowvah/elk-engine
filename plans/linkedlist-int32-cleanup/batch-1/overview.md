<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: LinkedList audit and doc; Int32 crossing sums

Two independent tasks with disjoint write-sets; they may run in parallel. At the end, `audit.md` and `int32-sites.md`
exist with every row decided, `LinkedList.ts`'s header is correct, and the crossing-count accumulators wrap as Java's
`int` does. No test result and no ref changes, except new tests.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-linkedlist-audit.md) | Audit `LinkedList` equality callers (D1, D2); correct the header; fix any `differs` caller (D3) | orchestrator or `typescript-pro` | `src/java/util/LinkedList.ts`, `src/java/util/LinkedList.test.ts` (only if a doc-pinning test is useful), the file and colocated test of each `differs` caller; `plans/linkedlist-int32-cleanup/audit.md` (orchestrator) | — | [x] |
| [T2](T2-int32-sums.md) | Route Java `int` count accumulators through `Int32` (D4) with wrap tests (D5) | orchestrator or `typescript-pro` | `src/alg/layered/intermediate/greedyswitch/*.ts`, `src/alg/layered/p3order/*.ts`, `src/alg/layered/p3order/counting/*.ts` (sources and colocated tests); `plans/linkedlist-int32-cleanup/int32-sites.md` (orchestrator) | — | [x] |

**Write-set conflict rule.** If T1 finds a `differs` caller inside one of T2's three directories, T1 records the row
and its diagnosis but applies the fix only after T2 is committed (one more T1 commit). Each task is one commit.

Gate after the batch: `env <nine *_SWEEP_DIR=/nonexistent> npx vitest run` green (planning baseline in the journal),
`npm run typecheck`, `npm run complexity`, `git diff --exit-code <base> -- test/golden/refs/` empty.
