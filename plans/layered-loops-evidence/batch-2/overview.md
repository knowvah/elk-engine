<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: record, check the mutants, pin the spline throw

Serial, by the orchestrator: T5 → T6. T7 may run beside T6, because their write-sets are disjoint.

| Task | Writes | Depends on |
| ---- | ------ | ---------- |
| [T5](T5-record.md) | recorder (`evidenceSites()`), `layered-loops.json` (by script) | T1-T3 hand-backs |
| [T6](T6-mutation-check.md) | `mutants.md` verdicts, `unreached.md` mutant proofs | T5 |
| [T7](T7-spline-throw-and-proofs.md) | `SplineEdgeRouter.sites.test.ts`, `unreached.md` spline and Sc28 entries | T4 hand-back, D5 probe |

`unreached.md` is written by T6 (its "Mutant proofs" section) and T7 (the spline and Sc28 sections). Run them one after
the other, or give T7 the file and have T6 hand its section to T7: one writer at a time.

**Done when:**

- every new row replays green;
- the D3 diff is clean;
- every mutant has a verdict;
- the spline case passes.

**Commits:** one per task (`test(layered): …` or `docs(plans): …`), squashed in T9.
