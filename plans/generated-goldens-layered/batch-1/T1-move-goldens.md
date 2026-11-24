<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: move the three layered-recorded goldens to the layered set

## Context

Ruling #68 item C, steps 1-4 ([README](../README.md#objective)). Decisions [D1](../decisions.md#d1-the-new-ids) (ids),
[D2](../decisions.md#d2-where-the-layered-set-reads-the-three-inputs) (inputs),
[D3](../decisions.md#d3-the-two-test-files) (tests), [D4](../decisions.md#d4-meta-json-has-no-ids-or-counts) and
[D5](../decisions.md#d5-byte-identity-proven-by-regenerating-both-sets) (proof).

## Read-set

- `test/golden/tree-goldens.test.ts` (122 lines) and `test/golden/layered-hierarchy-goldens.test.ts` (95 lines), whole.
- `test/golden/trees.json:241-262` (the three entries) and `test/golden/layered.json:1-10` (entry form).
- `tools/oracle/regen-goldens.sh:1-60,133-170,189-192`.
- `test/corpus/corpus.ts:40-58` (`GoldenEntry`, `isGoldenEntry`).

## Steps

1. **Red.** Edit both runners per D3 (the layered runner's new test reads the D1 ids, the vendored inputs and the
   refs). Run the two runners and journal the red: the new pin test fails (no entries, no inputs, no refs), and the
   tree test's entry/ref checks still pass on the old files.
2. **Inputs.** `mkdir -p test/golden/inputs/pipeline/generated` and `cp` the three `test/corpus/generated/<alg>-tree-small.json`;
   `cmp` each against its source and against `test/golden/trees-inputs/<alg>-generated.json`. Journal.
3. **Manifests.** Remove the three entries from `trees.json`. Append three to `layered.json`: `id` per D1,
   `path` `generated/<alg>-tree-small.json`, `algorithm` `org.eclipse.elk.layered`, `variant` `default`, no `retarget`,
   and a `note` naming the source corpus input, that the entry was `<alg>-generated` in the trees set until #68, and
   `recorded with -XX:hashCode=2 (H4)`. Leave the `*-generated-retarget` entries and their notes alone.
4. **Refs.** `git mv test/golden/refs/elk-trees/<alg>-generated.json test/golden/refs/elk-layered/<D1 id>.json`, three
   times. No content edit.
5. **Script (D2).** Resolve `generated/` paths to `$ROOT/test/corpus/` in `write_cases` and
   `require_vendored_inputs` for the elk-models sets; header comment says so. `shellcheck tools/oracle/regen-goldens.sh`.
6. **Green.** `npx vitest run test/golden/tree-goldens.test.ts test/golden/layered-hierarchy-goldens.test.ts test/golden/layered-goldens.test.ts`.
   Journal the counts (tree runner: 4 + 37 tests; layered runner: its checks + 27 layouts).
7. **Proof (D5).** `uptime` (wait while above 12), then `nice -n 10 tools/oracle/regen-goldens.sh --set layered` and
   `nice -n 10 tools/oracle/regen-goldens.sh --set trees`. Expect `wrote 27 refs` and `wrote 37 refs`. Then
   `git status --porcelain test/golden/refs/` (only the three `R` lines) and
   `git diff -M --stat <base> -- test/golden/refs/` (three renames at 100%, no other line). Any difference is stop 2.
   Journal both outputs, the oracle build and the D4 result (both `_meta.json` byte-identical).
8. `npm run typecheck`; `npx prettier --check` on the two manifests and two tests.
9. Journal the move as a `fix` row: ruling, old → new ids, proof summary. Commit
   `test(golden): move three layered-recorded tree goldens to the layered set`, footer `Refs: #68`.

## Write-set

`test/golden/trees.json`, `test/golden/layered.json`, the three refs (rename only),
`test/golden/inputs/pipeline/generated/{mrtree,radial,vertiflex}-tree-small.json`, `tools/oracle/regen-goldens.sh`,
`test/golden/tree-goldens.test.ts`, `test/golden/layered-hierarchy-goldens.test.ts`, the journal.

## Interface contracts

Output for T2: the D1 ids, the new counts (layered 27, trees 37: mrtree 14, radial 17, vertiflex 6), and the proof
summary.

## Acceptance criteria

- Given the moved entries, when the layered runner runs, then its 7h checks pass on the 24, the pin test passes on the
  3, and all 27 layouts equal their refs at AD-4.
- Given the trees runner without `RECORDED_WITH_LAYERED`, when it runs, then every one of the 37 refs records the
  algorithm its entry names and equals the TS layout.
- Given both regen runs, when `git status` and `git diff -M --stat <base>` are read over `test/golden/refs/`, then only
  the three renames at 100% appear, and both `_meta.json` are unchanged.
- Given `regen-goldens.sh --set layered`, then the 24 existing cases send the same elk-models files as before and the
  three new ones send `test/corpus/generated/<alg>-tree-small.json`, each first checked against its vendored copy.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (revert the commit).
