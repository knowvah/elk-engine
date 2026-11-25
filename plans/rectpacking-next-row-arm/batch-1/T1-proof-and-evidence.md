<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: prove or break N1-N4, then support the result

**Owner:** orchestrator. **Budget:** 45 min for the proof, 60 min for the search and mutant control, 30 min for the cross-check
(stop 8).

## Context

[D1](../decisions.md#d1-prove-first-from-invariant-i) holds the hypothesis and its four lemmas, and
[D2](../decisions.md#d2-supporting-evidence) the supports. Invariant **I** and the enumerations it rests on are in
`plans/rectpacking-open-arm/evidence.md` § 2 L4 and § 3. #107's body gives the history of the two `staleParentRow` rows.

## Read-set

Java paths are under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/` at `8bca22f4`:

- `p2packing/Compaction.java:54-222` (`compact`, `getNextBlock`), `:263-285` (`absorbBlocks`), `:298-425` (`placeBelow`,
  `placeBeside`)
- `p2packing/RowFillingAndCompaction.java` (`start`), `p2packing/InitialPlacement.java:99-116` (`placeRectInBlock`)
- `util/RectRow.java` (`addBlock`, `removeBlock`, no `equals`), `options/InternalProperties.java:41-42` (`ROWS`)
- `plans/rectpacking-open-arm/evidence.md` § 2 L3-L4, § 3 E2, E3, E6, E8, § 4-6 (search, cross-check, harness texts)
- Port mirrors: `src/alg/rectpacking/p2packing/{Compaction,CompactionPlacement,CompactionContext}.ts`
- `tools/vectors/RectPackingVectors.java:1536-1566` (`armSpecs`, `arm`; the `staleParentRow` inputs at `:1559-1561`)

## Write-set

- `plans/rectpacking-next-row-arm/decision-journal.md` (rows only), `plans/rectpacking-next-row-arm/evidence.md` (new)
- `$TMPDIR/rectpacking-next-row-arm/**` (scratch, never committed)

## Steps

1. **Mission start rows.** Journal the base sha, the oracle state (stop 2) and upstream drift (stop 3).
2. **Proof.** For each of N1-N4, write a journal row (kind `lemma`) with the claim, the Java lines, and `holds` or `false` with
   the counter-trace; the full text goes to `evidence.md` § 2. Then:
   - Confirm that the proof of **I** uses neither `rowHeightReevaluation` nor L1-L3's flag-on facts. If it does, re-prove **I**
     for the flag off.
   - Rerun E2, E3, E6 and E8 at the pin and state that the hit lists equal #81's.
   - New enumerations, each with a positive control: every call that passes `rows` (`$F($$$A, rows, $$$B)` and the
     method-reference forms); every `InternalProperties.ROWS` access; every call of `RectRow.removeBlock` and what it writes.
   - Check that `rows` is the same object from `:54` to `:416` (a `final` parameter) and that no callee between `:98` and the
     calls receives it.
3. **Search (D2.2).** Build the snapshot and the instrumentation, then run at least 100,000 seeded inputs under a per-input
   watchdog. Journal the generator, the seeds, and the counts: inputs, timeouts, `removeFromNextRow` calls per site and per flag
   value, false-arm hits, invariant violations. Harness texts go to `evidence.md`.
4. **Mutant control (D2.3).** Run the `staleParentRow` inputs through the mutant snapshot, then fall back as D2.3 says. Journal
   the counter.
5. **Cross-check (D2.4).** Run at least 1,000 inputs from step 3 on the oracle and the unmodified port. Compare at 1e-6. Journal
   the tool, the counts and any stop-7 diagnosis.
6. **Result row.** One `result` row naming D3, D4 or D5, with links to the lemma rows and counts.

Under D4, T1 also shrinks the input and runs the oracle reach probe of D4 before the result row.

## Acceptance criteria

- Given the Java at `8bca22f4`, when T1 ends, then N1-N4 each have a journal row with file:line evidence and `holds` or `false`,
  and a row states whether **I** holds without the flag.
- Given every new "only" claim, when its `ast-grep` pattern runs, then a positive control finds a known call, and the hit list is
  in `evidence.md` verbatim.
- Given the search of at least 100,000 inputs, when it ends, then false-arm hits and violations are reported as numbers (zero
  expected under D3), and each site was reached at least 1,000 times under each flag value.
- Given the mutant snapshot, when the control runs, then the false-arm counter reads at least 1, or the fallback is journaled.
- Given at least 1,000 searched inputs, when the oracle and the port lay them out, then each pair is equal at 1e-6, or a stop-7
  diagnosis is journaled.

## Observability

N/A — no new observable operations. The journal rows are the record; the harness logs go to
`$TMPDIR/rectpacking-next-row-arm/logs/`. Start long runs detached with `nohup nice -n 10 bash -c '…; echo "exit $?"'` and poll
for at most 9 minutes at a time.

## Rollback

Reversible. T1 commits nothing but plans text, and the scratch directory is deleted with `$TMPDIR`.
