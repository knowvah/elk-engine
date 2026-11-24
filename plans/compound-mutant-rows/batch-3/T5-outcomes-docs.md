<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: outcomes and docs

## Task

1. Fill the Outcome column of [items.md](../items.md): one D6 outcome per item. For outcome 1, give the row id and
   the journal row of the kill. For 2, a one-line argument. For 3, the `follow-up` issue. For 4, the closest
   approach. For 5, the base kill.
2. Append `## Mutant rows (issue #60, compound-mutant-rows)` to `plans/layered-compound/unreached.md`, in the style
   of its `## Search outcomes (issue #59, layered-arm-search)` section: the table of [items.md](../items.md) with
   outcomes, the D1 basis for the twins list, and the I6 mechanism (copy the issue's "why invisible" paragraph,
   updated with the oracle values T3 found). Add one closing row to `plans/layered-compound/decision-journal.md`
   pointing at that section. Edit no earlier line of either file.
3. Docs:
   - `docs/architecture/alg-layered-compound.md`: the ref bytes (`:129`), the row-count row (`:339`), and the `worked`
     mode next to the `logged` description, if sites modes are listed there.
   - `docs/conformance.md`: the compound ref entry near `:1661` (bytes, rows) and one bullet for the new rows near the
     #59 bullet (`:1777`).
   - `docs/architecture/elk-upgrade.md` § 7: only if the recorder's output line or time changed.

## Write-set

[items.md](../items.md), the journal, `plans/layered-compound/unreached.md` (appended section),
`plans/layered-compound/decision-journal.md` (one row), the three docs files above.

## Acceptance criteria

- Given [items.md](../items.md), when T5 ends, then every item I1-I8 has exactly one outcome with its evidence.
- Given the docs, when `npm run docs:build` runs, then it passes, with no new warning beyond the base count.
- Given `git diff` of the two earlier-mission files, then only appended lines differ.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (docs only).
