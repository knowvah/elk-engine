<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: remove the hold-back

Depends on T1 (metrics), T2 (vendored models) and T3 (registration).

| Task | Writes | Owner |
| ---- | ------ | ----- |
| [T4](T4-remove-hold-back.md) | delete `test/helpers/stress-pending.ts` and `test/helpers/stress-pending.test.ts`; modify `src/alg/layered/issues/Issue665Test.test.ts` and `Issue700Test.test.ts` | orchestrator (owns the JVM run of D7) |

Status: [x] T4
