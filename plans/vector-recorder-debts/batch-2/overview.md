<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: split `LayeredLoopsVectors.java`

| Task                              | Writes                                                                                                        | Needs | Owner        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| [T4](T4-split-loops-recorder.md)  | `tools/vectors/LayeredLoopsVectors.java`, `tools/vectors/LayeredLoopsVectors/*.java` (new)                    | T1    | orchestrator |

The `elkj` lane (T5 step 2) should already be running when this batch starts.

Exit: the split recorder records a `layered-loops.json` that is `cmp`-identical to the ref.
