<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: spore-scanline-0004 (issue #111, 2026-11-20)

## Observation: 0004 is the first carried behavioural patch

- **Context**: Reading `docs/conformance.md` § 1 and § 4 for where the patch goes.
- **Finding**: Both sections define patches as seams always paired with a TS seam (0002 the stated exception). No
  "Carried upstream patches" section has ever existed (`git log -S` over `docs/conformance.md` and `tools/oracle/patches`);
  the earlier upstream fixes were taken by moving the pin, never as patches.
- **Impact**: The docs need a second patch kind, not just a fourth row. The "three patches" sentence is in § 1, not § 4
  as the issue says.
- **Confidence**: High

## Observation: every golden `_meta.json` records the patch series, and one test enforces it

- **Context**: Scoping gate 7 for a patch that touches only `alg.common`.
- **Finding**: Ten `test/golden/refs/*/_meta.json` carry a `patches` array; `test/docs/examples.test.ts:127` requires
  `elk-examples/_meta.json` `patches` to equal the file names in `tools/oracle/patches/`. JVM vector files record only the
  oracle commit, not the patches.
- **Impact**: Adding a patch file turns `examples.test.ts` red until `regen-goldens.sh --set examples` runs; every regen
  set must rerun for its `_meta.json`, even where no layout changes.
- **Confidence**: High

## Observation: only two vector recorders reach `ScanlineOverlapCheck`

- **Context**: Deciding which JVM recorders to rerun.
- **Finding**: grep of `tools/vectors/*.java` for `OverlapRemoval|ScanlineOverlapCheck|sporeOverlap`: `AlgCommonVectors`
  (8 `scanline` rows in its `spore` group) and `SporeLayoutVectors` run it; `MetaDataVectors` loads option metadata only;
  `RadialVectors` matches `RadiusExtensionOverlapRemoval`, a different class.
- **Impact**: With a per-class jar diff proving only `ScanlineOverlapCheck*` changed, other recorders need no rerun.
- **Confidence**: High (grep), Medium for the class diff (to be shown at T1)

## Observation: a filtered sweep without `--out` overwrites the full sweep cache

- **Context**: Planning the `sporeOverlap` evidence sweep.
- **Finding**: `sweep.sh` writes `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/`, keyed by commits only (not the patch
  series), and a `--filter` run without `--out` replaces it (conformance, 2026-11-05 note).
- **Impact**: Always `--out` to scratch; the pre-0004 cache is the comparison baseline and backs `docs/parity-report.md`.
- **Confidence**: High
