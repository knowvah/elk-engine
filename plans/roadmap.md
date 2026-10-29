<!-- SPDX-License-Identifier: EPL-2.0 -->

# Roadmap: elk-engine port after the skeleton

Each row becomes one `/plan-mission` input. Order is dependency order: no mission depends on a
later one, and it follows `test/architecture/bundle-deps.json` (graph, then core, then alg.common,
then every algorithm; `graph.json` needs core and graph). Java LOC are `wc -l` over hand-written
`.java`/`.xtend` in `docs/architecture/inventory.md` and `docs/architecture/port-map*.md`, tests
excluded unless stated. Task counts are rough (about one task per 600-800 Java LOC plus its
ported tests, to be re-estimated by each `/plan-mission`); they are not commitments.

| # | Mission | Scope | Depends on | Size (Java LOC / est. tasks) | Exit criteria |
|---|---------|-------|------------|------------------------------|---------------|
| 1 | Java foundations completion | Close JVM-vector gaps, then the shims they gate: `JavaHashMap`, `l2i`, `fround`, `PriorityQueue`, string/double text, `src/guava/` | skeleton | 0 ELK LOC (shims) / ~10 | Every shim passes JVM vectors; CLAUDE.md corrected; gates green |
| 2 | Property system + ElkGraph model | `graph.properties`, ElkGraph classes (AD-11), `ElkGraphUtil`, `ElkReflect` | 1 | 11,449 (+161 test) / ~18 | `graph` tests ported and green; `src/graph` imports only `src/java` |
| 3 | Core metadata slice + `.melk` codegen | `core.data`, `core.options`, `core.labels`, `tools/melk/` (AD-12), `CoreOptions` | 1, 2 | 4,263 + tool / ~14 | Generated `CoreOptions` equals oracle metadata dump |
| 4 | ELK JSON adapter | `graph.json` importer/exporter (Xtend to TS) | 2, 3 | 1,971 (+2,272 test) / ~8 | `graph.json` tests ported; round-trip equals oracle JSON |
| 5 | Core engine + simple providers | Rest of `core`; Fixed, Box, Random providers | 3, 4 | ~15,860 (+2,554 test) / ~22 | First TS layouts match committed goldens within 1e-6 |
| 6 | alg.common | Node spacing, compaction, network simplex, polyomino, spore utils | 5 | 14,677 (+1,715 test) / ~20 | `alg.common` tests ported and green; no algorithm imports |
| 7a | Layered: framework | Import/export, `graph`, `graph.transform`, options, intermediate enum | 6 | 11,864 / ~16 | Layered option set equals oracle dump; transform round-trip tests |
| 7b | Layered: p1 cycles, p2 layers | Cycle breakers, layerers | 7a | 4,182 / ~7 | Phase tests ported; layer assignment equals goldens |
| 7c | Layered: p3 crossing min | p3order, counting, greedyswitch, preserveorder | 7b | 7,633 / ~11 | Phase tests ported; node order equals goldens |
| 7d | Layered: p4 node placement | p4nodes, Brandes-Koepf, network simplex use | 7c | 4,792 / ~7 | Phase tests ported; y-coordinates equal goldens |
| 7e | Layered: p5 edge routing | Orthogonal, splines, polyline | 7d | 6,798 / ~10 | Phase tests ported; bend points equal goldens |
| 7f | Layered: intermediate processors | `intermediate` (52 files), unzipping | 7e | 13,920 / ~19 | Processor tests (27 files) ported; default-layered goldens match |
| 7g | Layered: loops, wrapping, compaction | loops.*, wrapping, intermediate.compaction, compaction.* | 7f | 10,773 / ~15 | Related tests ported; wrapped/compacted goldens match |
| 7h | Layered: components + compound | components, compound (hierarchy) | 7g | 4,120 / ~7 | All 97 `alg.layered.test` files ported and green |
| 8a | mrtree, radial, vertiflex | Three tree-style algorithms | 6 | 10,235 / ~14 | Ported tests green; per-algorithm goldens match |
| 8b | force (+stress), disco | Force-directed and component compaction | 6 | 4,645 / ~8 | Ported tests green; seeded goldens match |
| 8c | rectpacking, spore, topdownpacking | Packing, overlap removal, top-down | 6 | 7,127 / ~11 | Ported tests green; `NaiveMinST` tie-order goldens match |
| 9 | elkt corpus + parity dashboard | elkt-to-JSON oracle mode, full sweep | 4, 7h, 8c | tooling (no ELK LOC) / ~8 | 898 `.elkt` models converted; sweep reports per-model status |
| 10 | Text-sizing seams | First oracle patch + TS measurer seam | 5 | 0 (patch + seam) / ~5 | Patch, TS seam, goldens regenerated; sizes agree |
| 11 | Deferred bundles decision | libavoid, graphviz.dot, graphviz.layouter | 6 | 6,019 evaluated, 0 ported / ~3 | ADR with go/no-go per bundle; fitness test updated |
| 12 | Docs site + first publish | typedoc/vitepress site; semantic-release; npm | 7h, 8c, 9 | n/a / ~10 | Docs build and links pass in CI; first publish freezes API |
| 13 | ELK upgrade process | Move pin past `8aaa3c14` | 12 | n/a / ~4 | Runbook run once on a newer commit with a clean sweep |

Order note: 8a-8c need only mission 6, so they may run in parallel with mission 7.

## Deviations from the required list

- **Missions 3 and 4 swapped, metadata slice pulled forward.** `graph.json` requires `core` in
  `bundle-deps.json` and imports `core.data`, `core.options.CoreOptions`, `LayoutMetaDataService`
  (read from the Xtend sources). The generated `*Options` also extend `core.data` types. Keeping
  "JSON adapter" before "codegen" would make mission 3 depend on mission 5. So mission 3 ports
  `core.data`, `core.options`, `core.labels` plus the codegen, and mission 5 gets the remainder of
  `core`.
- **Missions 7 and 8 split into 7a-7h and 8a-8c.** 64,082 LOC (layered) and 22,007 LOC (other
  algorithms) are too large for one mission brief. Layered splits by the phase boundaries in
  `docs/architecture/port-map-alg-layered.md`; the eight parts sum to 64,082.
- **Mission 6 does not depend on mission 7**, and 8a-8c do not depend on 7: algorithms depend
  only on alg.common, core, graph.

## 1. Java foundations completion

Scope: first write JVM-recorded vectors in `tools/vectors/JavaVectors.java` (extend the generator,
never change it): `HashMap`/`HashSet` iteration order (String, Integer, Double, KVector-style keys,
with removals and resizes), `l2i`, `Math.fround` arithmetic, `log10` of powers of ten,
`Double.toString`/`parseDouble`, `String.hashCode`/`Double.hashCode`, `PriorityQueue` tie order,
zero-divisor throws, `Random.setSeed` mid-sequence. Then the shims, from Javadoc only (AD-9):
`JavaHashMap` (`HashMap` order is unspecified in the Javadoc, so it cannot be written from spec
without the vectors), `l2i`, float helpers, `PriorityQueue`, `src/guava/` helpers
(`translation-rules.md` section 4), `bigint` for `ElkMath.factl/binomiall` and 64-bit shifts for
`TwoBitGrid`, `IndexOutOfBounds`/`NumberFormatException` error classes (10 catch sites).
Also correct the four CLAUDE.md rows listed in `translation-rules.md` section 9.
Not in scope: any ELK class; `src/java/lang/StrictMath.ts` (add when a second transcendental
caller appears; `Random.ts` keeps its private fdlibm log).
Exit: vector tests green for each shim; CLAUDE.md corrections merged; `npm run typecheck` and
`npm run coverage` exit 0. Only 8 iterated containers are value-hashed
(`translation-rules-collections.md` section 2.1); 30 are identity-hashed (insertion order plus a
journal entry); enum keys are identity-hashed.

