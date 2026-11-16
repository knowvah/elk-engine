<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: examples with oracle-backed expected output

**Agent:** `typescript-pro` (sonnet) writes examples and the test; the orchestrator authors the inputs' oracle refs with
the regen script and commits. **Decisions:** DP4, DP2. **Commit:** `test(docs): runnable examples against oracle goldens`.

## Write-set

- `test/docs/examples/<name>.ts` (new, 2-3 files): each exports one function returning the laid-out graph (or its ELK
  JSON), imports only from `@knowvah/elk-engine`, and is short enough to read on a page (aim ≤ 40 lines). Suggested:
  `build-and-layout.ts` (ElkGraphUtil, layered), `json-roundtrip.ts` (ELK JSON in, layout, JSON out), optionally one
  non-layered algorithm.
- `test/golden/examples-inputs/<id>.json` (new): each example's graph as ELK JSON, laid out by the oracle.
- `test/golden/examples.json` (new): manifest rows in the shape of `test/golden/packing.json`.
- `tools/oracle/regen-goldens.sh`: a `--set examples` case (inputs from `test/golden/examples-inputs/`, refs to
  `test/golden/refs/elk-examples/`, `-XX:hashCode=2` like the layered set if layered is in it); update the usage text and
  the `die` message.
- `test/golden/refs/elk-examples/*` (new, by the script only, with `_meta.json`).
- `test/docs/examples.test.ts` (new).

## Read-set

- `decisions.md#dp4`, `stop-conditions.md` items 4-6
- `tools/oracle/regen-goldens.sh` (whole file; the `packing`/`trees` cases are the model for in-repo inputs)
- `test/golden/packing-goldens.test.ts` (how TS lays out an input and compares with a ref), `test/golden/compare-json.ts`,
  `test/helpers/graph-json-oracle.ts` (`exportLikeOracle`)
- `test/public-api/candidate-index.ts` (what examples may import)
- `.agent-notes/text-sizing-seam.md` (regen and oracle-staleness observations)

## Steps

1. Write the input twins and the manifest. Check the oracle stamp (README step 5), check `uptime`, then run
   `nice -n 10 tools/oracle/regen-goldens.sh --set examples`; journal the command, patch ids in `_meta.json`, and time.
   These refs exist **before** the test asserts on them (AD-13).
2. Write `examples.test.ts`: for each example, (a) its graph before layout, exported as ELK JSON, equals the twin
   (structure: ids, children, ports, labels, edges, options); (b) its laid-out output equals the ref at 1e-6 through
   `compare-json.ts`. Then write the examples until it passes.
3. On any mismatch beyond 1e-6: diagnosis mode (stop 6). On an example the oracle cannot lay out: drop it (stop 5).
4. Rerun every other set of `regen-goldens.sh` (`default algorithms layered trees force-disco packing`), detached,
   and confirm `git diff --exit-code -- test/golden/refs/` apart from `elk-examples/`; journal it (queue gate 6).

## Interface contracts (outputs)

- `test/docs/examples/*.ts` paths, consumed by T4's snippet imports and T7's `--entry` layout check (T7 uses the first
  example's input twin and ref).

## Acceptance criteria

- Given the examples set, when `regen-goldens.sh --set examples` runs, then it writes refs and `_meta.json` naming the pin
  and patches 0001-0003, and a second run is byte-identical.
- Given each example, when `examples.test.ts` runs, then the pre-layout graph equals its twin and the output equals the
  oracle ref at 1e-6.
- Given the six existing sets, when regenerated, then `test/golden/refs/` outside `elk-examples/` has no diff.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (delete the set, the case and the files).
