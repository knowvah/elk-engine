<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: proof

| Task                    | Writes                                                                                         | Needs  |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| [T5](T5-proof.md)       | `test/golden/refs/java/` in place (must end byte-identical), the loops sweep dir, the cache    | T1-T4  |

Step 2 (the `elkj` lane) starts right after T1's commit. The rest waits for T4.

Exit: gate 7 is empty, the loops sweep is byte-equal, and the lane log ends `exit 0` with no `hit`.
