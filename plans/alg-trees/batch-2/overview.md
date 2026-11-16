<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — mrtree model; radial leaf classes; vertiflex relative placement

Three tasks, one per bundle, disjoint write-sets, **in parallel** after batch 1. Each builds its bundle's replay helpers (row reader
and state dump, the TS twin of its recorder's header contract) and tests the classes it ports against recorded stops where a stop
isolates them, otherwise against values traced from the Java (no hand-derived numeric expectation, AD-13).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T6 | mrtree graph model, `InternalProperties`, `TreeUtil`, factory enums + staging, replay helpers ([brief](T6-mrtree-model.md)) | typescript-pro | src/alg/mrtree/{graph/**,options/InternalProperties*,TreeUtil*,TreeLayoutPhases*,intermediate/IntermediateProcessorStrategy*}, 15 staged files, test/architecture/staged-classes.json, test/helpers/mrtree-replay-*.ts | T1, T5 | [x] |
| T7 | radial `InternalProperties`, `RadialUtil`, sorting, wedge criteria, rotation, optimization, replay helpers ([brief](T7-radial-leaf.md)) | typescript-pro | src/alg/radial/{InternalProperties,RadialUtil,sorting/*,p1position/wedge/*,intermediate/rotation/*,intermediate/optimization/*}, test/helpers/radial-replay-*.ts | T2, T5 | [x] |
| T8 | vertiflex `InternalProperties`, `VertiFlexUtil`, `VertiFlexLayoutPhases`, `p2relative/**`, replay helpers ([brief](T8-vertiflex-relative.md)) | typescript-pro | src/alg/vertiflex/{InternalProperties,VertiFlexUtil,VertiFlexLayoutPhases,p2relative/**}, test/helpers/vertiflex-replay-*.ts | T3, T5 | [x] |