## 2. Property system + ElkGraph model

Scope: `IProperty`, `Property`, `MapPropertyHolder` (its `propertyMap` is value-hashed site V1, so
it uses `JavaHashMap`), `EMapPropertyHolder` analog, `ElkNode`/`ElkEdge`/`ElkPort`/`ElkLabel`/
`ElkEdgeSection`/`ElkBendPoint` as plain classes keeping Java accessor names (AD-11),
`ElkGraphUtil` factories, `ElkReflect`. Public surface follows AD-14, but nothing is exported from
`src/index.ts` yet.
Not in scope: EMF notifications, adapters, `ElkGraphPackage*`, `ElkGraphSwitch`,
`ElkGraphAdapterFactory`, XMI persistence.
Exit: ported `graph.test` suite green; `module-boundaries` fitness test shows `src/graph` imports
only `src/java`.

## 3. Core metadata slice + `.melk` codegen

Scope: hand port `core.data` (2,372), `core.options` (1,845), `core.labels` (46) and the `core.math`
and `core.util` classes they import; `tools/melk/` generator (AD-12) with output committed:
13 `.melk` files yield 27 generated classes (`port-map.md`), `CoreOptions` first. The generator
resolves `metadataClass` against the `.melk` `package` (not its directory: `Stress.melk`,
`Core.melk`) and emits `Math.fround` for float defaults (`aspectRatio = 1.6f`).
Not in scope: the other algorithms' option classes beyond the generator proving them (they land
with their algorithm missions); the Xtext editor.
Exit: a JSON dump of the oracle's `LayoutMetaDataService` equals the TS registry for `CoreOptions`
(test fails on any option, default, or bounds drift); generator golden tests for all 13 `.melk`.

## 4. ELK JSON adapter

Scope: port `JsonImporter`/`JsonExporter` and helpers (5 Xtend files, `translation-rules.md`
section 8) and port the nine `graph.json.test` files. The adapter is an I/O layer, not the public
contract (AD-14).
Not in scope: ELK Text, Xtext editors, layout.
Exit: import then export of every committed golden input reproduces the oracle's JSON within
1e-6 (structure exact); ported tests green.

## 5. Core engine + simple providers

Scope: remainder of `core` (about 15,860 LOC, derived as 20,414 minus 288 not-ported persistence
minus the 4,263 from mission 3, before util/math already pulled in): `RecursiveGraphLayoutEngine`,
`LayoutMetaDataService`, `AbstractLayoutProvider`, progress monitors, `core.comments`,
`core.validation`, `core.util`, `FixedLayoutProvider`, `BoxLayoutProvider`,
`RandomLayoutProvider`. Port the 20 `core.test` files.
Not in scope: `core.service`, `core.ui`, `core.debug*`, `core.util.persistence`.
Exit: first end-to-end TS layouts for fixed, box and random models equal the committed goldens
within 1e-6 via `test/golden/compare-json.ts`. This mission could split in two if its plan
exceeds roughly 25 tasks.

## 6. alg.common

Scope: node spacing and cell system, label placement, 1D compaction, network simplex, polyomino,
overlaps, spore utilities (`BowyerWatsonTriangulation`, `NaiveMinST`; value-hashed sites V6-V8,
first consumer of `JavaHashMap` ordering in output), `PolyominoOptions` via codegen. Port the 8
`alg.common.test` files.
Not in scope: any algorithm provider.
Exit: ported tests green; `NaiveMinST` unit test with HashSet tie order from JVM vectors.

## 7. Layered (7a-7h)

Shared rules: sizes are per Java package (`port-map-alg-layered.md`); an intermediate processor is
ported in the sub-mission whose phase first needs it, and 7f finishes the rest, so +-10% LOC may
move between 7b-7f. Each sub-mission ports its share of the 97 `alg.layered.test` files (22,384
LOC) before the code (AD-13). Not in scope: libavoid or graphviz layout.
- **7a framework (11,864):** `alg.layered` 3,301, `graph` 3,839, `graph.transform` 2,215 (EMF to
  AD-11), `options` 2,509 with `LayeredOptions` generated; whole `IntermediateProcessorStrategy`
  enum, factories not-yet-ported until 7f.
- **7b (4,182):** `p1cycles` 1,681, `p2layers` 2,501 (incl. network-simplex consumers).
- **7c (7,633):** `p3order` 4,037, `counting` 1,450, `greedyswitch` 1,114, `preserveorder` 1,032.
- **7d (4,792):** `p4nodes` 2,479, `bk` 2,313.
- **7e (6,798):** `p5edges` 874, `orthogonal` 1,962 + `direction` 512, `splines` 3,450.
- **7f (13,920):** `intermediate` 13,606, `unzipping` 314.
- **7g (10,773):** `loops` + `ordering` + `routing` 3,684, `wrapping` 2,168,
  `intermediate.compaction` 1,698, `compaction.*` 3,223.
- **7h (4,120):** `components` 2,614, `compound` 1,506.
Exit per sub-mission: ported tests green and the default-layered goldens (Ptolemy models, seed 1)
that exercise it equal the oracle. 7h exit: all 97 tests green plus a layered golden per
direction and per hierarchy-handling mode.

## 8. Remaining algorithms (8a-8c)

Each algorithm ports its tests first; each option class is generated by mission 3's tool.
- **8a (10,235):** `mrtree` 5,790 (`FanProcessor` V4 is value-hashed; `ComponentsProcessor`
  merge is last-writer-wins on V1), `radial` 2,752,
  `vertiflex` 1,693 (no test plugin; goldens only).
- **8b (4,645):** `force` 2,236 (uses `Random`; seeded goldens), `disco` 2,409.
- **8c (7,127):** `rectpacking` 4,688, `spore` 1,326 (end-to-end `NaiveMinST` ties),
  `topdownpacking` 1,113. `GridElkNode` (523 lines) implements the whole `ElkNode` interface by
  delegation, so AD-11 plain classes need an interface or adapter there; decide in the plan.
Not in scope: cross-algorithm imports not present in Java (fitness test enforces).
Exit: per-bundle tests green and one golden per algorithm option set within 1e-6.

## 9. elkt corpus + parity dashboard

Scope: an oracle harness mode converting the 898 `.elkt` models to JSON (all 550 `.json` models
in elk-models are Ptolemy defaults, layered with seed 1, so no other algorithm has a golden until
this lands); a local full-corpus sweep (the oracle lays out 256 models in 2.7 s) and a parity
dashboard. Sweeps stay local (AD-5); curated goldens are committed.
Not in scope: vendoring elk-models.
Exit: all 898 convert; the sweep prints pass/fail per model and an AD-4 known-divergences list is
created for `Math.*` (non-strict) call sites; V8 `Math.log` vs `StrictMath.log` 1-ulp cases are
listed, or `StrictMath.ts` is added if a second transcendental caller exists.

