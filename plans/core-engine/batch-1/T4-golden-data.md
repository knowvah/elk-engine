<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Golden data: algorithm golden set, vendored inputs, refs, `applyOverlay`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T4): add fixed, box and random oracle goldens`

## Context
M4 and M6. Expected values come from the oracle **before** the providers exist (AD-13). The existing golden set
(`test/corpus/manifest.json`, `test/golden/refs/elk/`) is frozen at 3–5 entries (`test/corpus/corpus.test.ts:96`)
and feeds the docs showcase, so it is not touched: this task adds a **separate set** `test/golden/algorithms.json` →
`test/golden/refs/elk-algorithms/`. The oracle harness already supports retarget and variants
(`tools/oracle/README.md` "Run", `tools/oracle/harness/GraphOverlay.java`: variant at the root, then the algorithm on
every node with children). Random seeds only the root, so random goldens use flat models and a new
`random-seed-1` variant. The oracle sweep status per model (`docs/parity-report.md`, local sweep if present) shows
which models are `ok` per algorithm.

## Task
1. `tools/oracle/regen-goldens.sh`: add `--set algorithms` (manifest `test/golden/algorithms.json`, refs
   `test/golden/refs/elk-algorithms/`). Without the switch the behaviour and output stay byte-identical; prove it by
   running the default set and `git diff --exit-code test/golden/refs/elk/`. Models commit comes from
   `test/corpus/manifest.json` in both sets.
2. `test/corpus/variants.json`: add `"random-seed-1": {"org.eclipse.elk.randomSeed": 1}` (check the option id in the
   generated `CoreOptions.ts`/`Random.melk`; the corpus sweep passes its own variant list, so it is unaffected —
   verify in `tools/corpus/sweep.ts`).
3. `test/golden/algorithms.json`: ~3 entries each for `org.eclipse.elk.fixed`, `org.eclipse.elk.box`,
   `org.eclipse.elk.random` (`retarget` = `algorithm`), chosen per decisions.md#m4--goldens (≤ 30 nodes, oracle `ok`;
   fixed and box ≥ 1 hierarchical each; random flat with `random-seed-1`; fixed avoids multi-section edges). Ids
   `<algorithm>-<model>` kebab-case; one-line `note` each with node/port/label/edge counts.
4. Vendor each input under `test/golden/inputs/<same path as in elk-models>`, plus the three `tickets/core` `.elkt`
   files of M6. Record each file's sha-256 and the models commit in `test/golden/inputs/manifest.json`.
5. Run `tools/oracle/regen-goldens.sh --set algorithms` twice; refs must be byte-identical (stop 7 otherwise).
   Journal the run with the patch ids from `_meta.json`.
6. `test/golden/algorithm-refs.test.ts`: entries valid (`isGoldenEntry` from `test/corpus/corpus.ts`), exactly one ref
   per id, each ref compares equal to itself and has geometry everywhere (mirror `test/golden/oracle-refs.test.ts`;
   reuse its exported helpers, do not edit that file), vendored inputs match their recorded sha-256.
7. `test/helpers/graph-overlay.ts`: `applyOverlay(root, algorithm, variant)`, a line-by-line port of
   `GraphOverlay.java` on the TS ElkGraph (variant options parsed through `LayoutMetaDataService` option data as the
   Java does). Unit-test it on built graphs.

## Write-set
`tools/oracle/regen-goldens.sh`, `test/golden/algorithms.json`, `test/golden/algorithm-refs.test.ts`,
`test/corpus/variants.json`, `test/golden/inputs/**`, `test/golden/refs/elk-algorithms/**`,
`test/helpers/graph-overlay.ts` (+ test).

## Read-set
`tools/oracle/{README.md,regen-goldens.sh,run.sh}`, `tools/oracle/harness/{GraphOverlay,CaseRunner}.java`,
`test/corpus/{corpus.ts,manifest.json,variants.json}`, `test/golden/oracle-refs.test.ts`, `docs/parity-report.md`,
`.agent-notes/conformance-corpus.md`, `.agent-notes/elkgraph-model.md:105-117` (Fixed multi-section bug).

## Interface contracts (outputs)
`applyOverlay(root: ElkNode, algorithm: string | null, variant: string | null): void` (throws like `OracleFault`
for an unknown variant/algorithm/option); `test/golden/algorithms.json` `{ "golden": GoldenEntry[] }`;
`test/golden/inputs/<path>`. Consumed by T17, T19.

## Acceptance criteria
- Given the default set, when `regen-goldens.sh` runs, then `test/golden/refs/elk/` is byte-identical to `main`.
- Given `--set algorithms`, when run twice, then `test/golden/refs/elk-algorithms/` is byte-identical between runs and
  `_meta.json` lists the ELK commit, models commit and patch ids.
- Given a two-level graph and `applyOverlay(root, 'org.eclipse.elk.box', 'default')`, when run, then every node with
  children (root included) has `algorithm = org.eclipse.elk.box` and leaves have none.
- Given each vendored input, when its sha-256 is computed, then it equals the recorded value.
- `npm test` stays green; `corpus.test.ts` and `oracle-refs.test.ts` unchanged.

## Observability / Rollback
N/A — test data and a dev script. Reversible: revert the commit.
