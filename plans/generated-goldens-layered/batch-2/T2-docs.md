<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: docs

## Context

Ruling #68 item C step 5 and the comment moving item B's bar to #74. Scope is [D6](../decisions.md#d6-docs-scope).

## Read-set

- `docs/conformance.md:350-358`, `:1678-1686`, `:1872-1880`, `:1970-1990`.
- `docs/architecture/alg-trees.md:148-162`; `docs/architecture/alg-layered-compound.md:215-225`.
- T1's journal rows (ids, counts, proof).

## Steps

1. Edit each passage D6 lists, in the file's existing register (dense, factual, issue numbers in parentheses).
   - `sloppy_overlaps_2`: state the bar as the ruling words it ("the positional effect stays at or below 0.01 px"),
     that the measured effect is one option string with coordinates within 1e-13, and cite #68 item B and #74.
   - Old ids may be named once each, as "formerly `<alg>-generated`", where the move is described.
2. `grep -n "RECORDED_WITH_LAYERED\|mislabel" docs/conformance.md docs/architecture/*.md`: no match except
   `alg-trees.md:386` (history, kept). `grep -n "40 refs\|24 entries" docs/conformance.md docs/architecture/alg-trees.md docs/architecture/alg-layered-compound.md`:
   each remaining hit is a mission-history line; journal which.
3. `npx prettier --check` on the three files; `npm run docs:build` (exit 0).
4. Journal a `decision` row listing each passage changed. Commit `docs: give the moved generated goldens' counts and
   the 0.01 px bar`, footer `Refs: #68`.

## Write-set

`docs/conformance.md`, `docs/architecture/alg-trees.md`, `docs/architecture/alg-layered-compound.md`, the journal.

## Acceptance criteria

- Given the docs, when a reader looks up the trees or layered golden set, then the counts are 37 and 27 and the three
  goldens are described as layered goldens of the generated tree inputs.
- Given the `sloppy_overlaps_2` entry, then it states the 0.01 px bar and cites #74.
- Given `npm run docs:build`, then it exits 0.

**Observability:** N/A. **Rollback:** Reversible (revert the commit).