## 10. Text-sizing seams

Scope: first numbered oracle patch under `tools/oracle/patches/` normalizing text measurement,
paired with a TS `TextMeasurer`-style seam (pattern: dot-engine AD-10), refs regenerated by script
and journaled (AD-5). Not in scope: a real font-metrics implementation.
Exit: oracle rebuilt via `tools/oracle/build.sh`; goldens regenerated with the patch id in
`_meta.json`; TS and oracle sizes agree on label-bearing models. (Maven 3.9.x is required for
Tycho 4.0.12; `ELK_MVN` is documented in the oracle README.)

## 11. Deferred bundles decision

Scope: for `alg.libavoid` (1,548, external C++ process) and `alg.graphviz.dot` /
`alg.graphviz.layouter` (2,728 + 1,743), decide: skip, port, or delegate to `@knowvah/dot-engine`.
Output is an ADR, not code.
Exit: ADR committed with a go/no-go per bundle; `bundle-deps.json` updated if any is adopted.

## 12. Docs site + first publish

Scope: typedoc (needs a TS 6 alias because typedoc lacks TS 7 support, AD-6) and vitepress;
link check and example tests in CI; semantic-release; GitHub repo and npm name claimed by the user.
**The first publish freezes the ElkGraph API (AD-14)**: `ElkGraphUtil` and the AD-11 classes become
the semver contract; export `src/index.ts` deliberately and review the surface before release.
Not in scope: an idiomatic wrapper layer (separate later work).
Exit: docs build, link check, and example tests pass in CI; published package installs and lays
out a graph in a clean project.

## 13. ELK upgrade

Scope: a written, rehearsed process for moving the pin past `8aaa3c14` (AD-2): bump `ELK_COMMIT`,
rebuild the oracle, rerun the vector and corpus sweeps, diff `.melk` metadata dumps, port Java
diffs.
Exit: one rehearsal against a newer ELK commit produces a clean sweep or a triaged diff list.

## Revision 2026-10-11 (conformance-corpus)

Appended; no earlier line is edited. Source: D0, D3, D8, D10 in
`plans/conformance-corpus/decisions.md`. Where this section conflicts with the text above, this
section wins.

**Scope supersession.** Line 112 ("Not in scope: `core.service`, `core.ui`, `core.debug*`, ...")
no longer excludes `core.debug.grandom`: it is in scope (D0, mission 4d). `core.debug` is
reference only. `alg.disco.debug` is reference only. `graph.text`, `graph.json.text` and their
`.ide` bundles: runtime in scope, `.ide` deferred, `.ui` out. Mission 4's "Not in scope: ELK Text"
stays true for mission 4; ELK Text moves to 4b.

**Inserted missions (after 4, before 5; each is one `/plan-mission` input):**

