<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12: the local export sweep and the docs

**Owner:** orchestrator. **Budget:** 120 min, most of it the detached sweep. **Commit:** `docs(graphviz-dot): document the
dot port and its sweep`.

## Steps

1. Check `uptime` (wait while it is above 12). Start `tools/oracle/dot-export-sweep.sh` detached under `nice -n 10` over all
   elk-models `.elkt` (D6), with the exit code as the log's last line. Poll for at most 9 minutes at a time.
2. While it runs, write the TS side of the comparison, if T3 did not: `tools/oracle/dot-export-compare.ts` loads each model
   with `ElkGraphText.load` (CoreOptions-only registry), runs the TS `DotExporter.transform`, serializes unformatted, and
   compares the text byte for byte with the oracle's file. It also parses the text back with `GraphvizDot.load` and compares
   the model with the oracle's parse-back if T3 recorded one. Verdicts go under `$ELK_ORACLE_DIR/sweep/dot-export/`. No test
   file is needed for a `tools/` comparer that is not under coverage, unless the coverage include list covers `tools/` (check
   `vitest.config.ts`).
3. Run the comparison. Every mismatch class gets diagnosis mode (mechanism, origin, causal chain, ruled out). A fix lands in the
   owning file with a new unit test and a journal row, if it stays in the README's file table. Otherwise stop 1. Stop 10
   bounds the diagnosis.
4. Docs:
   - `docs/architecture/graphviz-dot.md` (new): what the bundle is, the D1 port map summary, the `GraphvizDot` entry point
     (D5), the autowrap extension (D3), the evidence (D6) with the refs and the sweep runbook, the omissions, and what step 3
     will consume. Add it to the index table of `docs/architecture/overview.md`.
   - `inventory.md`: the two Graphviz rows' status (`alg.graphviz.dot` ported; `alg.graphviz.layouter` pending, #95 step 3).
     Re-sum the hand-maintained totals if the status column feeds them (`.agent-notes/deferred-bundles-acceptance.md`).
   - `port-map.md`: the `src/alg/graphviz/dot/` rows.
   - `docs/conformance.md`: the bundle's evidence (refs, row counts, sweep counts), the syntax-error presence-only divergence
     (D4, as #1 for `.elkt`), and the D7 note (refs without a pin stamp, #173).
   - `docs/translation-rules.md`: only if `StringTokenizer` or the model pattern needs a new row.
5. `npm run docs:build`; `npm run format:check`. Commit.

## Acceptance criteria

- Given the sweep, when complete, then the journal records the number of models, the exported count, the exception count with
  matching exceptions, the byte-identical count, and each mismatch class with its mechanism or a `follow-up` issue.
- Given `npm run docs:build`, when run, then it passes with the new page reachable from the overview index.
- Given `docs/conformance.md`, when read, then it lists the six refs with row counts and the sweep result.

**Observability:** N/A. **Rollback:** reversible.
