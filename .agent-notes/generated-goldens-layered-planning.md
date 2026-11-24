<!-- SPDX-License-Identifier: EPL-2.0 -->

# generated-goldens-layered: planning observations (issue #68)

## Observation: the golden `_meta.json` files hold no ids or counts

- **Context**: the #68 ruling asks to update both sets' `_meta.json` "(ids, counts)".
- **Finding**: `write_meta` (`tools/oracle/regen-goldens.sh:172-187`) writes `elkCommit`, `patches`, `jdk`,
  `modelsCommit`, `generatedBy` and `jvmFlags` only; `refs/elk-trees/_meta.json` and `refs/elk-layered/_meta.json` are
  equal at `63fa9aa4`.
- **Impact**: moving entries between sets changes neither file (D4); the regen run proves it.
- **Confidence**: High

## Observation: the layered golden set reads elk-models, not a repo directory

- **Context**: where the three moved inputs can live.
- **Finding**: `--set layered` has no `INPUTS_DIR`, so the oracle reads `$ELK_MODELS_DIR/<path>`; the vendored copy under
  `test/golden/inputs/pipeline/` is only compared with it (`require_vendored_inputs`) and read by the TS runner. The
  generated tree inputs are repo files (`test/corpus/generated/`), absent from elk-models.
- **Impact**: the regen script needs a `generated/` resolver (D2). The oracle uses an input path only for its
  extension (`tools/oracle/harness/ElkModelReader.java:41-46`), so the location cannot change a ref.
- **Confidence**: High

## Observation: the ruling's conformance line numbers are stale

- **Context**: #68 item C step 5 names the `sloppy_overlaps_2` entry "around line 1708".
- **Finding**: at `63fa9aa4` the entry is `docs/conformance.md:1980-1983`, with the item A/mislabel bullet at
  `:1984-1987`; the row 9 sweep record of the same case is at `:2443-2446`.
- **Impact**: T2 edits `:1980-1987` and leaves the row 9 record.
- **Confidence**: High