| # | Mission | Scope | Depends on | Size (Java LOC / est. tasks) | Exit criteria |
|---|---------|-------|------------|------------------------------|---------------|
| 4b | `graph.text` (`.elkt`) | Hand-written recursive-descent parser, one method per `ElkGraph.xtext` rule (D8); Xtend value converters, naming, scoping, linking, validation; `ElkGraphFormatter` and serializer for the `.elkt` writer (D10) | 2, 3, 4 | 1,352 / ~8 | Every elk-models `.elkt` parses equal to the oracle's parse-only JSON; realworld `.json` and `.elkt` of one model parse to the same ElkGraph (D3); `.elkt` writer round trip (ElkGraph to `.elkt`) is byte-exact against the oracle |
| 4c | `graph.json.text` (`.elkj`) | Same approach for `ElkGraphJson.xtext` and its Xtend support | 4b (parser approach) | 972 / ~5 | `.elkj` inputs parse equal to the oracle; invalid input fails where the oracle fails (known divergence #1: presence only, D8) |
| 4d | `core.debug.grandom` (`.elkr`) | `GRandom.xtext` parser, `ConfigurationParser`, `GeneratorOptions`, `RandomGraphGenerator` with the exact JVM `Random` sequence | 4b | 2,696 / ~7 | Reproduces `test/corpus/generated/*.json` byte for byte (D7); `BlindTextGenerator` stays unseeded and out of goldens |

Mission 5 and later now depend on 4b where they need text input; their numbers do not change.

**Mission 9 rescoped** to "TS sweep + per-algorithm dashboard". The oracle side (elkt-to-JSON
mode, corpus census, native/retarget/generated tiers, oracle parity report) is the
conformance-corpus mission, not mission 9. Mission 9 keeps: running the TS engine over the same
cases, comparing against the oracle outputs, and the per-algorithm parity dashboard. Its exit
changes to: sweep reports per-algorithm status for every `(algorithm, model, variant)` case
(D1). It no longer converts the 898 `.elkt` models; that conversion is replaced by 4b.

## Revision 2026-10-14 (graph-text)

Appended; no earlier line is edited. Source: G1-G8 in `plans/graph-text/decisions.md`; the journal is
`plans/graph-text/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Mission 4b (`graph.text`) status.** The code, vectors and curated refs landed on `feature/graph-text`
(entry point `src/graph/text/ElkGraphText.ts`, Xtext subset `src/xtext`; design and runbook in
`docs/architecture/elk-text.md`). The exit criteria are measured by the local sweep, whose counts are in
`docs/conformance.md`, section "ELK Text (`.elkt`)". Two results differ from the exit text above and are
flagged for the user in the journal: the realworld `.json` and `.elkt` of one model do not parse to the same
ElkGraph (all 550 `.elkt` carry port `position`, which the `.json` lacks, so D3 is held as "oracle differs
identically", `D3_ORACLE_DIFFERENCES`), and syntax errors match by presence only (D8 #1).

**Follow-ups by mission:**

- **Mission 5** and every later algorithm mission: when the TS registry grows, regenerate the core-only graph.text
  refs and vectors by script (`tools/vectors/elkt-vectors.sh`, `tools/oracle/regen-elkt-refs.sh`), journal the
  regeneration, and drop the `MISSION5_ALGORITHMS` filter and its stand-in describe in
  `src/graph/text/validation/ElkGraphValidator.test.ts` (the filter's test fails once `fixed`, `box` and `random`
  resolve).
- **Mission 7** (layered): repeat the regeneration for the layered registry; about 177 to 182 models use layered keys
  and differ between the core and the default oracle registry.
- **Mission 4c** (`graph.json.text`): reuse `src/xtext` (converters, scoping, linking, validation base, the
  `formatting2` subset) and add the bundle to `XTEXT_CLIENT_BUNDLES` in
  `test/architecture/module-boundaries.fitness.test.ts`.
- **Any time (outside the mission 4b write-sets):** fix the mission-4 `JsonExporter` null option value gap
  (`src/graph/json/JsonExporter.ts:53`) and then remove `KNOWN_EXPORTER_GAPS` in `ElkGraphText.test.ts`; vendor the
  31 curated `.elkt` inputs or fetch the pinned corpus in CI so the curated refs run there; add a
  `StringIndexOutOfBoundsException` shim to `src/java/lang`; decide whether the 13 lexer recovery boundaries pinned
  in T9 become canonical lexer vector rows in a later regeneration.

**Update 2026-10-14 (user):** D3 amended (D3a, `plans/conformance-corpus/decisions.md`): realworld `.json` and
`.elkt` must be equal except for port positions; the graph-text tests now assert 550/550 under that rule and the
`D3_ORACLE_DIFFERENCES` list is removed.

**Update 2026-10-15 (user):** the `JsonExporter` null option value gap is fixed (a null value throws a `TypeError`,
Java's NPE); `KNOWN_EXPORTER_GAPS` is removed from `ElkGraphText.test.ts`.

**Update 2026-10-15 (user):** the `StringIndexOutOfBoundsException` shim is added to `src/java/lang`.

**Update 2026-10-15 (user):** the 31 curated `.elkt` inputs are vendored in `test/corpus/elkt-curated/`; the curated
refs run in CI.

**Update 2026-10-15 (user):** erased-generic casts are ported (`src/java/lang/JavaCast.ts`); 8 of the 10
`ClassCastException` converter rows replay, and the 2 rows a `number` cannot represent stay documented skips.

**Update 2026-10-15 (user):** the validator's line-101 proxy resolution is recorded through an option registered
after load; load-then-validate cannot reach it in any registry, so missions 5/7 have nothing to regenerate for it.

**Update 2026-10-15 (user):** the 13 T9 lexer recovery boundaries are canonical rows of `graph-text-lexer.json`.

**Update 2026-10-15 (user):** the Xtext `Linker` passes a null unresolved-proxy message on as Java does (T16).

**Update 2026-10-15 (user):** AD-16 exception policy approved (`plans/elk-engine-skeleton/decisions.md`). Follow-up, any
time before the first npm publish: add `Exception`/`RuntimeException`, re-parent the 18 Java-named root exception classes to their
Java parents (`ArithmeticException` leaves `RangeError`), rewrite the 6 listed frozen assertions with the user's approval,
and add the inheritance fitness test.

**Update 2026-10-15 (user):** AD-16 is implemented (base classes, 18 re-parented classes, fitness test).

**Update 2026-10-15 (user):** the 4 G3 sweep models are compared with the mission-5 stand-ins (validate-equal
898/898). Mission 5 deletes `test/helpers/mission5-stand-ins.ts` and the selections that use it (the validator test's
`mission5` rows, the sweep's `MISSION5_ALGORITHM_VALUE`).

## Revision 2026-10-16 (graph-json-text)

Appended; no earlier line is edited. Source: D1-D13 and the D2 amendment in `plans/graph-json-text/decisions.md`; the
journal is `plans/graph-json-text/decision-journal.md`. Where this section conflicts with the text above, this section
wins.

**Mission 4c (`graph.json.text`) status.** The code, vectors and curated refs landed on `feature/graph-json-text`
(entry point `src/graph/json/text/ElkGraphJsonText.ts`, internal; design and runbook in
`docs/architecture/elk-json-text.md`). The exit criteria above ("`.elkj` inputs parse equal to the oracle; invalid
input fails where the oracle fails") are restated as D2 = A', amended by the user on 2026-10-16:

- The pinned elk-models holds no `.elkj`, so the oracle's `convert` mode applies `ConvertGraphHandler`'s steps to
  the corpus (identifier generator seeded by patch `0002`, D12). Tier 1: those files parse and validate equal.
  Tier 2: ELK JSON read by the `.elkj` language parses equal. Writer tier: graphs written with
  `serialize(format())` byte-exact, then reparsed.
- **Size-capped:** the oracle's serializer needs 30 to 1,100 CPU-seconds per graph, so the sweep covers every graph
  up to 5 KB (345) plus 6 sampled larger ones (instead of ~40), 666 ELK JSON inputs for tier 2, and a determinism
  double-run on 30. The cap and sample are parameters of `tools/oracle/elkj-sweep.sh`; the full 1,448 are a
  days-of-CPU rerun.

**Result** (`docs/conformance.md`, section "ELK Textual JSON (`.elkj`)"): `tier1-parse-equal=344/344` (144 exact,
200 presence), `tier1-validate-equal=344/344`, `tier2-parse-equal=666/666` (591 exact, 75 both reject),
`writer-byte-exact=351/351` (315 byte-exact, 36 oracle failures matched), `reparse-equal=315/315`, 0
nondeterministic; oracle 2 h 04 min on 8 serial-GC JVMs, TS 4.2 s.

**Scope changes against the 4c row above.**

- **D13 (user, 2026-10-16):** linking is lazy like Xtext's `LazyLinker` rather than eager (D11 B): the mission
  ported `LazyLinker`, `LazyLinkingResource`, `LazyURIEncoder` and an EMF proxy/resource subset, amending mission-2
  D4. `ElkEdge.sources/targets` and the shapes' edge lists now resolve proxies; `.elkt` keeps its eager linker.
- The estimate (972 Java LOC / ~5 tasks) became 18 planned tasks, with T12 replaced by T12a-T12f and T12h.
- The 4b parse runtime moved to `src/xtext/parser/` (D1) and `graph.json.text` joined `XTEXT_CLIENT_BUNDLES`.

**Follow-ups by mission:**

- **Mission 5** and every later algorithm mission: when the TS registry grows, rerun `tools/vectors/elkj-vectors.sh`
  (about 30 min) and `tools/oracle/regen-elkj-refs.sh` with the `.elkt` ones, and journal the regeneration.
- **Any time (outside the 4c write-sets):** port Xtext's `DefaultTerminalConverter` (45 SIGNED_INT/FLOAT converter
  rows, unreachable from the grammar); record a bare-CR diagnostic vector for `.elkt` (the `.elkj` line fix of
  `fix(T11)` suggests the same deviation); port the `ElkNodeImpl.toString` proxy arm; move the shared copy of the
  graph (`ElkGraphCopy` duplicates 4b's `copyGraph`) to `src/graph/util`; widen the sweep sample if wanted.

## Revision 2026-10-22 (grandom)

Appended; no earlier line is edited. Source: D1-D9 in `plans/grandom/decisions.md`; the journal is
`plans/grandom/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 4d (`core.debug.grandom`) is done as mission 4f; the exit is met.** The code, vectors and corpus replay
landed on `feature/grandom` (internal facade `src/core/debug/grandom/GRandomText.ts`; design, evidence and runbook
in `docs/architecture/grandom.md`). The exit criterion of row 4d ("reproduces `test/corpus/generated/*.json` byte
for byte", D7) is met: 9/9 corpus files regenerate byte for byte, and every JVM vector row replays (lexer 433,
parse 142, validate 23, generate 58 seeded + 6 unseeded + 12 `RandVal`). `BlindTextGenerator` stays unseeded and
out of goldens.

**Scope changes against the 4d row above.**

- Option A (user, batch 4): the grandom model stays plain classes (D3); the parser and validator use `src/xtext`
  primitives but not `ParseSession`, `Diagnostician` or `AbstractDeclarativeValidator`, and the parser records the
  three validator positions (amends D2).
- `src/core/debug/grandom` joined `XTEXT_CLIENT_BUNDLES`; `src/core/math/ElkMath.ts` (`boundi` only) and the
  one-argument `Collections.shuffle(list)` were added (D5, D7).

**Follow-ups by mission:**

- **Any time (outside the 4f write-sets):** the `generateANTEGraph` branches beyond `form-acyclic` (planar,
  single source, hierarchy) are unit-tested from the Java source only; widen the generate vectors to pin them.
- **Any time:** the lexer inputs `cross-hierarchy relativex` and `self loopsx` are derived from the rule, not
  pinned by a vector; add lexer cases if needed.
- **Any time:** a shared `devAssert` helper does not exist; the Java `assert` statements in the grandom port are
  omitted with comments (`KVector.ts` precedent).
- **Deferred:** the `core.debug.grandom.ide` bundle (content assist) needs a browser-editor host decision.

## Revision 2026-10-23 (core-engine)

Appended; no earlier line is edited. Source: M1-M17 in `plans/core-engine/decisions.md`; the journal is
`plans/core-engine/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 5 splits (M1): 5a `core-engine` is done; 5b `core-remainder` is the next `/plan-mission` input.** 5a landed on
`feature/core-engine` (design, evidence and runbook in `docs/architecture/core-engine.md`). The row 5 exit ("first
end-to-end TS layouts for fixed, box and random equal the goldens within 1e-6") is met for 5a:

- All nine curated algorithm goldens (three each for `fixed`, `box`, `random`, in `test/golden/algorithms.json`,
  refs in `test/golden/refs/elk-algorithms/`) equal the oracle under `compareLayout` at 1e-6 on the first run (T17,
  M4). Both golden sets regenerate byte-stable.
- Ported JUnit: `RecursiveGraphLayoutEngineTest` (3 of 4 cases), `GraphValidatorTest`, the `ElkUtil` cases, `Issue457Test`
  and `Issue489Test`, plus the JSON and content-assist cases that waited for mission 5 (`SectionsTest`,
  `TransferLayoutTest`, `LayoutDataContentAssistTest`; T11, T16, T17, T18).
- `PENDING_TYPES = []`: `fixed`, `box` and `random` are registered as in the oracle's core-only registry; every landed
  vector replayed unchanged (M7, T8-T14).
- Corpus comparison of the 898 retarget cases per algorithm (M5, T19): counts and known divergences are in
  `docs/conformance.md`, section "Core layouts (fixed, box, random)".

**Row 5b (`core-remainder`).** Scope from `plans/core-engine/decisions.md#m1--split`, minus `ElkRectangle` (moved into
5a by M11): `alg/*` (rest), `comments/*`, `math/{BezierSpline,CubicSplineInterpolator,ISplineInterpolator}`, the rest
of `ElkMath`, `util/adapters/ElkGraphAdapters`, `util/selection/*`, `ElkSpacings`, `LayoutConfigurator`,
`PropertyConstantsDelegator`, `AbstractRandomListAccessor`, `DefaultFactory`, `Triple`, `Quadruple`,
`WrappedException`, a `java.awt.geom.Rectangle2D` shim with JVM vectors, and the tests that go with them
(`LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`, `LayoutProcessorConfigurationTest`,
`BezierSplineTest`, `CubicSplineInterpolatorTest`, the rest of `ElkMathTest` including the four rectangle cases that
call `ElkMath.contains/intersects`). Size about 7.5k Java lines, about 13 tasks. Depends on 5a. Exit: the listed tests
are ported and green; the issue-test harness switches from the hand-applied configurator body to `LayoutConfigurator`.
Both 5a and 5b land before mission 6. `core.util.persistence` stays out of scope (AD-11).

