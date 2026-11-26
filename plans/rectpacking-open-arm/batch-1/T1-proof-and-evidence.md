<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: prove or break L1-L5, then support the result

**Owner:** orchestrator. **Budget:** 90 min for the proof, 60 min for the search, 30 min for the cross-check (stop 8).

## Context

[D1](../decisions.md#d1-try-the-proof-first-from-a-planning-hypothesis) holds the hypothesis and its five lemmas, and
[D2](../decisions.md#d2-supporting-evidence-for-a-proof) the supports. #81's body gives 8c's search, measured at `8aaa3c14`.
`plans/alg-packing/unreached.md:83` holds the open row. 8c's search notes are at `plans/alg-packing/decision-journal.md:71-72`.

## Read-set

All Java paths are under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/` at
`8bca22f4`:

- `p2packing/Compaction.java` (whole file; the arm is `:364`)
- `p2packing/RowFillingAndCompaction.java` (`start`, `:96-153`)
- `p2packing/InitialPlacement.java`
- `util/Block.java`, `util/RectRow.java`, `util/BlockStack.java`, `util/BlockRow.java`
- `RectPackingLayoutProvider.java` and `p2packing/Compactor.java`: the callers of `RowFillingAndCompaction.start`, and which
  graph's children reach it
- the port mirrors: `src/alg/rectpacking/p2packing/{Compaction,CompactionPlacement,CompactionContext,InitialPlacement,RowFillingAndCompaction}.ts`
  and `src/alg/rectpacking/util/{Block,RectRow}.ts`
- `tools/vectors/RectPackingVectors.java:1536-1566` (`armSpecs`, `arm`): the input shape, and the precedent for negative spacing
  in rows

## Write-set

- `plans/rectpacking-open-arm/decision-journal.md` (rows only)
- `$TMPDIR/rectpacking-open-arm/**` (scratch, never committed)

## Steps

1. **Mission start rows.** Journal the base sha, the oracle state (stop 2) and upstream drift (stop 3).
2. **Proof.** For each lemma L1-L5, write a journal row (kind `lemma`) with the claim, the Java lines that prove it, and either
   `holds` or `false` with the counter-trace. For L2 and L4, run the `sg` enumerations of D2.1, each with its positive control,
   and paste the hit lists (file:line). Also check the gaps the planning read did not close:
   - Any `rows.add`, `rows.set` or reorder in `Compaction` or `RowFillingAndCompaction` that could put a compacted row after
     `rowIdx`.
   - Whether `Compactor` calls `start` more than once on the same `Block` objects (`InitialPlacement.place` builds new rows on
     each call).
   - Whether `block` in `absorbBlocks` can be a block of another row. It is `blocks.get(blockId)` of `row.getChildren()`. Check
     that the list is not replaced mid-loop.
   - `RectRow.equals`: identity (no override) means `wasFromNextRow` compares objects.
   - Whether any other `Block` mutator can grow a block of a later row: `expand`, `setHeight` and `setWidth` change sizes, not
     rects. Check whether a size change alone can break L5. L5 depends only on `children`.
3. **Search (D2.2).** Build the snapshot and the instrumentation, run the positive control, then run at least 100,000 flag-on
   inputs under a per-input kill timer. Journal the generator, the seeds, the counts (inputs, timeouts, flag-on `placeBeside`
   calls, calls with `shouldRowHeigthBeReevalauted` true, violations, arm hits) and the harness text needed to rerun it.
4. **Cross-check (D2.3).** Run at least 1,000 inputs from step 3 that set `shouldRowHeigthBeReevalauted` true on the oracle and on
   the unmodified port. Compare at 1e-6. Journal the tool, the counts and any stop-7 diagnosis.
5. **Result row.** One `result` row naming the branch (D3, D4 or D5), with links to the lemma rows and counts.

Under D4 (a lemma false or an arm hit), T1 also shrinks the input and runs the oracle reach probe of D4 before the result row.

## Acceptance criteria

- Given the Java at `8bca22f4`, when T1 ends, then every lemma L1-L5 has a journal row with file:line evidence and `holds` or
  `false`.
- Given the `sg` patterns for L2 and L4, when they run, then each has a positive control that finds a known call, and the hit
  lists are journaled verbatim.
- Given the instrumented snapshot, when the forged-block control runs, then the arm counter reads at least 1. When the
  100,000-input search runs, then violations and arm hits are reported as numbers, with zero expected under D3.
- Given at least 1,000 searched inputs, when the oracle and the port lay them out, then each pair is equal at 1e-6, or a stop-7
  diagnosis is journaled.
- Given the evidence, when T1 ends, then exactly one `result` row names D3, D4 or D5.

## Observability

The journal rows above are the only observability. The scratch harness writes logs under `$TMPDIR/rectpacking-open-arm/logs/`.
Start long runs detached with `nohup nice -n 10 bash -c '…; echo "exit $?"'` and poll for at most 9 minutes at a time.

## Rollback

Reversible. T1 commits nothing but journal rows, and the scratch directory is deleted with `$TMPDIR`.
