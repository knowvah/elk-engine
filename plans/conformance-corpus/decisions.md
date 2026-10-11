<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — conformance-corpus (locked 2026-10-11)

All approved by the user during planning. These amend, never rewrite,
`plans/elk-engine-skeleton/decisions.md`.

| ID | Decision |
|----|----------|
| D0 | Bundle scope amendment (supersedes the skeleton's "Bundle scope" for these bundles) |
| D1 | Conformance unit = layout algorithm |
| D2 | Retarget overrides every node with children |
| D3 | Model id and source format |
| D4 | Verdict vocabulary |
| D5 | Determinism = two separate JVM runs |
| D6 | Variants = named option overlays |
| D7 | Generated models committed with their inputs |
| D8 | Grammar port approach (+ known divergence #1) |
| D9 | Commit a generated parity report |
| D10 | `.elkt` writer in mission 4b |
| OR-1 | Retarget tier runs the `default` variant only |
| OR-2 | Per-case timeout and `timeout` verdict |

## D0 — Bundle scope amendment

- **In scope:** `graph.text` (`.elkt`), `graph.json.text` (`.elkj`), `core.debug.grandom`
  (`.elkr`, random graph generator).
- **Deferred:** `graph.text.ide`, `graph.json.text.ide`, `core.debug.grandom.ide` (content
  assist; needs a browser-editor host decision).
- **Reference only** (read for ideas, never ported line by line, no `@see`): `core.debug`,
  `alg.disco.debug`.
- **Out:** `graph.text.ui`, `graph.json.text.ui`, `core.debug.grandom.ui`.
- Why: 898 of the corpus models exist only as `.elkt`; ELK's shared test framework `alg.test`
  requires `graph.text` and `core.debug.grandom` (`docs/architecture/inventory.md:74`).
- CLAUDE.md already carries this text (edited during planning; T1 commits it).

## D1 — Conformance unit

A case is `(algorithm, model, variant)`. The dashboard has one row per algorithm, as
dot-engine has one per engine. elk-models folder and census features are filters, not rows.
Corpus tiers: **native** (models as written), **retarget** (algorithm overridden),
**generated** (grandom `.elkr`), and **ported JUnit** (per algorithm mission, AD-13).

## D2 — Retarget

Set `org.eclipse.elk.algorithm` on **every node that has children**, replacing any declared
value; also set `org.eclipse.elk.randomSeed = 1` on the root. Reason: ELK resolves the
algorithm per node and an unset node falls back to layered (`LayoutAlgorithmResolver.java:47-75`).

## D3 — Model id and source

Model id = path in elk-models without the extension (e.g. `tickets/layered/546_borderGaps`).
The case reads `.json` when one exists, else `.elkt`; `.elkg` (EMF XMI) is never read. Mission
4b gets a test that a realworld model's `.json` and `.elkt` parse to the same ElkGraph.

## D4 — Verdicts

`ok` · `throws` · `nondeterministic` · `oracle-error` · `timeout` (OR-2).
`throws` matches when the exception class is exactly equal and the message is exactly equal
after replacing identity-hash tokens (`@[0-9a-f]+`) with `@<hash>`. `oracle-error` is a harness
fault and never acceptable.

## D5 — Determinism

Every case runs in two separate JVM processes. Outputs must be byte-identical (or the same
`throws`), else `nondeterministic`. Nondeterministic cases are reported separately and
excluded from pass counts (matches the identity-hash policy in `docs/conformance.md` §2).

## D6 — Variants

Named option overlays in `test/corpus/variants.json`: `default` (no overlay), `direction-right`,
`direction-left`, `direction-down`, `direction-up`, `hierarchy-separate`
(`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`). Applied at the root.

## D7 — Generated models

Commit the `.elkr` config, its `seed`, and the oracle-generated `.json` input under
`test/corpus/generated/`. Each graph has at most 50 nodes and edge labels off
(`BlindTextGenerator` is unseeded, `RandomGraphGenerator.java:1248`). The TS grandom port
(mission 4d) must reproduce these inputs byte for byte; algorithm goldens never depend on it.

## D8 — Grammar port approach

One hand-written recursive-descent parse method per Xtext rule; the generated ANTLR parser is
never ported. Xtext's common Terminals and `STRING` escape handling are ported from Xtext
source (EPL, allowed; not OpenJDK). Valid input must match exactly.
**Known divergence #1 (approved):** for invalid input only the *presence* of a parse failure
must match, not the message text (ANTLR messages are generated-parser artifacts). T10 adds this
entry to `docs/conformance.md`.

## D9 — Parity report

`docs/parity-report.md` is generated and committed: counts per algorithm, with the ELK and
models commits and no timestamps, so a rerun with nothing changed is a git no-op. Per-case
outputs stay local under `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/` (AD-5).

## D10 — `.elkt` writer

Mission 4b ports `ElkGraphFormatter` and the serializer; checked by an oracle round trip
(ElkGraph → `.elkt`, byte-exact). Recorded here so T1's roadmap entry says so.

## OR-1 — Retarget variant

The retarget tier runs only `default`; native and generated tiers run all D6 variants.
Estimate: ~19k cases × 2 runs ≈ 38k layouts.

## OR-2 — Timeout

Per-case timeout `ELK_SWEEP_TIMEOUT_MS` (default `30000`, read only by `tools/`). Cases run in
batched JVMs; a JVM with a timed-out case is abandoned and the batch resumes in a new JVM.
Verdict `timeout`.

## Brief refinements (approved by the user 2026-10-11)

Added while writing the task specs; approved after Phase 8. They are binding like D0–D10.

1. `GoldenEntry` gains an optional `retarget` field (T7); `regen-goldens.sh` passes
   `algorithm` to the oracle only when it is set, so the four existing goldens stay byte-identical.
2. T6 owns `tools/oracle/regen-generated.sh`; generated inputs are produced by script only.
3. Generated files are named `<algorithmSuffix>-<shape>.elkr`; the sweep runs each under that
   algorithm (T8).
4. The retarget tier skips each model's own `rootAlgorithm`; the native tier covers it (T8).
5. The uncovered set is 8 algorithm ids for 7 algorithms (spore has `sporeOverlap` and
   `sporeCompaction`); T6 confirms the exact list via `--list-algorithms`.
6. T3 records all three D0 jars (`graph.text`, `graph.json.text`, `core.debug.grandom`) in
   `oracle-build.json`, because T6 needs the grandom jar and cannot write `build.sh`.

## Amendments during execution (approved by the user 2026-10-11)

- **D5a — output identity hashes.** Before the run A/B comparison, every `@[0-9a-f]+` token in
  both outputs is replaced by `@<hash>` (the D4 message rule, applied to outputs). Reason: disco's
  programmatic `debug.discoGraph` option exports `…DCGraph@<identity hash>`, which no seed can
  pin. Mission 9's TS comparator applies the same replacement.
- **D5b — seeded exporter.** ELK's `JsonExporter` resolves id collisions with
  `"_g" + new Random().nextInt(1000000)` (unseeded, `JsonExporter.xtend:489,505`). A seam patch
  makes it seedable through the system property `org.eclipse.elk.graph.json.exportSeed`
  (unset = ELK's behavior); `run.sh` passes `1`. Proven repeatable across JVMs; the TS `Random`
  shim reproduces the stream (seed 1 → 548985, 764588). The `graph.json` TS port must take an
  injectable `Random` as the paired seam.
- **D2 unchanged.** Retarget seeds only the root; `random`'s nested composites keep its default
  seed 0 (unseeded) — a genuine ELK behavior, reported as `nondeterministic`.