**Scope changes against row 5 above.**

- **M10, M12, M15, M16, M17 (user):** `ElkUtil`, `BoxLayoutProvider` and the engine are split into section modules for
  the 500-line cap; generated algorithm option constants and `*_DEP_*` constants are lazy getters (the same applies to
  every later algorithm bundle).
- **M2:** `elkjs-exclude` blocks are dropped (debug-folder helpers, `toSafePathName`).
- **M4:** the goldens live in a separate set so the corpus manifest and the docs-site showcase stay frozen.

**Follow-ups by mission:**

- **7a (layered):** `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId` (default resolves to layered), unchanged (M6).
- **7h:** `EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest` (T18).
- **Every later algorithm mission:** apply the M7/M9 procedure (replay vectors, flip tripwires per type) and rerun
  `tools/vectors/elkj-vectors.sh` and the `.elkt` regeneration when the TS registry grows; stub algorithm ids must not
  end in a registered algorithm's suffix (M14).
- **Docs (any time):** add the algorithm goldens to the docs-site showcase (M4).
- **Any time:** `variants.json` entries add native and generated sweep cases (`random-seed-1` adds one per model to
  the next full sweep); widen `IElkProgressMonitor` getters and `AbstractLayoutProvider.initialize` to their
  nullable Java types when those files are next touched.

## Revision 2026-10-24 (core-remainder)

Appended; no earlier line is edited. Source: R1-R7 and P1-P9 in `plans/core-remainder/decisions.md`; the journal is
`plans/core-remainder/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 5b (`core-remainder`) is done as mission 5b; the exit is met.** The code landed on `feature/core-remainder`
(design, evidence and runbook in `docs/architecture/core-engine.md#mission-5b`). The `core` bundle is complete except
`core.util.persistence` (AD-11).

- All listed JUnit ports are green: `LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`,
  `LayoutProcessorConfigurationTest`, `BezierSplineTest`, `CubicSplineInterpolatorTest` and the full `ElkMathTest`,
  including its 4 rectangle cases.
- The `.elkt` harness uses `LayoutConfigurator` as Java's `TestAlgorithm` does (T12); both golden sets regenerate
  byte-identical, with no assertion changed.
- 18 of 18 `comments.json` oracle scenarios replay equal (R6 asked for about 10); all 5,044 `regex.json` pattern
  strings match.
- Last full gate: 404 test files, 19,389 passed, 69 skipped; 99.28 % lines, 97.13 % branches, 99.27 % functions;
  `npm test` 53.2 s at load about 7 against the 66.3 s baseline (stop 12 clear).

**Scope changes against row 5b above.**

- **R1:** `comments/*`, `util/selection/*` and `PropertyConstantsDelegator` are ported now, although nothing in ELK
  calls them (no Java tests; the evidence is R6).
- **R2:** narrow `Pattern` and `JavaCharacter` shims from the Javadoc, proven by new vectors; extended to
  `String.equalsIgnoreCase` (flagged to the user at planning). Amended twice by the user during execution: JVM `\b`
  and per-code-point case maps come from the recorded `regex-boundary.json` (the JDK 21 `\b` goes beyond its Javadoc
  for combining marks), and `Collectors.summingDouble`/`averagingDouble` is pinned by `stream-sum.json`
  (1,035 rows). `CoreJdkVectors.java` therefore writes five files (`awt`, `regex`, `character`, `regex-boundary`,
  `stream-sum`).
- **R3:** `Rectangle2D` shim with only the `comments/*` surface (`awt.json`).
- **R4:** every `ElkMath` `*l` function is `bigint` through `Int64`.
- **R5:** comment interfaces with `default` methods are abstract classes.
- **R6:** 18 tie-free oracle scenarios for `CommentAttacher`, compared as sets.
- **R7:** new recorders `CoreJdkVectors.java` and `CommentVectors.java` (+ `comment-vectors.sh`); landed vectors and
  `JavaVectors.java` untouched.

