<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recorder-gaps: planning observations (issue #66)

## Observation: radial and vertiflex ref counts are pinned by committed tests

- **Context**: deciding where #66's new rows go.
- **Finding**: `test/helpers/radial-replay-rows.test.ts:71` pins 309 radial ids. `test/helpers/vertiflex-replay-rows.test.ts:42`
  and `:87` pin 247 / 216 / 8. `MrTreeVectors.test.ts` pins `FIRST_REF_COUNTS` for `mrtree.json`. Appending rows to any of
  them changes a frozen value (AD-13), as #156 found for layered.
- **Impact**: new tree rows go into new ref files, and the new test files assert their own counts.
- **Confidence**: High

## Observation: `mrtree-extra.json` is at its size cap

- **Context**: same.
- **Finding**: `mrtree-extra.json` is 8,117,818 bytes. `EXTRA_MAX_BYTES` defaults to 8 MiB (8,388,608) at
  `MrTreeVectors.java:234`, overridable by `MRTREE_CAP_MB`.
- **Impact**: about 270 KB of headroom. Further mrtree rows need another file or a cap change.
- **Confidence**: High

## Observation: the mrtree dump extension collides with a frozen count

- **Context**: issue #66 bullet 4.
- **Finding**: `test/helpers/mrtree-replay-dump.test.ts:62` freezes `UNRESTORABLE_GRAPHS = 27`. A dump that carries in-edge order
  makes those graphs restorable, so the count would have to change, and both mrtree refs would be re-recorded.
- **Impact**: the extension is a `needs-ruling` part, not queue work.
- **Confidence**: High
