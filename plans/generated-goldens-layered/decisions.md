<!-- SPDX-License-Identifier: EPL-2.0 -->

# generated-goldens-layered: decisions

| ID | Decision |
| -- | -------- |
| [D1](#d1-the-new-ids) | Ids `generated-<alg>-tree-small--default` |
| [D2](#d2-where-the-layered-set-reads-the-three-inputs) | Inputs vendored under `inputs/pipeline/generated/`; the regen script resolves `generated/` paths to `test/corpus/` |
| [D3](#d3-the-two-test-files) | Tree test loses `RECORDED_WITH_LAYERED`; layered runner keeps its 7h grid checks on the 24 and pins the 3 |
| [D4](#d4-meta-json-has-no-ids-or-counts) | Neither `_meta.json` changes: they hold no ids or counts |
| [D5](#d5-byte-identity-proven-by-regenerating-both-sets) | Byte identity proven by `git mv` plus a regen of both sets |
| [D6](#d6-docs-scope) | Docs: current-state counts, mislabel notes out, the 0.01 px bar on `sloppy_overlaps_2` citing #74 |

## D1: the new ids

- **Context.** The layered set's ids are `<model slug>--<variant>` (`ptolemy-scrambler--direction-right`). The ruling
  suggests `generated-mrtree-tree-small--default` and leaves the final ids to the planner.
- **Decision.** `generated-mrtree-tree-small--default`, `generated-radial-tree-small--default`,
  `generated-vertiflex-tree-small--default`. They name the corpus file (`test/corpus/generated/<alg>-tree-small.json`),
  not the algorithm the ref used, which is the point of the move.
- **Mapping.** `mrtree-generated` → `generated-mrtree-tree-small--default`; `radial-generated` →
  `generated-radial-tree-small--default`; `vertiflex-generated` → `generated-vertiflex-tree-small--default`.
- **Rejected.** `layered-<alg>-generated`: names an algorithm in the slug where the set's other ids name a model.

## D2: where the layered set reads the three inputs

- **Context.** The layered runner reads inputs from `test/golden/inputs/pipeline/` (`layered-hierarchy-goldens.test.ts:20`).
  `regen-goldens.sh --set layered` sends the oracle the elk-models file (`INPUTS_DIR` empty, so
  `write_cases "$MODELS_DIR"`, `:191`) and first checks each vendored copy equals it (`require_vendored_inputs`,
  `:163-170`). The three inputs are repo files, not in elk-models. The oracle uses the input path only for its extension
  (`tools/oracle/harness/ElkModelReader.java:41-46`), so the file's location cannot change the output.
- **Decision.** Manifest `path` is `generated/<alg>-tree-small.json`. T1 copies each
  `test/corpus/generated/<alg>-tree-small.json` byte for byte to `test/golden/inputs/pipeline/generated/`. In
  `regen-goldens.sh`, for sets that read elk-models, a manifest path beginning `generated/` resolves to
  `$ROOT/test/corpus/<path>` both in `write_cases` (the case input) and in `require_vendored_inputs` (the comparison
  source). Every other path is resolved as today, so the 24 existing cases send the same files. The header comment says
  so. `test/golden/trees-inputs/*-generated.json` stay for the retarget entries.
- **Rejected.** (a) The runner reads `generated/` paths from `test/corpus/` directly: two input roots in one runner, and
  the golden input would follow any regeneration of the generated corpus without the regen script's check. (b) A
  per-entry input-directory field: changes `GoldenEntry` (`test/corpus/corpus.ts:48-58`), shared by every set. (c)
  Sending the vendored file for all layered cases: changes what the 24 existing cases send, for no gain.

## D3: the two test files

- **Tree test.** Delete `RECORDED_WITH_LAYERED`, `LAYERED_RESOLVED` and the doc comment above them. The test
  `the refs record the algorithm their entry names, except the classified generated ones` becomes `the refs record the
  algorithm their entry names`, keeping its `others` assertion over every entry. Keep `registerLayered()` in
  `beforeAll` (the export's shortest-unique-suffix naming needs it, as its comment says); drop the comment's sentence
  about the generated goldens running layered.
- **Layered runner.** The ruling makes the set 27 entries. To change no frozen number, the 7h checks
  (`has 24 entries…`, `covers every model x variant cell once`) apply to the 24 entries whose path does not begin
  `generated/`, with `ENTRY_COUNT`, `MODEL_COUNT` and `VARIANTS` unchanged. A new test pins the generated subset: ids
  equal the D1 list in order, variant `default`, no `retarget`, each vendored input byte-equal to its
  `test/corpus/generated/` source, and each ref's root `layoutOptions.resolvedAlgorithm` is
  `Layout Algorithm: org.eclipse.elk.layered`. The unique-id check covers all 27. `it.each` lays out all 27. The header
  comment says 27 (24 from 7h, 3 moved by #68).
- **AD-13.** No expected value changes: the moved refs are byte-identical, and the 7h numbers stay. The structural edit
  is the ruling's step 3 ("the layered golden runner must pick the three up"). Journal it as such.
- **Rejected.** Raising `ENTRY_COUNT` to 27: edits a frozen number where scoping keeps it.

## D4: `_meta.json` has no ids or counts

- **Context.** The ruling says to update both `_meta.json` "(ids, counts) by the same script that maintains them". Both
  files hold `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` and `jvmFlags` only (`write_meta`,
  `regen-goldens.sh:172-187`), with equal values in the two sets.
- **Decision.** Neither file is edited by hand. D5's regen writes both by script; they must come out byte-identical.
  Journal that the ruling's `_meta.json` step is satisfied with no change, with this evidence.

## D5: byte identity proven by regenerating both sets

- **Decision.** After the `git mv` and the manifest edits (refs committed in T1's working tree), at load ≤ 12 under
  `nice -n 10`: `tools/oracle/regen-goldens.sh --set layered`, then `--set trees`. Then
  `git status --porcelain test/golden/refs/` must list only the T1 renames (no modification), and
  `git diff -M --stat <base> -- test/golden/refs/` must show three renames at 100% and nothing else. Journal the output,
  the oracle build, and that no patch id changed. This is also gate 7 for both sets.
- **Why it should hold.** `-XX:hashCode=2` is set for both sets; the input path does not reach the output (D2); the
  oracle build is the one that recorded both sets.
- **Rejected.** `git mv` alone: proves the rename, not that the layered set's script reproduces the three refs.

## D6: docs scope

- `docs/conformance.md`: the tree goldens paragraph (`:353-358`): 37 refs, and the generated inputs' layered goldens now
  live in the layered set. The 7h goldens bullet (`:1681-1685`) is mission history: keep it, adding one clause that the
  set holds 27 since #68. The 8a goldens bullet (`:1875-1877`): 37 refs (34 from T4 and the 3 retarget entries), and
  that the three layered-recorded ones moved by #68. The `sloppy_overlaps_2` known divergence (`:1980-1983`; the ruling's
  "around line 1708" is stale): add the maintainer's bar (positional effect ≤ 0.01 px; here ≤ 1e-13) citing #68 item B
  and #74. The next bullet (`:1984-1987`): the seven cases are `ok` since row 9 (#40), and the mislabel clause goes.
- `docs/architecture/alg-trees.md:152-160`: 37 refs, 34 from T4 (mrtree 13, radial 16, vertiflex 5) plus the 3 retarget
  entries; replace the `RECORDED_WITH_LAYERED` sentence with the move and the D1 ids.
- `docs/architecture/alg-layered-compound.md:218-221`: 27 entries (24 plus the three generated tree inputs, #68).
- Leave `docs/architecture/alg-trees.md:386` (history of how the mislabel was found) and `docs/conformance.md:2443-2446`
  (the row 9 sweep record) as they are.

## Auto-confirmed (unattended)

Planned unattended on 2026-11-23 from issue #68 (`queue:ready`; maintainer ruling 2026-11-13 in the body; comment of
2026-11-13 moving item B's bar to #74). #66, lower-numbered, is already on the branch (`queue:on-branch`, commit
`e30d1c5c`).

- **D1:** the ruling's suggested form. Rejected: algorithm-named slugs. Evidence: `test/golden/layered.json` id form.
- **D2:** vendored copies plus a `generated/` resolver in the regen script. Rejected: two roots in the runner, a new
  entry field, sending vendored files for all cases. Evidence: `regen-goldens.sh:54-60,163-170,191`;
  `ElkModelReader.java:41-46`; `cmp` of `trees-inputs/<alg>-generated.json` and `test/corpus/generated/<alg>-tree-small.json`
  (identical, all three).
- **D3:** scope the 7h checks; pin the three. Rejected: raising the frozen count. Evidence: the ruling's step 3;
  `layered-hierarchy-goldens.test.ts:26-35,64-81`.
- **D4:** no `_meta.json` edit. Evidence: both files at `63fa9aa4` (six fields, equal values).
- **D5:** regen both sets. Rejected: rename alone.
- **D6:** as listed. Evidence: `grep` of the three ids and `RECORDED_WITH_LAYERED` outside `plans/` (only the two
  test/manifest files, `docs/architecture/alg-trees.md`; `docs/conformance.md` by counts and "mislabelled").
- **Rollback:** Reversible (revert the one commit). Observability: N/A (test goldens and tooling only).
