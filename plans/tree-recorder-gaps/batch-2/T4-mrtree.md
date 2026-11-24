<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: mrtree items M-a to M-d → `mrtree-extra2.json`

## Context

`mrtree.json` and `mrtree-extra.json` reach the multi-level gap arms only through full rows (M-a). They never reach
`EdgeRouter.java:368`'s empty-bend arm through the pipeline (M-b). Their fields do not observe M9 (M-c) or M12 (M-d).
`mrtree-extra.json` is at its 8 MiB cap, so the rows go to a third file (D1). The dump contract stays as it is (D5). T1's
journal rows give the exact gap arms and mutants. Follow the batch 2 common rules ([overview.md](overview.md)).

## Task

1. M-a: for each gap arm T1 listed, add a stops row over the smallest input that reaches it. The full rows of
   `mrtree-extra.json`'s multi-level families are the starting point (reduce them).
2. M-b: a graph with a cycle-inducing edge under `direction=DOWN` (or UNDEFINED, the same `else`) whose bend list is empty at
   `:368`. Start from the `mrtree-units.json` EdgeRouter case that takes the arm, and find the pipeline state that produces it.
3. M-c: two out-of-bound `positionConstraint` nodes of equal value in one level, plus whatever the sort needs to compare them
   in the order that makes `<=` differ.
4. M-d: a compaction where a node's new level index is 0. First settle whether `spacing.nodeNode < 0` reaches
   `RecursiveGraphLayoutEngine` unvalidated (find any caller of `LayoutOptionValidator` on that path). If no ELK JSON input
   reaches it, prove it (outcome 3) or record the closest approach (outcome 4).
5. Add the inputs to `MrTreeVectors.java` as a third plan writing `mrtree-extra2.json` after the other two. Give it its own seeds,
   its own cap constant, and a selector value (e.g. `MRTREE_FILE=extra2`). The first two files must stay identical. Update
   the header (the `mrtree-extra.json` section is the model) and `mrtree-vectors.sh`'s comments.
6. Record (common rules: `cmp` both landed files). Append `'mrtree-extra2.json'` to `REF_FILES` in
   `src/alg/mrtree/MrTreeVectors.test.ts` and update its comment. No other line of that file changes.
7. D4 evidence: for M-a and M-b, scoped coverage of `MrTreeVectors.test.ts -t 'mrtree-extra2'` alone. For M-c and M-d,
   `mutate.sh` against `MrTreeVectors.test.ts` with the extra2 filter (`killed`) and without it over the first two refs
   (`survived`). That second run needs a `-t` filter that selects the first two files' tests only; journal it.

## Write-set

`tools/vectors/MrTreeVectors.java`, `tools/vectors/mrtree-vectors.sh` (comments only), `test/golden/refs/java/mrtree-extra2.json`,
`src/alg/mrtree/MrTreeVectors.test.ts` (`REF_FILES` and its comment), `test/helpers/mrtree-replay-rows.ts` (a path helper only).

## Read-set

[items.md](../items.md) rows M-a to M-d; `tools/vectors/MrTreeVectors.java:1-240` (contract, seeds, caps), `:780-1000` (the extra
plan), `:1690-1717` (`main`); `src/alg/mrtree/MrTreeVectors.test.ts`; `src/alg/mrtree/p4route/EdgeRouterSpecialEdges.ts:430-470`;
`src/alg/mrtree/p2order/NodeOrderer.ts`; `src/alg/mrtree/intermediate/CompactionProcessor.ts:180-215`; `plans/alg-trees/unreached.md`
§ mrtree; journal rows T1 (line 89) and T15 (lines 65-67) of `plans/alg-trees/decision-journal.md`.

## Interface contracts

Output: `mrtree-extra2.json`, the contract of `mrtree.json`. T5 consumes the report table and the row counts.

## Acceptance criteria

- Given the recorder change, when it runs cold twice, then `mrtree.json` and `mrtree-extra.json` are `cmp`-equal to the
  committed files and `mrtree-extra2.json` is `cmp`-equal between the runs.
- Given `REF_FILES` with the new file, when `MrTreeVectors.test.ts` runs, then every row of all three files passes, and
  `FIRST_REF_COUNTS` is unchanged.
- Given M-a or M-b with outcome 1, when the extra2 tests run alone with scoped coverage, then each named arm is taken.
- Given M-c or M-d with outcome 1, when `mutate.sh` applies its mutant, then the extra2 tests report `killed`, the first two
  files' tests report `survived`, and the file is restored.
- Given an item without outcome 1, when the report is written, then it holds the proof or the closest approach.

## Quality bar

`npx vitest run src/alg/mrtree test/helpers/mrtree-*` green; `npm run typecheck`; `npx prettier --check` on the changed TS.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (additive).
