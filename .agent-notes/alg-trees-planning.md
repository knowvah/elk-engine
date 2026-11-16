<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — alg-trees (mission 8a, 2026-11-10)

## Observation: the staged-classes fitness test whitelists layered missions only

- **Context**: Choosing how the radial and mrtree factory enums land before their targets.
- **Finding**: `test/architecture/staged-classes.fitness.test.ts:22` matches `// @staged (7f2|7[b-h])` only; an `8a` marker is
  invisible to it, so a staged file with a registry row fails the test.
- **Impact**: staging in 8a/8b/8c needs the `MARKER` widened (TR4, pre-approved as a fitness extension, not an AD-13 change).
- **Confidence**: High

## Observation: phase classes and their factory enum import each other

- **Context**: Ordering mrtree and radial tasks.
- **Finding**: `TreeLayoutPhases.create()` constructs the four phases, and each phase is an `ILayoutPhase<TreeLayoutPhases, TGraph>`
  whose static `LayoutProcessorConfiguration` names `IntermediateProcessorStrategy` values (`DFSTreeifyer.java:45-50`); the radial
  option enums construct the sorters, compactors and evaluations, which read `RadialOptions`. vertiflex's `VertiFlexLayoutPhases` is
  a leaf enum (its `*Strategy` enums are per package).
- **Impact**: without staging, the four mrtree phases plus `TreeLayoutPhases` must land in one commit (about 2,000 Java lines).
- **Confidence**: High

## Observation: `java-tests.sh` does not list the mrtree and radial test bundles

- **Context**: Java baseline for `MrTreeGraphSizeTest` and `CenterOnRootTest`.
- **Finding**: `tools/oracle/java-tests.sh:33` lists only the layered and alg test bundles, and `ROOT` is derived from the script's
  own path, so a scratch copy must also pin `ROOT` (line 17). The compiled test classes exist in the oracle worktree.
- **Impact**: `plans/alg-trees/java-baseline.md` carries the two-line `sed` recipe; results 6/0 and 2/0.
- **Confidence**: High

## Observation: no elk-models model uses mrtree, radial or vertiflex at the root

- **Context**: Golden inputs for the tree algorithms.
- **Finding**: `docs/parity-report.md`: 0 native cases each; 898 retarget + 7 generated cases each; radial throws on 365 and
  vertiflex on 553 (plus 1 timeout) of 905. `regen-goldens.sh` reads inputs only from `$ELK_MODELS_DIR`, and new
  `test/corpus/variants.json` keys would multiply every native corpus case.
- **Impact**: designed inputs carrying their option set in a repository directory (`test/golden/trees-inputs/`, TR2).
- **Confidence**: High
