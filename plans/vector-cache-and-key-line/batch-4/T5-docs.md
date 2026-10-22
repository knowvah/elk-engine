<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: docs and follow-ups (documentation-engineer)

**Goal:** the docs describe the vector cache and its evidence rules with T4's measured times, no doc still calls F7
open, and the follow-up list closes C4 and F7.

## Write-set

- `docs/architecture/elk-json-text.md`: §8 runbook item 1 (`:269-282`): the cache (location, salt, whole-program vs
  per-row, `ELK_VECTORS_CACHE=off`, summary lines, the D3 evidence rule, `rm -rf` to clear) and T4's cold, warm and
  eviction wall times; drop "the recorder's cost stays open follow-up C4". Check §7 evidence and §10 maintenance rows
  that mention the hours.
- `docs/architecture/elk-text.md`: the "Diagnostic lines" row (`:219`): remove "Not yet moved: `#parsePropertyKey` …
  (follow-up F7)", cite T1's two validate scenarios; mention the cache wherever `elkt-vectors.sh` is documented.
- `docs/conformance.md`: the F7/property-key wording near `:407` and `:491`.
- `docs/translation-rules.md`: the `NodeModelUtils` row (`:562`): drop "and `#parsePropertyKey` (F7)".
- `plans/graph-json-text/follow-ups.md`: rows C4 and F7 → `closed 2026-10-2x (vector-cache-and-key-line T1–T5)`
  with one-line outcomes; never delete rows.

## Read-set

- T4's journal rows; T1's journal rows (scenario ids)
- [../batch-2/T3-vector-cache.md#interface-contracts](../batch-2/T3-vector-cache.md#interface-contracts)
- `decisions.md#d1` … `#d4`

## Acceptance criteria

- Given `npm run docs:build` and `npm run format:check`, then both pass.
- Given `grep -rn 'F7\|parsePropertyKey' docs/`, then no hit describes the property-key line as open or ANTLR-based.
- Given `grep -rn 'hours' docs/architecture/elk-json-text.md`, then every hit states a cold-run cost, and the warm
  cost appears next to it.
- Given `plans/graph-json-text/follow-ups.md`, then C4 and F7 are closed and no other row changed.

## Interface contracts

Consumes T4's numbers and T3's names; produces none.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.

## Commit

`docs(T5): document the vector cache and close c4 and f7`.
