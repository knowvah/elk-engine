<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorders, golden set, option codegen

Five tasks with disjoint write-sets run **in parallel**. T1–T4 record every expectation from the oracle before any TS of the three
bundles exists (AD-13). T5 generates the option classes and stages the radial factory targets (TR4, TR5); it is checked against the
landed `test/golden/refs/java/metadata.json`, not against T1–T4. The four JVM tasks share the machine: each checks `uptime` and runs
under `nice -n 10`; the orchestrator may serialise their JVM runs.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | mrtree recorder and ref ([brief](T1-mrtree-recorder.md)) | java-architect | tools/vectors/{MrTreeVectors.java,mrtree-vectors.sh}, test/golden/refs/java/mrtree.json | — | [x] |
| T2 | radial recorder and ref ([brief](T2-radial-recorder.md)) | java-architect | tools/vectors/{RadialVectors.java,radial-vectors.sh}, test/golden/refs/java/radial.json | — | [x] |
| T3 | vertiflex recorder and ref ([brief](T3-vertiflex-recorder.md)) | java-architect | tools/vectors/{VertiFlexVectors.java,vertiflex-vectors.sh}, test/golden/refs/java/vertiflex.json | — | [x] |
| T4 | `trees` golden set ([brief](T4-trees-golden-set.md)) | build-engineer | tools/oracle/regen-goldens.sh, test/golden/trees.json, test/golden/trees-inputs/**, test/golden/refs/elk-trees/** | — | [x] |
| T5 | Option codegen, enums, radial staging ([brief](T5-options-codegen.md)) | typescript-pro | src/alg/{mrtree,radial,vertiflex}/options/**, src/alg/vertiflex/EdgeRoutingStrategy.ts, src/alg/radial/{RadialLayoutPhases,intermediate/IntermediateProcessorStrategy}.ts, the 7 radial interfaces and 16 staged files, tools/melk/config.ts, test/architecture/{staged-classes.json,staged-classes.fitness.test.ts}, test/melk/{mrtree,radial,vertiflex}-options.test.ts | — | [x] |

Done when all five pass their acceptance criteria and the README gates are green. Agents never run `npm run coverage` and never
commit; the orchestrator commits each task.
