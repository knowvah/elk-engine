<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: p3order-test-titles (issue #62, 2026-11-20)

## Observation: the base tree equals the last gated tree

- **Context**: Choosing the baseline for this brief at `68f37f6e` (merge of PR #126).
- **Finding**: `git diff --stat ec315bf5 68f37f6e` is empty, so HEAD's tree is the tree the
  space-efficient-label-switcher mission gated green on 2026-11-20 (roadmap, last revision: 49,305 passed,
  93 skipped). Planning reran on it: `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, no violation
  line), and the full vitest suite with the nine sweep directories off: 1,173 files and 49,305 tests passed,
  93 skipped, 0 failed (132 s wall).
- **Impact**: The executor may take the planning baseline instead of rerunning gates at start.
- **Confidence**: High

## Observation: one more stale staging comment outside #62

- **Context**: Grepping `until 7[a-h]|U until|U for the rows` over `src`, `test`, `tools`.
- **Finding**: Besides the three titles, `src/alg/layered/ElkLayeredTestExecutionState.ts:6` says
  `ElkLayered.prepareLayoutTest` "is staged until 7f". `test/helpers/layout-test-runner.test.ts:182` is an `Error`
  message used as test data, not a claim.
- **Impact**: T2 checks the first and files it as `follow-up` (D3); not fixed in this mission.
- **Confidence**: High (grep); staleness of the Javadoc is Medium until `ElkLayered.ts` is read
