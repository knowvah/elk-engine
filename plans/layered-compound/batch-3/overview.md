<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Compound processors (sections behind facades)

Two port tasks with disjoint write-sets, after batch 2. Under H11 each processor's logic goes into section modules behind a
facade that keeps throwing, so `doCompoundLayout` and every landed test behave as at the base until T8. T6's row tests replay the
first stop of a run (after `CompoundGraphPreprocessor`) on the imported graph alone. T7's stop is the last of the run, so its
row tests inject both section entries in place of the facades. T7 writes its code in parallel with T6 against T6's interface
contract, and runs its row tests once the orchestrator has committed T6.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T6  | `CompoundGraphPreprocessor` sections and `ExternalPort` ([brief](T6-compound-preprocessor.md)) | typescript-pro | src/alg/layered/compound/CompoundGraphPreprocessor{Sections*,ExternalPort}.ts + tests | T4 | [x] |
| T7  | `CompoundGraphPostprocessor` sections ([brief](T7-compound-postprocessor.md)) | typescript-pro | src/alg/layered/compound/CompoundGraphPostprocessorSections*.ts + tests | T4 (T6 for its row tests) | [x] |

Done when both pass their acceptance criteria, `doCompoundLayout` still throws the staged message, and the README gates are
green.
