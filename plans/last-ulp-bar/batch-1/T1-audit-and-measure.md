<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: audit, inputs and measurement

**Agent:** orchestrator. **Budget:** 80 min (stop 11).

## Context

#74 asks for every existing last-ulp known-divergence entry to carry a measured maximum positional delta and a pinning
test. The planning inventory is in [decisions.md § D2](../decisions.md#d2-audit-scope-and-classes). The 8b experiment that
found E2's mechanism did not commit its 491 inputs (`plans/alg-force-disco/decision-journal.md:52`), so they are
collected again here.

## Task

1. **Enumerate.** Run the D2 grep. Add every entry it finds beyond E1-E5 to the inventory. Journal one `audit` row: entry,
   locations (`file:line`), the documented mechanism and its evidence source.
2. **E1 measure.** Read the oracle output of `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` from the
   sweep cache (`resolveSweepDir` in `tools/corpus/ts-layout-pipeline.ts`; at planning
   `~/git/knowvah/elk-oracle/sweep/8bca22f4…-ac5af2ba…/`, `run-a/`). Lay the case out in TS the way
   `tools/corpus/ts-layout-compare.ts` does and compute the D3 delta with a scratch script in `$TMPDIR`. Journal the value,
   the file and its SHA-256, and whether ids and counts are equal.
3. **Inputs.** With temporary instrumentation in `$TMPDIR` only (a scratch copy or a wrapper of `Math.sin`/`Math.cos`
   recording the calling `src` line, as the TP7 evidence run did; never an edit under `src/`), collect:
   - E1: the inputs of every `Math.sin`/`Math.cos` call from `src/alg/radial/p1position/EadesRadial.ts:79-80` during the
     E1 layout (push-forward: all trig inputs of the layout if cheap).
   - E2: the inputs of `Math.sin`/`Math.cos` from `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:55-58` over
     every `stops` row of `test/golden/refs/java/disco.json` (88 runs at 8b; journal the count found).
   Write them, de-duplicated and sorted, to `tools/vectors/last-ulp-inputs.txt`: an SPDX header (`#`), a comment naming
   how they were collected, then `<entry> <sin|cos> <16 hex digits>` per line. Check 8b's counts (160 `sin`, 160 `cos`)
   and journal any difference.
4. **E2 measure.** Replay the six `import` stops (`multi6/spacing60`, `multi6/combo2`, `bends/{default,thickness3,
   thickMixed,junctions}`) through `test/helpers/disco-replay-dump.ts` in a scratch script and compute the D3 delta over
   every numeric field. Journal it and the count of fields that are not bit-identical (32 at 8b).
5. **E3-E5.** Confirm each `no-divergence` reading with the evidence already in the repo (`plans/alg-force-disco/
   decisions.md:76-84`, `src/java/lang/JavaMath.ts` and its vectors, the call-site table). Do not run new experiments
   for them.
6. **Classify.** Journal one `audit` table: entry, class (D2), mechanism evidence, measured delta, next step. Any `fails`
   goes to stop 4 now (file the `needs-ruling` in T5's step 1 list, or at once if it blocks T3).

## Write-set

`tools/vectors/last-ulp-inputs.txt` (new), `plans/last-ulp-bar/decision-journal.md`. Scratch files only under `$TMPDIR`.

## Read-set

`docs/conformance.md:196-298`, `:1992-2030`, `:2135-2178`, `:2470-2480`; `tools/corpus/ts-layout-compare.ts`,
`tools/corpus/ts-layout-pipeline.ts`; `test/helpers/disco-replay-dump.ts`; `src/alg/disco/DiscoVectors.test.ts:1-60`;
`src/alg/radial/p1position/EadesRadial.ts:60-115`; `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:35-60`.

## Interface contract (output, consumed by T3 and T4)

- `tools/vectors/last-ulp-inputs.txt`: lines `^(E[0-9]+) (sin|cos) ([0-9a-f]{16})$` after `#` comments; entries named as
  in the audit table.
- Journal `audit` rows: per entry, class, measured delta (a decimal with 3 significant digits and its exponent), the set
  of divergent fields (E1: the field paths; E2: count and stop ids).

## Acceptance criteria

- Given the D2 grep, when T1 ends, then every hit is an entry in the audit table or is journaled as not an entry, with why.
- Given E1, when the TS layout is compared with the sweep's oracle output, then the journal holds the D3 delta and the
  exact list of 1e-6 diffs (planning: one, `layoutOptions.childAreaHeight`).
- Given the disco `stops` rows, when the inputs are collected, then the file holds each distinct `sin`/`cos` input once
  and the journal states the counts against 8b's 160/160.
- Given E2, when the import stops are replayed, then the journal holds the D3 delta over every numeric field.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (the input file and journal rows).
