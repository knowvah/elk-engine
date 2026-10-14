<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — `validate`, `serialize` and the round trip

One task: completes the G4 entry point with `validate` (T20) and `serialize` (T19 + T21) and proves the writer
end to end, including the D3 `.json` ≡ `.elkt` check on realworld models. Depends on batch 7.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T22 | `validate`/`serialize` on `ElkGraphText`; `elkt-roundtrip.test.ts` (round trip, D3) | typescript-pro | src/graph/text/ElkGraphText.ts, test/golden/elkt-roundtrip.test.ts | T18, T20, T21 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
