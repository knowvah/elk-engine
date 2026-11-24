<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: docs that state the hold-back (ruling item 4, D6)

## Context

The 7h and 8b sections, and four architecture pages, still describe `STRESS_PENDING`, the missing texts and the
unvendored models as current. Line numbers were taken at planning (`32ca890e`); re-grep for `#58`, `STRESS_PENDING`,
`stress-pending`, `H13` and `hierarchicalLayoutMixing` before editing.

## Write-set and changes

- `docs/conformance.md`:
  - the 7h runner table: set the TS column of the `Issue700Test` row (`:1694`) to 4, and check the `Issue665Test` row;
  - `:1705`: the counts now equal the oracle's;
  - the H13 bullet (`:1707-1711`): resolved by #58's ruling, with the D7 evidence. `588` stays out (ruling boundary);
  - `:1762`, and the 8b bullet `:2044-2046`;
  - after the dated text-sizing-seam evidence (`:2438-2452`), add one sentence if it would otherwise read as current.
- `docs/architecture/alg-layered-compound.md`: `:141` (recorder audit: the two models are now vendored for the suites
  but stay out of the recorder, D4), `:311-318`, the `:401` table row, and `:408`.
- `docs/architecture/alg-force-disco.md`: the `:24` index entry and the `:311` row.
- `docs/architecture/text-sizing-seam.md`: `:83-84` (the two classes now agree) and `:93` (the four texts are no longer
  missing).
- `docs/architecture/alg-packing.md:468`: #58 is resolved.
- `plans/layered-compound/decision-journal.md`: append one row, `| <date> | H13 | follow-up | …`, recording that the
  ruling landed: hold-back removed, 1/1 and 4/4, mission `layered-stress-cases`, `Refs: #58`. Edit no earlier row.

## Acceptance criteria

- Given the finished docs, when `grep -rn "STRESS_PENDING\|stress-pending" docs` runs, then it finds only dated
  history that says the filter was removed.
- Given `npm run docs:build`, then it is clean, with no broken links.
- Given `npx prettier --check` on the changed Markdown, then it is clean.

## Observability

N/A.

## Rollback

Reversible.
