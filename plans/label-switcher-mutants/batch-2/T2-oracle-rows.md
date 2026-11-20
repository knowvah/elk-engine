<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: design and record the discriminating site rows

## Context

T1's survivors each need an oracle-recorded graph on which the mutant's result differs from the original (AD-13: the
oracle decides the expected value). The recorder already has the helpers: `kn(id, w, h, extra, opts…)` for a node of
a given size, `labelled(id, src, tgt, w)` for an edge with a center label of width `w`, `edl` for an unlabelled edge,
`ropts(CENTER_STRATEGY, "SPACE_EFFICIENT_LAYER")` and `site(id, elk, stop, terminal, manager)`
(`LayeredLabelsVectors.java:2112,2881,2929,3006-3010`). Layers come from the chain (longest path), and a long edge's
label dummy can move within its dummy range.

## Read-set

`plans/label-switcher-mutants/mutants.md` (T1's output); `tools/vectors/LayeredLabelsVectors.java` (header usage,
`labelSites`, `site`, `kn`, `labelled`); `tools/vectors/layered-labels-vectors.sh`; `src/alg/layered/LayeredLabelsVectors.test.ts`;
`test/helpers/layered-labels-replay-*.ts`; decisions D4, D7.

## Write-set

`tools/vectors/LayeredLabelsVectors.java` (new `site(...)` calls after Sc13 in `labelSites()`, with one comment line
each naming the mutants the row targets), `test/golden/refs/java/layered-labels.json` (by script only),
`src/alg/layered/LayeredLabelsVectors.test.ts` (the `sites:` literal at `:123` only, D4),
`plans/label-switcher-mutants/{mutants,decision-journal}.md`. Scratch under `$TMPDIR/lsm-rows/`.

## Steps

1. Design graphs from T1's hints. Before recording, check each graph in the scratch copy: run the TS pipeline
   with the mutant applied and without it, and confirm that the label dummy layers (or the `assignLayer` order)
   differ. This shows which mutants a graph can discriminate. It is not an expected value.
2. Add the rows to the recorder. Check `uptime`, then run it cold:
   `nohup nice -n 10 bash -c 'ELK_VECTORS_CACHE=off tools/vectors/layered-labels-vectors.sh "$TMPDIR/lsm-rows/out"; echo "exit $?"' >"$TMPDIR/lsm-rows/cold.log" 2>&1 &`.
   Poll for at most 9 minutes per poll. Run it a second time (warm) and `cmp` the two outputs.
3. Append-only proof (D4): a `node` script under `$TMPDIR` loads the base ref
   (`git show <base>:test/golden/refs/java/layered-labels.json`) and the new output, and checks for every base row
   id that `JSON.stringify` of the row is identical, that the header fields other than `rowCounts.sites` are identical,
   and that the new ids are exactly the planned set. Any difference is stop 4. Journal the script's output, the byte
   sizes and the new `rowCounts`.
4. Copy the output over the ref. Update `LayeredLabelsVectors.test.ts:123`'s `sites` value to the header's, and
   journal an `ad13` row with old → new and the reason (D4).
5. Run `LayeredLabelsVectors.test.ts`: every new row must replay. A failure is stop 5 (diagnosis mode).
6. If a survivor still has no discriminating graph after two designs, apply D6 (equivalence) or stop 6.

## Interface contracts

To T3: the list of new row ids, and for each the mutants it is meant to kill and the recorded layer of each label
dummy (read from the row).

## Acceptance criteria

- Given the recorder, when run cold and then warm, then both outputs are byte-identical and under 16 MiB.
- Given the base ref, when the append-only script runs, then 0 pre-existing rows differ and only `rowCounts.sites`
  changes in the header.
- Given `LayeredLabelsVectors.test.ts`, when run, then all rows, old and new, pass, and the only edited literal is
  `sites` at `:123`.
- Given each new row, then the scratch check showed it discriminates at least one T1 survivor.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit. The ref is regenerated only by the script.
