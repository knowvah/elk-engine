<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: parse-refs-layered-keys (issue #63, 2026-11-23)

Planning-time notes are in `parse-refs-layered-keys-planning.md`. Journal:
`plans/parse-refs-layered-keys/decision-journal.md`.

## Observation: an added property reorders exported `layoutOptions` only when the map crosses a capacity

- **Context**: T1 regenerated `test/golden/refs/elk-parse/` with two more layered keys on 48 elements and compared the
  result with the base.
- **Finding**: 9 of the 48 elements had their earlier keys reordered: exactly the ones that went from 6 properties to 8.
  The 38 that went from 3 to 5 and the one that went from 8 to 10 kept their order. `EcoreEMap.put` creates the bucket
  table at capacity 1 and `doPut` grows it to `2 * old + 4` when `size + 1` exceeds it, so the capacities are 1 (1
  entry), 6 (2 to 6 entries), 16 (7 to 16), 36 (17 to 36). A reorder of existing keys needs the entry count to cross 1,
  6 or 16.
- **Impact**: when a change adds or removes properties on ElkGraph elements, expect `layoutOptions` order changes in
  byte-exact refs only on elements whose property count crosses one of those sizes. An order change on any other
  element is not this mechanism and needs its own diagnosis.
- **Confidence**: High

## Observation: `docs/conformance.md` keeps superseded text and closes it with a dated update lower in the section

- **Context**: the brief planned a `follow-up` issue because `docs/conformance.md:724-730` says the core-layout
  mismatches "close when the layered bundle and the other algorithm bundles are registered (mission 7h)".
- **Finding**: the same section ends with "**Update 2026-11-13 (roadmap row 9).**" (`:804-808`), which reports 0
  `mismatch` and 0 `ts-only-throw` for `fixed`, `box` and `random` after every provider was registered. The earlier
  paragraph is the mission 5 text, kept as written. The planned issue's premise (a sweep rerun is still needed) was
  wrong, and no issue was filed.
- **Impact**: before calling a `docs/conformance.md` passage stale, read to the end of its section and grep it for
  `Update 20`. The same holds for `plans/roadmap.md`, where later revisions supersede earlier lines that are never
  edited.
- **Confidence**: High

## Observation: a diff hunk count is not a count of changed objects

- **Context**: comparing T1's D3 output with the planning probe's "18 reorder hunks (6 / 2 / 8 / 2)".
- **Finding**: each reordered `layoutOptions` object shows as 2 hunks, so the 18 hunks are 9 objects (3 / 1 / 4 / 1). The
  whole diff has 57 hunks at `-U0`; the other 39 add the two keys and move the comma of the line before them.
- **Impact**: state an allowed ref difference in objects and keys, counted by a script that parses both sides, and add a
  text-level check where number spelling matters (`JSON.parse` hides `1.0` against `1`). T1's script did both; it is
  described in the journal's D3 row and in `plans/parse-refs-layered-keys/decisions.md` (D3).
- **Confidence**: High
