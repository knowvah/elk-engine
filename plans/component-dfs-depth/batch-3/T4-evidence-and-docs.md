<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: evidence at depth and docs

**Agent:** orchestrator. **Budget:** 60 min. **Commit:** one (`docs(force): …`), plus one per further site. T5 squashes them.

## Task

1. **Final runs.** With T2 and T3 landed, run the path and the caterpillar of force, stress and disco at `D_oracle(alg)`
   through the T1 harness, on the default stack with no node flags (a heap flag for stress is allowed). For each, record:
   TS `ok` and time; `compare.mts` against the oracle output (1e-6); `cmp` against the T1 D5 reference (byte-identical).
2. **Further sites (D2, stop 8).** If a run overflows, take the repeating frame. An in-bundle frame is converted by the
   batch-2 steps (test first). An out-of-bundle frame follows stop 8. Repeat step 1. Stop 7's budget applies.
3. **Docs.**
   - `docs/architecture/alg-force-disco.md` § 5 (lines 266-285): keep the T12 probe paragraph and table as history. Add
     that both `dfs` sites are explicit-stack loops (AC6, #70) with their test files. Add the D1 grid result and the per-
     algorithm evidence of step 1. Replace the "it is the maintainer's call" sentence. In § 7 (line 310), remove the
     recursion row if all three algorithms are done; otherwise point it at the close-out `follow-up`. Update the
     contents-table row of § 5 (line 22) and § 7 (line 24) if their text names #70 as open.
   - `docs/conformance.md`: the FD7 bullet (lines 2065-2066), the stack-depth bullet (lines 2138-2139), and the AC6 list
     (lines 902-904), where you add the force and disco sites next to the trees' pointer.
4. `plans/alg-force-disco/decision-journal.md`: append one closing row (date, `#70`, `close`): the two sites, `D_oracle` per
   algorithm, and the evidence. Never edit an earlier row.
5. **#167 comment** (`gh issue comment 167`): name the two new `checkStackDepth` call sites (D7), and note that both stop on
   visited marks, so Q3's answer applies to them.
6. Run `npx prettier --check` on the changed docs and `npm run docs:build`.

## Read-set

The T1 journal rows and the T2 and T3 reports; `docs/architecture/alg-force-disco.md:1-30, 260-315`;
`docs/conformance.md:898-906, 2060-2068, 2134-2142`; `plans/alg-force-disco/decision-journal.md` (last rows, for the format);
`docs/architecture/alg-trees.md` § 7 (how #67 wrote the same result).

## Write-set

`docs/architecture/alg-force-disco.md`, `docs/conformance.md`, `plans/alg-force-disco/decision-journal.md` (one appended row),
the journal; a further site's source and test file (step 2, journaled).

## Acceptance criteria

- Given the converted port, when the six final runs finish, then each is `ok` on the default stack, equal to the oracle at
  1e-6 and byte-identical to its D5 reference. Any exception is a journaled partial with its `follow-up`.
- Given the docs, when read, then no sentence says the two searches are verbatim or that TS overflows at 16,000, unless an
  algorithm is still a partial (then the sentence names the follow-up).
- Given #167, when T4 ends, then it carries a comment naming both call sites.

**Observability:** N/A. **Rollback:** Reversible.
