<!-- SPDX-License-Identifier: EPL-2.0 -->

# parse-refs-layered-keys: planning observations (issue #63)

## Observation: the "sections 5 and 6" of the ruling map to §5 and §7 for the stale text

- **Context**: mapping the #63 ruling's doc bullet to `docs/architecture/elk-json.md`.
- **Finding**: the stale "until mission 7h" text is at §5 (`:155-158`) and in the §7 notes (`:194-197`). §6
  (`:160-169`) holds the `EcoreEMap` bucket-order bullet that explains the reorder the regeneration brings.
- **Impact**: T2 edits all three sections. §6 gets the reorder note, and §5 and §7 lose the stale text.
- **Confidence**: High

## Observation: conformance.md claims mission 7h closed the strip-list item

- **Context**: grepping for `STRIP_KEYS` references.
- **Finding**: `docs/conformance.md:2576-2577` says the parse-input strip of the two layered keys was "closed by
  mission 7h", but both strip sites still held the keys at planning (`d4506c32`).
- **Impact**: T2 corrects the bullet to name #63. The corpus hand-off at `:724-730` is a different item and stays as
  it is (ruling).
- **Confidence**: High
