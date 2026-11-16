<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — layered-loops-wrapping-compaction (mission 7g, 2026-11-10)

## Observation: the layered bundle carries its own compaction copies

- **Context**: Sizing `J/compaction/**` against the landed `alg.common` port.
- **Finding**: `alg.layered.compaction.{oned,recthull}` differ from `alg.common`'s classes of the same names (diff lines at the
  pin: `CNode` 258, `OneDimensionalCompactor` 269, `CGroup` 176, `CGraph` 31, `RectilinearConvexHull` 17, `Point` 12,
  `Scanline` 10). `intermediate/compaction` imports the **common** `oned` and `networksimplex`; only `ComponentsCompactor` uses the
  layered copies.
- **Impact**: two ports (W2); never map one onto the other.
- **Confidence**: High

## Observation: `DummySelfLoopProcessor` has no caller at the pin

- **Context**: Checking which self-loop classes the enum reaches.
- **Finding**: no `IntermediateProcessorStrategy` member creates it; only Javadoc in `NorthSouthPortPreprocessor.java:110-140`
  names it. `SelfLoopPlacementStrategy` likewise has no option in `Layered.melk`.
- **Impact**: `DummySelfLoopProcessor` is proven through an explicit `processor` step op (W3); no row can set a self-loop
  placement.
- **Confidence**: High

## Observation: no corpus model sets a wrapping strategy

- **Context**: Choosing wrapping inputs.
- **Finding**: `grep -rli wrapping` over `$ELK_MODELS_DIR` (`.elkt`, `.json`) finds nothing; 11 `.elkt` set `postCompaction`
  (`tests/layered/compaction_oned/**`), 9 are under `tests/layered/connected_components/`, 6 under `tests/layered/self_loops/`.
- **Impact**: wrapping is proven by option rows over existing models (T1) and the sweep's option family (W5).
- **Confidence**: High

## Observation: the driver's execution prompt relaxes write-set stops and asks for foreground subagents

- **Context**: Reading `.claude/mission-driver.sh` `exec_prompt` (main checkout, read only).
- **Finding**: a write outside a task's write-set is journaled, not a stop; partial blockers become `needs-ruling` issues;
  subagents must run in the foreground; the driver verifies exactly one commit on the base and a clean tree.
- **Impact**: the brief's stop list is in that queue form; sweep dirs must be gitignored before the squash.
- **Confidence**: High
