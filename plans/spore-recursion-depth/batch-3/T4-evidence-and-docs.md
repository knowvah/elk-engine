<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: evidence at depth and docs

**Agent:** orchestrator. **Budget:** 120 min (the compaction runs at depth). **Commit:** one (`docs(spore): …`), plus one per
further site. T5 squashes them.

## Task

1. **Final runs.** With T2 and T3 landed, run the chain of `sporeOverlap` and `sporeCompaction` at `D_oracle(alg)` through the
   T1 harness, on the default stack with no stack flag (a heap flag is allowed). Start the long compaction run detached as soon
   as both tracks are committed. For each, record: TS `ok` and time; `compare.mts` against the oracle output (1e-6); `cmp`
   against the T1 D5 reference (byte-identical).
2. **Gated chain row.** Run `SPORE_CHAIN_FULL=1 npx vitest run src/alg/spore/SporeLayoutVectors.test.ts` once, detached
   (about 321 s at PK6), and journal the result. The flag stays (D8).
3. **Sweep.** `npx tsx tools/corpus/ts-layout-compare.ts --algorithms sporeOverlap,sporeCompaction --shards 4` on the worktree
   and on the T1 base snapshot (`ELK_MODELS_DIR`, `ELK_ORACLE_DIR` set; `--out` under `$TMPDIR`). Every case must have the same
   category and detail before and after (the #67 and #70 precedent).
4. **Further sites (D2, stop 8).** If a run overflows, take the repeating frame. An in-bundle frame is converted by the batch-2
   steps (test first). An out-of-bundle frame follows stop 8. Repeat step 1. Stop 7's budget applies.
5. **Docs.**
   - `docs/architecture/alg-packing.md` § 3.4 (`:337-370`): keep the PK6 probe paragraph and table as history; add that the six
     sites are explicit-stack loops (AC6, #76) with their test files, the T1 ladder result, the evidence of steps 1-3, the depth
     check, and that `ShrinkTreeCompactionPhase.draw` stays verbatim (D2) and why. Update the table's "Action" column or add a
     row note. Replace "Beyond 2,000 nodes: issue #76." In § 5 (`:443` on), remove the #76 row if both algorithms are done;
     otherwise point it at the close-out `follow-up`. Update the contents-table row (`:23`) if it names #76 as open.
   - `docs/conformance.md`: the chain-row bullet (`:2385-2389`), and the AC6 list (`:957`), where you add the spore sites next
     to the trees' and force/disco pointers (`:1959`, `:2126`).
6. `plans/alg-packing/decision-journal.md`: append one closing row (date, `#76`, `close`): the six sites, `D_oracle` per
   algorithm, and the evidence. Never edit an earlier row.
7. **#167 comment** (`gh issue comment 167`): name the six new `checkStackDepth` call sites (D7), that none of the six walks
   can run without end (acyclic trees built by `addNode`), and that `compactTree` and `growAt` still have no check (Q3).
8. Run `npx prettier --check` on the changed docs and `npm run docs:build`.

## Read-set

The T1 journal rows and the T2 and T3 reports; `docs/architecture/alg-packing.md:1-30, 337-370, 443-470`;
`docs/conformance.md:955-960, 1957-1962, 2124-2130, 2383-2390`; `plans/alg-packing/decision-journal.md` (last rows, for the
format); `docs/architecture/alg-force-disco.md` § 5 (how #70 wrote the same result).

## Write-set

`docs/architecture/alg-packing.md`, `docs/conformance.md`, `plans/alg-packing/decision-journal.md` (one appended row), the
journal; a further site's source and test file (step 4, journaled).

## Acceptance criteria

- Given the converted port, when the two final runs finish, then each is `ok` on the default stack, equal to the oracle at
  1e-6 and byte-identical to its D5 reference. Any exception is a journaled partial with its `follow-up`.
- Given the sweep before and after, when compared, then every spore case has the same category and detail.
- Given the docs, when read, then no sentence says the six walks are verbatim or that the port's limit is below the oracle's
  beyond 2,000, unless an algorithm is still a partial (then the sentence names the follow-up).
- Given #167, when T4 ends, then it carries a comment naming the six call sites.

**Observability:** N/A. **Rollback:** Reversible.
