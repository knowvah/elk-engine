<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: records and docs

**Agent:** orchestrator. **Budget:** 30 min. **Commit:** one (`docs(trees): ...`), squashed in T6.

## Task

1. Fill the outcome column of [sites.md](../sites.md) from the three reports.
2. `docs/architecture/alg-trees.md` § 7 (lines 278-293): keep the inventory table; add which sites are explicit-stack loops
   (AC6, #67) with their test files; replace the "Beyond the probe" sentence with the new per-shape result (`D_oracle`,
   oracle compare, D5 byte identity). Update the known-limitations row at line 304: remove it if all six shapes are done,
   else point it at the close-out follow-up issue.
3. `docs/conformance.md`: the TR7 bullet (line 1896) and the stack-depth bullet (lines 1985-1986), the same facts; check the
   AC6 list near line 901 (`Iterative traversals`) and add the tree sites there if it is the project-wide list.
4. `plans/alg-trees/decision-journal.md`: append one closing row (as row 105 did for #66): the sites converted, the six
   shapes' results, the issue numbers. Never edit an earlier row.
5. Run `npm run format:check` on the changed docs and `npm run docs:build` if `docs/` changed in a way the site renders.

## Read-set

The three track reports; [sites.md](../sites.md); `docs/architecture/alg-trees.md:270-310`; `docs/conformance.md:895-905,
1890-1900, 1980-1990`; `plans/alg-trees/decision-journal.md:85-105`.

## Write-set

`plans/tree-recursion-depth/sites.md`, `docs/architecture/alg-trees.md`, `docs/conformance.md`,
`plans/alg-trees/decision-journal.md` (one appended row), the journal.

## Acceptance criteria

- Given the reports, when T5 ends, then every sites.md row has an outcome and every converted site names its test file.
- Given the docs, when read, then no sentence still says the trees' recursion is all verbatim or that four shapes overflow
  below the oracle, unless a shape is still a partial (then it names the follow-up issue).

**Observability:** N/A. **Rollback:** Reversible.