**Follow-ups by mission:**

- **7a (layered):** `LayeredSpacings` builds on `ElkSpacings`' `AbstractSpacingsBuilder`; `ELK_OPTION_TARGET_FILTER`
  never filters (verbatim Java), so do not assume target filtering.
- **Every algorithm mission (6, 7, 8):** build the pipeline with `AlgorithmAssembler`; per slot, factories are ordered by
  ordinal and `Set` insertion order shows only between equal factories (journal such pairs, AD-10). Classes in
  `Class`-keyed maps of `LayoutConfigurator` are the `*Impl` constructors.
- **Next time the files are touched:** widen the nullable signatures (`AbstractLayoutProvider.initialize`,
  `IElkProgressMonitor` getters).
- **Any time:** a shared `devAssert` helper does not exist (T7 omitted the `ElkSpacings.java:80-84` asserts with a
  comment); the `StringBuilder` shim drops constructor arguments (use `new StringBuilder().append(s)`).
- **Tooling:** files added under `tools/vectors/` change the `vector-cache.sh` inputs digest, so the next `elkt`,
  `elkj` and `elkr` recorder runs are cold once. Check `uptime` before a coverage gate: foreign CPU load (about 180
  from another project) made timing-sensitive tests fail in batch 1.
- **JDK upgrade:** a change to `character.json` or `regex-boundary.json` is journaled and added to the
  known-divergences list; the shim is never patched around it (runbook in `docs/architecture/core-engine.md`).

## Revision 2026-10-26 (alg-common)

Appended; no earlier line is edited. Source: AC1-AC6 and P1-P7 in `plans/alg-common/decisions.md`; the journal is
`plans/alg-common/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 6 is split (AC1).** Mission 6a (`alg-common`) is done; mission 6b is next.

**Row 6a (`alg-common`) is done; the exit is met.** The code landed on `feature/alg-common` (design, evidence and
runbook in `docs/architecture/alg-common.md`). Ported: the root geometry, `utils`, `networksimplex`, `compaction`
(with `oned` and `options`), `overlaps`, `polyomino` (with `structures`), `spore`, and `PolyominoOptions` generated from
`Polyomino.melk`. Nothing is exported from `src/index.ts` and no provider is ported.

- The JUnit ports are green: `RectilinearConvexHullTest` (T8), `NetworkSimplexTest` (T7), `OneDimensionalCompactorTest`
  17 of 17 (T9) and `Issue475Test` (T5).
- Every `alg-common.json` scenario replays exactly (AC3, new recorder `tools/vectors/alg-common-vectors.sh`):
  `triangulation` 22, `polyomino` 108 (3 rows expect `IndexOutOfBoundsException`), `overlaps` 34, `spore` 18 (8
  scanline, 10 depth-first compaction).
- V6-V8 are implemented and proven: the 22 `triangulation` rows pin the edge iteration order and both cost trees,
  including the all-ties `constant` cost (T2 strategies, T8 sites).
- Landed vectors, goldens and corpus are unchanged: only `refs/java/alg-common.json` was added.
- Final gates and landing: see the decision journal and the mission summary in `plans/alg-common/README.md`.

**Scope changes against row 6 above.**

- **AC1:** `nodespacing/**` and `NodeMicroLayout` move to mission 6b.
- **P5:** the 8 `alg.common.test` files are split: 4 ported in 6a, 4 deferred (below).
- **AC4:** no debug file output (`SVGImage`, `DebugUtil`, `NGraph.writeDebugGraph`); every `/*d*/` call stays.
- **AC5:** `Issue475Test` vendors `475_fixedLayoutWithLongLabels.elkt` and adds it to `TICKET_INPUTS` in the landed
  `test/golden/algorithm-refs.test.ts` (AD-13 change approved by the user).
- **AC6:** Java recursions whose depth grows with the input become explicit-stack loops proven against a verbatim
  recursive reference (first case: `NetworkSimplex.tightTreeDFS`, `postorderTraversal`).

**Row 6b (`alg-common-nodespacing`): scope and evidence plan.**

- Scope: `nodespacing/**` (`cellsystem`, `internal`, `internal/algorithm`; 26 classes, 6,123 LOC) and `NodeMicroLayout`.
- Evidence (AC2): the 4 deferred JUnit files cannot run before layered, so the evidence is an oracle sweep of
  `NodeMicroLayout` over a designed set of graphs (a new recorder, as in AC3), compared at the AD-4 bar.
- Package edges to plan around: only `NodeMicroLayout` imports `nodespacing`, and `nodespacing` imports `overlaps`
  (ported in 6a).

**Deferred JUnit files (P5).**

- `InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest`: run `LayoutTestRunner` with
  layered; port in mission 7a.
- `NodeMicroLayoutTest`: needs layered, force, stress, mrtree, radial and rectpacking; port in mission 8x.
- Planning for any ticket-model JUnit port (7a, 8x) puts the model, its `inputs/manifest.json` row and the
  `TICKET_INPUTS` entry in the write-set; the `TICKET_INPUTS` edit is an AD-13 change to raise with the user.

**Follow-ups by mission.**

- **6b:** the above; `NodeMicroLayout` is the first root-package class to import `nodespacing`.
- **Before 7a (layered):** promote one of the three task-local `TreeSet` stand-ins (T9, T10, T11) to
  `src/java/util/TreeSet.ts`; layered's `CrossingsCounter` and `NodeContext` need a live `TreeSet`. Check every
  unbounded-depth recursive port (layered DFS passes) under `--jitless` and convert per AC6. A horizontal compaction
  that relies on predefined constraints must use `SCANLINE_CONSTRAINTS` (the quadratic calculation clears them).
- **7a:** port the 3 deferred label-placement JUnit files; `ElkMath.distance` callers pass a vector at least as long as
  the gap.
- **8a (disco):** `TwoBitGridTest` treats words as `bigint` and expects the read/write asymmetry; `PlanarGrid.weaklyIntersectsArea`
  throws on out-of-grid extensions (3 of 108 recorded rows); nothing registers `PolyominoOptions` before disco.
- **8x:** `DepthFirstCompaction.compactTree` and `minUnderlapWithSubtree` recurse per spanning-tree level; check large
  graphs with `--jitless`; port `NodeMicroLayoutTest`.
- **Any time:** the `devAssert` helper of translation rules 6.8 was never written (T10 omitted `assert false` defaults
  with a comment, as `KVector.ts` does); the `fromPattern` test helper is duplicated in two polyomino tests (move it to
  `test/helpers/` when next touched); `NetworkSimplexTest.testDeltas` is the canary for stack depth under suite load.
- **Tooling:** files added under `tools/vectors/` change the `vector-cache.sh` inputs digest, so the next `elkt`, `elkj`,
  `elkr` and `comments` recorder runs are cold once.

## Revision 2026-10-26 (alg-common-nodespacing)

Appended; no earlier line is edited. Source: NS1-NS6 and Q1-Q6 in `plans/alg-common-nodespacing/decisions.md`; the
journal is `plans/alg-common-nodespacing/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 6b (`alg-common-nodespacing`) is done; the exit is met.** The code landed on `feature/alg-common-nodespacing`
(design, evidence and runbook in `docs/architecture/alg-common.md`, section 7; counts in
`docs/conformance.md#alg-common-nodespacing`). Ported: `nodespacing/**` (`cellsystem`, `internal`,
`internal/algorithm`; 26 classes) and `NodeMicroLayout`. Row 6 is now complete. Nothing is exported from
`src/index.ts` and no provider is ported.

- Every row of `test/golden/refs/java/node-micro-layout.json` replays at the AD-4 bar on the first run: 326 rows
  (`corpus` 16, `curated` 70, `variants` 4, `sweep` 236), 23 of them exceptions matched by class and message
  (20 `IllegalArgumentException` for models whose ports have no side, 3 `UnsupportedConfigurationException` for
  rejected placements).
- Branch coverage of `src/alg/common/nodespacing/**` is 99.87 % (748/749; the miss is an NS5 `default` arm).
- Landed vectors, goldens and corpus are unchanged: only `refs/java/node-micro-layout.json` was added.
- `npm test` 62.0 s against the 55.4 s baseline (+6.6 s, inside the stop-11 journal band); the replay itself is 1 s.

**NS decisions.** NS1: inputs are stored in the vector JSON as ELK JSON and replayed through `ElkGraphJson`; nothing
is vendored. NS2: four scenario groups. NS3: `NodeMicroLayout` runs bottom-up on every node with children. NS4: 0×0
labels get `width = 6.5 * text.length()`, `height = 13.0` (AWT metrics are platform-dependent); model rows are
recorded `raw` and `sized`. NS5: the 3 `assert` sites stay comments. NS6: nodes (x, y, w, h, `MARGINS`, `PADDING`),
ports (x, y) and labels (x, y, w, h) in model order, doubles as raw bits, compared within 1e-6.

**Kept upstream quirks (see `docs/conformance.md#alg-common-nodespacing-quirks`).** `NodeMicroLayout` rejects ports
without a side; `CellSystemConfigurator.java:118-119` sets the middle row's height contribution twice and never its
width; constrained outside port labels use swapped `withGap` arguments; `NodeMarginCalculator` processes a port edge's
head/tail label twice; `GridContainerCell` width passes overwrite earlier rows; `ContainerCell.minWidthOfCell` ignores
the padding of a zero-content cell.

**Follow-ups by mission.**

- **7a (layered):** port the 3 deferred label-placement JUnit files (`InsidePortLabelTest`,
  `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest`); `NodeDimensionCalculation` is the facade layered
  calls through `LGraphAdapters`. The 10 corpus/curated models whose ports have no side gain port coverage only once
  layered assigns sides. `NodeContext.portContexts` already uses the landed `TreeMultimap` (TreeSet semantics per
  side), so the live `TreeSet` follow-up from 6a is still only for `CrossingsCounter` and the three 6a stand-ins.
- **8x:** `NodeMicroLayout.forGraph(...).execute()` is the entry point for force, mrtree, radial and rectpacking; port
  `NodeMicroLayoutTest` (needs layered, force, stress, mrtree, radial and rectpacking).
- **Any time:** the `devAssert` helper of translation rules 6.8 is still unwritten (6b added three more commented
  `assert` sites: `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`,
  `PortLabelPlacementCalculator.java:208`). When deriving nodespacing expectations by hand, check first:
  `minWidth/HeightOfCell` returns 0 for a zero-content cell with padding; a side with exactly 2 ports is
  space-efficient; port-edge labels count twice in margins; `NodeLabelLocation` sets overlap (OUT_T_L vs OUT_L_T).
- **Tooling:** `tools/vectors/NodeMicroLayoutVectors.java` is 920 lines; single-file recorders are outside the
  complexity gate but trip the global file-length hook on write (as `JavaVectors.java` does). Adding it under
  `tools/vectors/` made the next `elkt`/`elkj`/`elkr`/`comments` recorder runs cold once.

## Revision 2026-10-27 (ad13-rederivation)

Appended; no earlier line is edited. Source: D1-D7 and E1-E3 in `plans/ad13-rederivation/decisions.md`; the journal is
`plans/ad13-rederivation/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 6b evidence is strengthened; mission 6c is done.** Each of the five 6b `flag` sites (hand-derived expectations
corrected after a first failure) is now pinned to an oracle row in `test/golden/refs/java/nodespacing-sites.json`.
The 13 T4 test scenarios whose branches the `node-micro-layout.json` replay never reaches are pinned the same way. The
file has 23 rows and replays at the AD-4 bar (`src/alg/common/nodespacing/NodespacingSiteVectors.test.ts`). The
recorder is `tools/vectors/nodespacing-site-vectors.sh`. Every corrected 6b value equals the oracle. Two invalid-premise
originals are restored as their own cases: the OUT_L_T set and the 2-port `FIXED_RATIO` margins. No `src/` file changed
and no landed vector or golden changed. Counts are in `docs/conformance.md#alg-common-nodespacing`.

**Follow-ups.**

- The four hand-derivation rules from 6b are now pinned by oracle rows:
  - zero-content cells ignore padding: `insideLabels`, `allConstraints`, `collapsedContainers`
  - a side with exactly 2 ports is space-efficient: `fixedRatioMargins/two-ports`
  - port-edge labels count twice: `sidelessPortMargins`
  - overlapping label location sets: `labelLocation`
- **7a (layered):** the `node-micro-layout.json` sweep never sets a port alignment or a north/south border offset. A
  layered replay, or a later sweep revision, should cover BEGIN/END/JUSTIFIED and border offsets end to end. The
  `t4/*` rows cover them only at the unit level, and only on the horizontal axis for placement.
- **Tooling:** `PortPlacementCalculator.PORT_RATIO_OR_POSITION` is not a registered option, so any ELK JSON based
  vector carrying `FIXED_RATIO` ratios needs a side channel (here the `setPortRatio` step).

## Revision 2026-10-28 (layered-framework)

Appended; no earlier line is edited. Source: L1–L7, S1–S4 and X1–X7 in `plans/layered-framework/decisions.md`; the
journal is `plans/layered-framework/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 7a is done.** The layered framework is ported and proven by three oracle replays (`layered-framework.json`,
272 rows) plus 330 site rows (`layered-sites.json`) that reach every branch the replays leave untaken; design, staged
classes and runbook in `docs/architecture/alg-layered.md`, counts in `docs/conformance.md#alg-layered-framework`.
No layout runs yet.

**Scope moves (binding for 7b–7h).**

- **L2 → 7f:** `ElkLayered` (staged in 7a: `doLayout`, `doCompoundLayout`, `prepareLayoutTest` throw),
  `GraphConfigurator`, `InteractiveLayeredGraphVisitor`, `DebugUtil`, `DotDebugUtil`, `JsonDebugUtil` (~3,100 lines)
  move from 7a to 7f, the first sub-mission with a running pipeline.
- **S1 → 7f:** the full-layout follow-ups: `InsidePortLabelTest`, `NextToPortLabelPlacementTest`,
  `PortLabelPlacementVariantsTest`, `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId`,
  `LayeredSpacingTest.AfterLayoutTest`, and an end-to-end alignment/border-offset sweep (7a covers alignment and
  border offsets at the adapter level: 142 `adapters` rows).
- **S2 → 7c:** the `TreeSet` stand-in promotion (first consumer `CrossingsCounter`); no 7a class uses a `TreeSet`.
- **S3 → 7b:** `IntermediateProcessorStrategy` (first consumers: the 7b phases' processor configurations).
- **L6 → 7b:** `TestGraphCreator` (1,217 lines) with its first consumers.

**Staged classes (L1), with the mission that replaces each** (`test/architecture/staged-classes.json`; the list is
empty after 7h): `ElkLayered` 7f, `intermediate/LabelDummySwitcher` 7f, `intermediate/loops/{SelfLoopEdge,
SelfLoopHolder, SelfLoopPort}` 7g, `intermediate/wrapping/{BreakingPointInserter, BreakingPointInserterBPInfo}` 7g,
`compound/CrossHierarchyEdge` 7h, `p5edges/splines/SplineSegment` 7e. The phase-strategy factory arms throw naming
7b (cycles, layers), 7c (crossing minimization) and 7d (node placement). Replacing a staged file: port it at the same
path, drop the `@staged` marker and the JSON row, keep the three 7a replays green.

**Follow-ups found during the run.**

- **7b:** `Tarjan`'s two hash containers are insertion-ordered (AD-10); a `SCCModelOrderCycleBreaker` replay mismatch
  traced to either is a stop. The `hierarchyAware` site row lists `LayerSweepCrossingMinimizer` as the only
  `IHierarchyAwareLayoutProcessor` implementor; the sentinel test in `IHierarchyAwareLayoutProcessor.test.ts` fails
  once 7c ports it and must then be updated to assert the brand.
- **7c:** `LNode.getPortSideView` is a write-through proxy with Java `SubList` bounds (X7); `GreedyPortDistributor.switchPorts`
  writes through `Lists.reverse(view)`.
- **7f:** the four `site/provider/*` rows carry the oracle's full layout output for small graphs; replay them once
  `ElkLayered` runs, and re-anchor `LayeredLayoutProvider.test.ts` (the `isCanceled` arm) and T11a's provider
  replay (which observes the staged driver by wrapping `ElkLayered.prototype`). The rows named in `unreached.md`
  § Amendments as "dead by construction" in `ElkGraphLayoutTransferrerNonMutating` stay dead with a real layout.
- **Any sub-mission:** a green replay is not evidence until replay-alone coverage shows the code under test ran
  (X4: a scenario that drives a layered processor before layering sizes nothing). Measure per class before writing
  unit tests, as T9 did.
- **Tooling:** the melk recorder cannot encode a `List<Integer>` option default (`cmEnforcedGroupOrders`); both melk
  tests check that record separately (`ShapePrimer`). T1's `dumpLGraph` encodes a `KVectorChain` property value as
  `{ class }` rather than a list; T11a wraps it. Embedded ELK JSON in a ref must be sanitised for Gson's bare
  `Infinity`/`NaN` (the T10 `strictNumbers` rule); the TS `JsonWriter` shim writes them bare too. The three 7a
  recorders are single-file launchers of 1,858 and 4,643 lines, outside `npm run complexity` (which scans `src/`).

## Revision 2026-10-29 (layered-cycles-layers)

Appended; no earlier line is edited. Source: SC1–SC4, B1–B10 and E1–E2a in `plans/layered-cycles-layers/decisions.md`;
the journal is `plans/layered-cycles-layers/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 7b is done.** The eleven cycle breakers, the nine layerers, `IntermediateProcessorStrategy` and the ten
processors the two phases need are ported and proven by `layered-phases.json` (651 oracle rows: 534 pipeline rows
recorded through `ElkLayered.runLayoutTestUntil`, 80 scenario rows, 37 site rows), eight ported JUnit invariant
tests, and a 32,652-case hash sweep over all ptolemy models; design, idioms and runbook in
`docs/architecture/alg-layered.md` § 8, counts in `docs/conformance.md#alg-layered-phases`. The pipeline still does not
run (`ElkLayered`, `GraphConfigurator` → 7f).

**Scope moves (binding for 7c–7h).**

- **SC2 → 7f:** `ModelOrderLayerAssignmentTest` (7 cases), `PartitionTest`, `Issue871Test` need a full layout; their
  hand-built graphs are recorded as 7b `scenarios/*` rows, so the layer assignment they encode is proven now.
- **SC3 → 7c:** `TestGraphCreator` (L6 said 7b); `BasicCycleBreakerTest` extends it but calls none of its builders.
- **SC4 (7f):** `GraphConfigurator` and `ElkLayered` stay in 7f; 7f re-replays every 7b `models/*` row through the real
  pipeline and under the default `SEPARATE_CONNECTED_COMPONENTS` (B3: 7b rows set it false, `ComponentsProcessor` is 7h).
- **S3 (7a) closed:** `IntermediateProcessorStrategy` has 59 members (the 7a estimate of 63 was wrong); 10 arms are
  live, 2 throw naming 7c, 38 naming 7f, 9 naming 7g (B9 table).

**Hand-offs found during the run.**

- **Every phase mission (7c, 7d, 7e):** wiring a strategy enum's arms closes the ESM cycle enum → phase class →
  `LayeredOptions` → provider → transformer → enum. Before wiring: add the enum to melk `NON_LEAF_DEFAULT_TYPES`
  and regenerate; write every phase class's `*_PROCESSING_CONFIGURATION` as a cached static getter from the start;
  keep module-level reads of enum constants out of `graph/transform`; probe `import()` of each enum and the metadata
  provider after wiring; tests enter through the enum, never through an abstract phase base class (E1).
- **Every mission:** a Java `==`/`!=` on boxed `Integer`/`Long` is ported by tracing where the boxes come from;
  fresh `Integer.valueOf` boxes compare through `JavaInteger.sameValueOfBox` (equal and in -128..127), never as value
  equality by default (E2a). Four such sites exist in 7a/7b; `Tarjan.java:86` is one, so the SCC strategies never pop a
  component rooted at DFS index ≥ 128 and `SCCModelOrderCycleBreaker` stalls on large graphs — faithful, and a
  candidate upstream report.
- **7f:** `LabelDummyInserter` unlocks 43 branches of the 7b classes (`unreached.md` § U); re-measure replay-alone
  coverage of `p2layers` and `intermediate` after it lands. The 14 `SCC_*` oracle timeouts and the 581 zero-height
  `STRETCH_WIDTH` cases of the sweep stay `timeout`.
- **7f:** the Java invariant `testEdgesPointTowardsNextLayers` fails on the oracle's own left-to-right model-order
  promotion when external port dummies without `MODEL_ORDER` are present, and on BF/DF model-order layerings;
  decide whether to report upstream once the full pipeline reproduces it.
- **Tooling:** the recorder runs the JVM with `-XX:hashCode=2` so identity-hashed `HashSet`s iterate in insertion
  order; that holds only up to ten entries (the BFS source guard), and any later recorder that iterates a `HashSet`
  of graph elements needs the same bound. `LayeredPhaseVectors.java` is a 2,730-line single-file launcher (JDK 21's
  source launcher takes one file); a `javac` multi-file launcher is still a follow-up. The TS sweep test is stride-2
  sampled to stay near four minutes; `PHASE_SWEEP_STRIDE=1` runs every case.
