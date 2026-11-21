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

## Revision 2026-10-30 (layered-crossing-min)

Appended; no earlier line is edited. Source: C1–C13 in `plans/layered-crossing-min/decisions.md`; the journal is
`plans/layered-crossing-min/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7c is done.** `p3order` (16 classes) and `p3order.counting` (6), the eight intermediate processors a default
pipeline runs between P2 and P3, `greedyswitch` (5) and `preserveorder` (3), the four `CrossingMinimizationStrategy`
arms and ten `IntermediateProcessorStrategy` arms are ported and proven by `layered-order.json` (808 oracle rows: 657
pipeline rows recorded through `ElkLayered.runLayoutTestUntil` at the P3 stop, 89 scenario rows, 62 site rows), ten
ported JUnit invariant tests, a 6,728-case hash sweep over all ptolemy models and 88 anchored unit cases; design, idioms
and runbook in `docs/architecture/alg-layered.md` § 9, counts in `docs/conformance.md#alg-layered-ordering`. The
pipeline still does not run (`ElkLayered`, `GraphConfigurator` → 7f). The enum tally is now 7b 10 / 7c 10 / 7g 9 /
7f 30 (B9 table amended by C2).

**New row 7c-tests (before 7d; C1).** The hand-built JUnit suites of P3 are a sibling brief: `TestGraphCreator`
(1,217 lines; SC3 amended), `greedyswitch/{TestGraphCreator, InLayerEdgeTestGraphCreator,
NorthSouthEdgeTestGraphCreator}` and the 16 suites built on them (p3order 6, counting 4, greedyswitch 6, about 9,000
lines), `ConcreteSortByInputModelTest` and `AllowNonFlowPortsToSwitchSidesTest`; the sibling brief decides how their
expectations are derived (Java literals or recorded rows).

**Scope moves (binding for 7d–7h).**

- **C2:** the eight processors and the two greedy-switch arms moved from 7f/pending to 7c (done); `LabelDummyInserter`,
  `CommentPreprocessor`, `DirectionPreprocessor` stay 7f, `SelfLoopPreprocessor`, `BreakingPointInserter` 7g.
- **C3 (7h):** every 7c row and sweep case is a flat hierarchy level; 7h records nested rows
  (`HierarchyHandling.INCLUDE_CHILDREN`) and re-measures the 89 branches / 36 functions of the sweep driver's
  hierarchical paths (`GraphInfoHolder` children, `sweepInHierarchicalNodes`, `sortPortsByDummyPositionsInLastLayer`,
  the hierarchical greedy switch, `LayerSweepTypeDecider` past `rootNode()`), and re-evaluates the recursion of
  `countCurrentNumberOfCrossings` (kept recursive: bounded by hierarchy depth, C7).
- **7f:** three branches of the 7c classes need label dummies (`LongEdgeSplitter.ts:166,169`, `SortByInputModelProcessor.ts:159`); the
  `preserve_order` models with edge labels are refused by the 7c recorder, so 7f re-runs
  `SortByInputModelProcessorTest` over them (it runs on two authored label-free graphs now) and
  `PortListSorterTest.testMonotonicalCoordinates` (needs P4/P5 and `LongEdgeJoiner`).

**Hand-offs found during the run.**

- **Every phase mission (7d, 7e):** the E1 recipe held without a new lazy read: enum into `NON_LEAF_DEFAULT_TYPES`
  and regenerate first (T2), cached static getters for every `*_PROCESSING_CONFIGURATION`, the entry-point fitness
  test after wiring; no entry-order import.
- **Every mission (C6):** two boxed/float sites this time — `ModelOrderBarycenterHeuristic.java:90-91` (`Integer !=`
  → `JavaInteger.sameValueOfBox`) and `ForsterConstraintResolver.java:259-262` (`floatValue() ==` → `Float32`
  on both sides); `int` differences in comparators go through `Int32.sub`.
- **Every mission (C13):** a melk list-literal default (`#[…]`) is unmodifiable in Java; the emitter freezes it and
  `ElkReflect.isCloneable` rejects frozen objects, so `getProperty` does not store it. Any option with a list default
  added later inherits this; a `Cloneable` Java default (e.g. `KVector`) is still stored.
- **Recorder identity hashes (AD-10):** under `-XX:hashCode=2` every identity hash is the same value, so comparators
  that break ties on `hashCode()` (`HyperedgeCrossingsCounter`'s hyperedge and corner comparators) tie: the port
  returns 0 there and a later mission that meets such a tie-break must keep the recorder flag or record the hashes.
- **Replay helpers:** the 7c order dump lists baseline edges a processor detached (null ends); the 7b `phaseDump`
  alone does not. `compareOrderFullDump` applies no class twins (`JAVA_CLASS_TWINS` is `compareOrder`'s), so a full
  dump with a `HashMap`-valued property under a hand-placed layering mismatches: extend the twin map when a later
  mission needs such a row.
- **Sweep conventions:** INTERACTIVE cases run on the on-disk positions (7b convention); edgeless levels are skipped;
  the oracle sweep runs in about 40 s and the TS replay in 48 s at stride 2 (`ORDER_SWEEP_STRIDE=1` ≈ 90 s).
- **Follow-ups:** the `devAssert` helper named in the translation rules was never created (Java `assert`s are
  omitted, as every mission so far); crossing-count sums in `SwitchDecider`, `LayerSweepTypeDecider` and the
  thoroughness loops use plain `+` while `Counting`/`GraphInfoHolder` use `Int32.add` (unreachable wrap, inconsistent
  style); `PortListSorterTest`'s `@Configurator` (per-node `FIXED_ORDER` + `PORT_INDEX`) is not expressible as row
  options; `InvertedPortProcessorTest.testValidNodeOrder` is vacuous on the 13 ptolemy rows; the recorder is at 2,995
  of its 3,000-line cap, so 7d's recorder starts a new launcher (B7); the recorded full dump of a post-P3 row holds no
  port sides or anchors for layered nodes, so `SweepCopy`'s N/S side switch is visible only through the port order (a
  later recorder should dump layered node bodies); the site-row replay block (`replaySite`/`siteFactories`) is
  duplicated across the anchored test files and belongs in `test/helpers/` (cleanup); parallel agent briefs must name
  a private scratchpad subdirectory (two T12 agents overwrote each other's scratch script).

## Revision 2026-11-03 (layered-crossing-min-tests)

Appended; no earlier line is edited. Source: T1–T9 in `plans/layered-crossing-min-tests/decisions.md`; the journal is
`plans/layered-crossing-min-tests/decision-journal.md`. Where this section conflicts with the text above, this section
wins.

**Row 7c-tests is done.** The three greedy-switch graph creators (`test/helpers/TestGraphCreator.ts` with
`MockRandom`, `InLayerEdgeTestGraphCreator.ts`, `NorthSouthEdgeTestGraphCreator.ts`) and the fourteen unit-level
suites of P3 (p3order 6, counting 3, greedyswitch 5: 211 tests, 280 runs, 8 `@Ignore` methods as `it.skip`) are
ported with the Java tests' own literals as expectations (T1, AD-13); `tools/oracle/java-tests.sh` (T2) proves the
same 280 runs on the oracle build. No port defect surfaced (no T7 fix); the suites newly reach three of 7c's
"U nested" arms (`plans/layered-crossing-min-tests/coverage.md`). Counts in `docs/conformance.md#alg-layered-ordering`,
runbook in `docs/architecture/alg-layered.md` § 9.6.

**Scope moves (T8, amends 7c C1).**

- The root `org.eclipse.elk.alg.layered.TestGraphCreator` (1,217 lines) is referenced by no Java file: unported.
- `ConcreteSortByInputModelTest` (32) and `AllowNonFlowPortsToSwitchSidesTest` (6) call `LayeredLayoutProvider.layout`
  and assert coordinates and edge intersections: they pass on the oracle and move to **7f**.

**Hand-offs.**

- **7d (`BasicNodePlacementTest`), 7e (`BasicEdgeRouterTest`), later rows (`InLayerConstraintProcessorTest`,
  `Issue726Test`, `Issue734Test`):** build on `test/helpers/TestGraphCreator.ts`; its header lists the overload
  mapping, the public fields `graph`/`random`, and that north/south or fixed-order builders need
  `LayoutMetaDataService.initElkReflect()` first. The 7g self-loop suites use their own `SelfLoopTestGraphCreator`.
- **Every later mission's JUnit baseline:** `bash tools/oracle/java-tests.sh <fqcn…>` (one JVM per class, `-XX:hashCode=2`,
  one `runs= failures=` line each; a class that cannot load counts as `runs=1 failures=1`); run it at mission start
  and end and cite the counts in the conformance doc. Expected values come from the Java literals when the suite is
  unit-level (T1); a full-layout suite needs recorded rows.
- **7h:** the hierarchical sweep and greedy switch now carry a Java-derived check (17 nested cases in the p3order
  suites, `switchingDummyNodesNotifiesPortSwitch` in `SwitchDeciderTest`); 7h still re-measures the nested group with
  recorded rows, starting from the 61 branch arms and 3 functions `coverage.md` lists as untaken.
- **Agent rule for ported suites:** an agent may add no assertion the Java lacks (T4 added eight count checks that the
  orchestrator removed before committing); the review step checks the port against the Java before the commit.

## Revision 2026-11-02 (layered-node-placement)

Appended; no earlier line is edited. Source: N1–N12 in `plans/layered-node-placement/decisions.md`; the journal is
`plans/layered-node-placement/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7d is done.** `p4nodes` (4 placers, 22 files with sections and nested types), `p4nodes.bk` (7 classes, 19
files), the five intermediate processors a P4 stop needs and the 5 + 5 enum arms that create them are ported and
proven by `layered-placement.json` (604 oracle rows with geometry: 494 pipeline rows recorded through
`ElkLayered.runLayoutTestStep` at the P4 stop and at each processor, 84 scenario rows, 26 site rows), the ported
`BasicNodePlacementTest` invariant over 15 runs (the Java suite `runs=8008 failures=0` on the oracle at start and end),
an 8,410-case hash sweep over all ptolemy models (1,970 reach P4 before 7e/7g; all match) and 27 anchored unit cases;
design, idioms and runbook in `docs/architecture/alg-layered-placement.md`, counts in
`docs/conformance.md#alg-layered-placement`. The pipeline still does not run (`ElkLayered`, `GraphConfigurator` →
7f). The enum tally is now 7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9 (B9 table amended by N1).

**Scope moves (binding for 7e–7h).**

- **N1:** `InnermostNodeMarginCalculator`, `LabelAndNodeSizeProcessor`, `InLayerConstraintProcessor`,
  `HierarchicalPortDummySizeProcessor`, `NodePlacementRepeater` moved from 7f to 7d (done). Refusal categories fixed
  by the 7d recorder: `HYPEREDGE_DUMMY_MERGER` → **7e**; `LABEL_DUMMY_SWITCHER`, `LABEL_SIDE_SELECTOR`,
  `END_LABEL_PREPROCESSOR`, `CENTER_LABEL_MANAGEMENT_PROCESSOR`, `END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR`,
  `COMMENT_NODE_MARGIN_CALCULATOR`, `ALTERNATING_LAYER_UNZIPPER` → **7f**; `SELF_LOOP_PORT_RESTORER`,
  `SELF_LOOP_ROUTER`, `SINGLE_EDGE_GRAPH_WRAPPER`, `BREAKING_POINT_PROCESSOR` → **7g**.
- **7e:** `HIERARCHICAL_PORT_POSITION_PROCESSOR` (every placer's `HIERARCHY_PROCESSING_ADDITIONS`, before P5) and
  `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` stay 7e; `HYPEREDGE_DUMMY_MERGER` refuses most ptolemy P4 levels (5,880
  sweep cases and 14 model levels), so 7e re-sweeps at the P4 and P5 stops. A P5 recorder starts from the 7d recorder's
  geometry core (`geometry` field, N3 presence rule, `PLACEMENT_CROSSCHECK`) in a new launcher (B7: the 7d one is at
  2,972 of 3,000 lines).
- **7f:** `DotDebugUtil` and `JsonDebugUtil` replace the staged `src/alg/layered/DebugUtil.ts` (`staged-classes.json`);
  the label processors unlock the `LABEL_DUMMY_INSERTER` models (16 accepted refusals); `GraphConfigurator`'s
  `NODE_PLACEMENT_REPEATER` rule needs only the `recomputeNodePlacement` property check (the `anyMatch` is always true).
- **7h:** no untaken 7d site needs nested graphs; the hierarchical additions are measured at P5.

**Hand-offs found during the run.**

- **Every phase mission (7e):** the E1 recipe held again without a new lazy read (enum into `NON_LEAF_DEFAULT_TYPES`
  and regenerate first, cached static configuration getters, the entry-point fitness test after wiring).
  `IntermediateProcessorStrategy.ts` is at 499 of 500 lines: the next arm wired there needs a split of the enum file
  (a section file for the `create` switch, Java order kept).
- **Row format and the 5 MiB cap (N3):** a 7c-shaped row is two thirds `changed`; a P4 variant family costs 20–95 KB
  per level, a full-dump site row 6–15 KB. `layered-placement.json` is 644 bytes under the cap after a variant-set
  trim and six unrecorded variant rows. **Decision needed before the next recording that touches it:** a higher cap, a
  second ref file per group, or a compacter `changed` encoding (a journal flag).
- **L4 in agent briefs:** three agents wrote hand-built tests whose behavioural expectations came from reading the
  Java; all were removed before commit and routed through T9 → T11 → T12. Briefs for ported classes should state the
  rule in the agent prompt ("every behavioural literal is an oracle row or a twin comparison").
- **Row inventories and site rows:** a class test that pins its row ids by selector must list the `sites/*` rows of
  its class once T11 lands (six inventories failed the batch-5 coverage gate until listed, in recorded order).
- **Scenario design (T1, T11):** a port with two or more edges puts `HYPEREDGE_DUMMY_MERGER` in the plan; the plan
  after P3 is `TWO_SIDED_GREEDY_SWITCH`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`,
  `INNERMOST_NODE_MARGIN_CALCULATOR`, then `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`; a labelled N/S external dummy is
  replaced by a label-less copy under `FIXED_SIDE` or higher, so those label arms need a chain-forced row; a forced
  mid-gap crossing needs `CROSSING_MINIMIZATION_STRATEGY=INTERACTIVE` with positions and `layerConstraint=FIRST`;
  `EdgeAndLayerConstraintEdgeReverser` reverses every edge of a node whose ports are all inverted; the string `FIXED`
  is not a `PortLabelPlacement` (pass the empty set).
- **Recursion twins (N6):** the verbatim twins overflow at depth 5,000 with and without `--jitless` (the generator-based
  list iterators' frames); loops are proven on the rows and at depth 200, the deep case proves no overflow.
- **Follow-ups:** `BKNodePlacerFeasibility`'s infeasible arms are unreachable by construction (52,000 random graphs),
  as is `improveTwoPath`'s "neither case" arm (by reading); the `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` rows hold at
  most one N/S dummy per layer, so its `delta`/`step` values are proven by reading only (a two-dummy site row is a
  7e candidate); the per-file factories object is duplicated across every anchored test file (the 7c cleanup, still
  open); `ThresholdStrategySimpleThresholdStrategy.ts:88` is executed by a row but anchorable by no position; the
  `devAssert` helper is still unwritten (five Java `assert` lines omitted this mission).

## Revision 2026-11-03 (layered-edge-routing)

Appended; no earlier line is edited. Source: R1–R14 in `plans/layered-edge-routing/decisions.md`; the journal is
`plans/layered-edge-routing/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7e is done.** `p5edges` (3 classes), `p5edges.orthogonal` with `direction` (11 classes, 17 files with sections
and nested types), `p5edges.splines` (6 classes, 15 files), the six intermediate processors a routed result needs (9
files) and the 3 + 6 arms that create them are ported and proven by `layered-routing.json` and
`layered-routing-steps.json` (943 oracle rows with edge geometry: 666 pipeline rows recorded through
`ElkLayered.runLayoutTestStep` at the P5 stop of each router and at each processor, 94 scenario rows, 25 site rows,
158 direct-call rows), the three ported JUnit invariants (`BasicEdgeRouterTest`, `Issue726Test`,
`LayerSizeAndGraphHeigthCalculatorTest`; the Java suites `runs=550 / 550 / 1 failures=0` on the oracle at start and
end), a 6,728-case hash sweep over all ptolemy models at the P4 and three P5 stops (6,280 ok; all match at stride 1)
and 62 anchored unit cases; design, idioms and runbook in `docs/architecture/alg-layered-routing.md`,
counts in `docs/conformance.md#alg-layered-routing`. The pipeline still does not run (`ElkLayered`,
`GraphConfigurator` → 7f). The enum tally is now 7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9 (B9 table amended by R1).

**Scope moves (binding for 7f–7h).**

- **R1:** `HyperedgeDummyMerger`, `HierarchicalPortPositionProcessor`, `LayerSizeAndGraphHeightCalculator`,
  `LongEdgeJoiner`, `NorthSouthPortPostprocessor`, `FinalSplineBendpointsCalculator` are 7e (done); `SplineSegment` is
  unstaged. 7f keeps `HierarchicalPortOrthogonalEdgeRouter`, `HypernodesProcessor`, `ConstraintsPostprocessor`,
  `EndLabelSorter`, `HierarchicalNodeResizer`, the label and comment processors and `AlternatingLayerUnzipper`; 7g keeps
  self loops, wrapping and compaction. Refusal categories fixed by the 7e recorder: `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER`,
  `HYPERNODE_PROCESSOR`, `CONSTRAINTS_POSTPROCESSOR`, `COMMENT_POSTPROCESSOR`, `LABEL_DUMMY_REMOVER`,
  `END_LABEL_POSTPROCESSOR`, `END_LABEL_SORTER`, `HIERARCHICAL_NODE_RESIZER` → **7f**; `SELF_LOOP_POSTPROCESSOR`,
  `BREAKING_POINT_REMOVER`, `HORIZONTAL_COMPACTOR` → **7g**.
- **7f:** `ElkLayered`, `GraphConfigurator` (the plan builder must name `GraphTransformer` by position: it is both
  `DIRECTION_PREPROCESSOR` and `DIRECTION_POSTPROCESSOR`; with `feedbackEdges=true` `PORT_SIDE_PROCESSOR` moves before
  P1; `NODE_PLACEMENT_REPEATER` needs only the property check), the full-layout issue tests `Issue587/680/682`,
  `DotDebugUtil`/`JsonDebugUtil` for the staged `DebugUtil` (the orthogonal generator's guarded call is in place), the
  `NorthToSouth`/`SouthToNorth` direction strategies (ported, run only from the hierarchical router), the
  `HyperedgeDummyMerger` label-dummy paths (13 untaken arms), the 18 `LABEL_DUMMY_INSERTER` accepted refusals.
- **7g:** `NorthSouthPortPostprocessor.processSelfLoop` and the self-loop arms of the three routers (reached in 7e only
  on chain-forced rows that omit `SELF_LOOP_PREPROCESSOR`; E–E/W–W loops reach the routers, N–N loops become dummies),
  the self-loop spline router over `NubsSelfLoop` (no caller at this commit; its five factories are proven by call
  rows), `inverseOrder`/`SPLINE_SURVIVING_EDGE` in the bend-point calculator (`BreakingPointRemover`), the compaction
  arms (`segmentAllowsSloppyRouting`'s near arms are proven by option-only rows, the far arms are unreachable by the
  horizontal placement), the 112 `SELF_LOOP_PREPROCESSOR` sweep levels (re-sweep then). **R9 verdict to recheck:** the
  JVM order of the spline router's `HashSet<Pair<…>>` was unobservable in 7e; `getSplinePath` reads the first edge of a
  hyperedge under a compaction strategy other than `NONE`.
- **7h:** no untaken 7e site needs nested graphs.

**Hand-offs found during the run.**

- **Every phase mission:** the E1 recipe held again with no new lazy read (`EdgeRouting` is a core leaf enum; the
  routers' configurations are cached getters; the enum's `create` chain is a section importing the enum as a type).
- **Landed-helper gaps are twinned in the mission's own helpers, never by editing a landed one:** the 7a dump context
  names a removed element as a fresh `ref` (the recorder writes `{class}`), the 7b enum registry closes its list, the
  7b row loader closes its group list; a new ref group (`calls`) and a processor that removes elements both need the
  mission's helper to re-apply the recorder's rule.
- **Row inventories and `CALLERS` tables:** a new row family breaks every test that pins ids or counts by selector
  (six files in 7e) and every callers table; update them in the same commit as the rows.
- **Caps:** `layered-routing.json` is 52,641 bytes under 5 MiB; the recorder is at 2,998 of 3,000 lines (its sweep modes
  are a sibling launcher `LayeredRoutingSweep.java`, compiled together); `layered-placement.json` is still 644 bytes
  under the cap (7d flag, unchanged). **Decision needed before the next recording that touches either:** a higher cap,
  a second ref per group, a compacter `changed` encoding, or a second launcher per recorder.
- **Seeds:** the first `nextInt(2)` of `java.util.Random` is identical for seeds 1–40; a row that must record both
  outcomes of a draw scans seeds with a spread (4096, 5000, 12345).
- **Oracle throws on six hierarchical-port levels** under POLYLINE/SPLINES (`AdjacencyList` NPE: only the orthogonal
  router adds `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`): candidate upstream report; the recorder's `ORACLE_THROWS` list
  is the only skip of a throwing level.
- **Follow-ups:** the three Medium splitter arms (`HyperEdgeSegmentSplitter.ts:220 if[1]`, `:400 if[1]`, `:406 if[1]`:
  a 1-ulp spacing could reach the last two); the `devAssert` helper is still unwritten (nine Java `assert` lines
  omitted this mission); the per-file factories/callers objects are duplicated across the anchored test files (the 7c
  cleanup, still open); `HyperEdgeSegment.toString` arms and the `NubSpline` no-caller members are pinned structurally.

## Revision 2026-11-03 (caps raised)

User decision after mission 7e's stop 14, superseding the 7d and 7e "decision needed" cap hand-offs above:

- **Ref cap: 16 MiB per file** under `test/golden/refs/java/` (was 5 MiB). `layered-placement.json` (644 bytes under
  the old cap) and `layered-routing.json` (52,641 under) keep their trimmed variant sets; a later mission that touches
  either may restore trimmed rows instead of adding a second ref per group.
- **Recorder cap: 5,000 lines per launcher** (was 3,000). Sweep/dump modes may live in the recorder again; the sibling
  launcher (`LayeredRoutingSweep.java`) stays as the 7e shape, not a rule.
- The five layered recorders' `MAX_BYTES` constants and throw messages now say 16 MiB; the next brief's stop 13 uses
  the new numbers (`plans/layered-edge-routing/decision-journal.md`, row `caps`).


## Revision 2026-11-05 (layered-pipeline)

Appended; no earlier line is edited. Source: F1–F16 and FX1–FX8 in `plans/layered-pipeline/decisions.md`; the journal is
`plans/layered-pipeline/decision-journal.md`. Where this section conflicts with the text above, this section wins. It is
the binding input of the 7f2 brief.

**Row 7f's first brief is done.** `ElkLayered` (with two section files), `GraphConfigurator`, the eight `components`
classes, `GraphTransformer`, `HierarchicalPortOrthogonalEdgeRouter`, `EndLabelSorter`, `HypernodesProcessor`,
`ConstraintsPostprocessor` and their six arms are ported; `LayeredLayoutProvider.layout` runs. Evidence:
`layered-pipeline.json` (1,239 rows: `full` 199, `models` 905, `scenarios` 93, `sites` 42; 1,181 replayed at AD-4, 58
pinned), the four ptolemy goldens equal, the 2,351 landed `models` rows re-replayed through the real driver (2 pinned),
28 Java suites ported with oracle `failures=0` at start and end, a 6,646-case sweep matching exactly at stride 1, and 58
anchored cases. No numeric divergence from the oracle.

**Scope moves, binding for 7f2–7h (F1).** Row 7f is split into 7f (`layered-pipeline`, done) and 7f2
(`layered-labels`). `components` moved from 7h to 7f, except `ComponentsCompactor` (staged, 7g).
`HierarchicalNodeResizingProcessor` moved from 7f to 7h. The processor enum's tally is 7b 10, 7c 10, 7d 5, 7e 6, 7f 6,
7f2 12, 7g 9, 7h 1; the stage marker accepts `7f2`.

**Hand-offs to 7f2 (`layered-labels`).**

- Port `LabelDummyInserter`, `LabelDummySwitcher` (staged), `LabelDummyRemover`, `LabelSideSelector`,
  `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor` (both arms), `CommentPreprocessor`,
  `CommentNodeMarginCalculator`, `CommentPostprocessor`, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`,
  `DotDebugUtil`, `JsonDebugUtil` and `DebugUtil` (staged).
- **FX5:** flip `site/provider/flat` and `site/provider/cancelled` (`test/helpers/layered-site-replay.ts`) from the 7f2
  throw to comparing their recorded layout.
- **FX6, FX7:** delete the 2 `layered-phases.json` and 57 `layered-pipeline.json` entries naming 7f2 in
  `test/helpers/layered-pipeline-pinned-rows.ts`; the rows must then replay their recorded expectations.
- **FX2:** record a scenario with end labels on parallel edges that share source port, target node and target port,
  compared with the oracle; a mismatch in `EndLabelSorter`'s map order is stop 17 with evidence.
- Accepted label and comment refusals of `layered-pipeline.json` (19 `full` rows, 114 `models` rows) and of the earlier
  refs become recordable; the label arms of `HyperedgeDummyMerger` (13 untaken) and the label arms carried from 7c–7e.
- `NodeMarginCalculatorTest` gains its `CommentNodeMarginCalculator` and `EndLabelPreprocessor` hooks; `Issue871Test`
  (one test has edge labels) and the 11 suites `suite-allocation.md` assigns to 7f2 are ported then.
- `EndLabelSorter`'s sort body and `ConstraintsPostprocessor`'s logging arms (U in `unreached.md`) become reachable.

**Hand-offs to 7g.** Port `ComponentsCompactor` (staged) and `compaction/*`; the self-loop family: 600 sweep cases (112
levels × 3 routers, 66 whole models × 4 directions) are refused today, the `PIPELINE_SUITES_FULL=1` corpus suites fail
195 cases (3 × 65 models) on `SelfLoopPreProcessor`, and one `layered-pipeline.json` row is pinned to it (FX7);
`NodeMarginCalculatorTest` gains its `SelfLoopRouter` hook; R9's recheck of `getSplinePath` under compaction; the 10
suites allocated to 7g.

**Hand-offs to 7h.** Port `HierarchicalNodeResizingProcessor`, `CompoundGraphPreprocessor` and
`CompoundGraphPostprocessor` (staged); the hierarchical driver path (`doCompoundLayout`, `hierarchicalLayout`,
`ElkLayeredHierarchy.ts`, U in `unreached.md`); the `include-children*` provider rows, which expect the 7h throw today;
the 9 suites allocated to 7h.

**Flags for the user.**

- The label metrics (FX8) are a macOS JVM snapshot; a different JDK or OS may measure differently, so a re-record on
  another platform is a decision, as for any vector.
- `../elk` HEAD is 22 commits past the pin with no change in the layered, core, common or test bundles; recheck the diff
  in each mission.

**Follow-ups (cleanup, outside this mission's write-sets).** `ElkLayered.test.ts`'s 199-row loop duplicates
`LayeredPipelineVectors.test.ts`'s `full` group; `tools/corpus/ts-layout-compare.ts` registers no layered algorithm;
`src/java/util/LinkedList.ts`'s header claims identity equality for every ELK element (false for `KVector`);
`test/helpers/junit-delta.ts` and the private delta helper of `edge-route-orthogonal.ts` overlap; the older
`test/helpers/elkt-layout-harness.ts` beside the new runner; the per-file factories objects of the anchored tests; the
`devAssert` helper is still unwritten.

## Revision 2026-11-06 (layered-labels)

Appended; no earlier line is edited. Source: G1-G12, G3a and G11a in `plans/layered-labels/decisions.md`; the journal is
`plans/layered-labels/decision-journal.md`. Where this section conflicts with the text above, this section wins. It is
the binding input of the 7g and 7h briefs.

**Row 7f's second brief is done.** `LabelDummyInserter`, `LabelDummySwitcher` (unstaged), `LabelDummyRemover`,
`LabelSideSelector`, `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor` (both arms), the three
comment processors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, `DotDebugUtil`, `JsonDebugUtil` and
`DebugUtil` (unstaged) are ported and their 12 arms wired; `LayeredLayoutProvider.layout` runs labels, comments,
unzipping and logging. Evidence: `layered-labels.json` (`rowCounts` `full` 399, `models` 640, `scenarios` 224, `sites`
42; 1,316 test cases replay at AD-4 with logged graphs per G3 and G3a), the 59 rows pinned to 7f2 replay their recorded
expectations, `site/provider/flat` and `cancelled` compare their recorded layout (FX5), FX2's parallel-end-label rows
equal the oracle, 11 Java suites ported (oracle baseline equal at mission start; at mission end equal
as well), a 1,105-case label sweep (935 ok hash-match at stride 1, 155 refused in 7g/7h categories, 15
throws equal on both sides; final run identical), 86 anchored cases. No port defect
was found by the replay; the helper fixes of T2 are in the journal.

**Enum tally after 7f2.** 49 arms ported, 10 pending: 7g 9, 7h 1 (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12).

**Hand-offs to 7g.**

- Port the 9 pending arms `SelfLoopPreProcessor`, `SelfLoopPortRestorer`, `SelfLoopPostProcessor`, `SelfLoopRouter`,
  `BreakingPointInserter`, `BreakingPointProcessor`, `BreakingPointRemover`, `SingleEdgeGraphWrapper` and
  `HorizontalGraphCompactor`, plus the staged `ComponentsCompactor`.
- The one row still pinned: `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`
  (`test/helpers/layered-pipeline-pinned-rows.ts`); 7g deletes the entry and the recorded expectation then applies.
- Accepted 7g refusals to convert into rows: in `layered-labels.json`, 1 `full` row
  (`full/labels/ticket-213_componentsCompaction`, `COMPACTION_CONNECTED_COMPONENTS`); in the label sweep, 105 cases
  (`SELF_LOOP_PREPROCESSOR` 75, `HORIZONTAL_COMPACTOR` 25, `COMPACTION_CONNECTED_COMPONENTS` 5); the earlier refs'
  refusals stand as 7f's revision lists them.
- Unreached arms that need 7g (U in `plans/layered-labels/unreached.md`): 3 items. The corpus-wide runs of
  `LabelDummyRemoverTest` and `LabelSideSelectorTest` (`PIPELINE_SUITES_FULL=1`) fail 132 cases, all on
  `SelfLoopPreProcessor`; `NodeMarginCalculatorTest`'s `SelfLoopRouter` hook stays 7g.
- Suites: the 10 allocated to 7g by `plans/layered-pipeline/suite-allocation.md`; the baseline of the oracle runs is
  taken at 7g's start.

**Hand-offs to 7h.**

- Port `HierarchicalNodeResizingProcessor` (the 1 pending arm) and `CompoundGraphPreprocessor` and
  `CompoundGraphPostprocessor` (staged); the hierarchical driver path (`doCompoundLayout`, `hierarchicalLayout`,
  `ElkLayeredHierarchy.ts`).
- `include-children*` provider rows still expect the 7h throw (`test/helpers/layered-site-replay.ts`); 7h flips them.
- Accepted 7h refusals: 0 in `layered-labels.json`; 50 sweep cases (`INCLUDE_CHILDREN`). Unreached arms that need 7h: 7
  U items of `unreached.md` (hierarchical, nested-graph logging among them).
- Suites: the 9 allocated to 7h.
- Vendor new models outside `inputs/realworld/` (`.agent-notes/layered-pipeline.md`: `LayeredFrameworkVectors` closes
  that tree); 7f2's are under `inputs/labels/`.

**Flags for the user (open decisions).**

- Upstream (G10, stop 22): `fix/end-label-group-self-add` and `fix/end-label-group-order` are local, unsigned and not
  pushed, in worktrees `../elk-end-label-group-self-add` and `../elk-end-label-group-order`; the sign, push and PR
  commands are in the journal's T18 rows. The issue draft on `BF_MODEL_ORDER`/`DF_MODEL_ORDER` is never filed. Later
  candidates, each needing a judgement on intended behaviour: the visitor's `IndexOutOfBoundsException`
  (`InteractiveLayeredGraphVisitor.java:650`), `EndLabelPreprocessor`'s dead `LabelSide.ABOVE` arms,
  `EdgeAndLayerConstraintEdgeReverser`'s dead label checks (`:297,338`).
- G3 as written said property order is insertion order; G3a (user) replaced it by identity-hash normalisation, and the
  port iterates properties as the landed `JavaHashMap` does, compared as a multiset.
- The label metrics (FX8) remain a macOS JVM snapshot, now 2,258 entries; a re-record elsewhere is a decision.
- Upstream prose typo corrected at the port site (`LabelManagementProcessor`, "edge Unand tail labels"), listed in
  `docs/conformance.md`.
- `../elk` HEAD `b715fb1`; the diff to the pin over the layered, core, common and test bundles is empty; recheck in each
  mission.

**Follow-ups (outside this mission's write-sets).** Five mutation survivors in `LabelDummySwitcherSpaceEfficient.ts`
need a new oracle graph to discriminate; 7f's cleanup follow-ups stand.

## Revision 2026-11-10 (layered-loops-wrapping-compaction)

Appended; no earlier line is edited. Source: W1-W14 in `plans/layered-loops-wrapping-compaction/decisions.md`; the journal is
`plans/layered-loops-wrapping-compaction/decision-journal.md`. Where this section conflicts with the text above, this section
wins. It is the binding input of the 7h brief.

**Row 7g is done (tasks T1-T22).** The self loop package (`intermediate/loops` with `ordering` and `routing`), the four self loop
processors, `DummySelfLoopProcessor`, `intermediate/wrapping`, `intermediate/compaction`, the layered
`compaction/{oned,components,recthull}` and `ComponentsCompactor` are ported, and the 9 pending arms are wired;
`LayeredLayoutProvider.layout` runs self loops, `SINGLE_EDGE` and `MULTI_EDGE` wrapping, post compaction and
`compaction.connectedComponents`. The formerly pinned row `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`
replays its recorded expectation, and `full/labels/ticket-213_componentsCompaction` is a row of the new ref.

**Enum tally after 7g.** 58 arms ported, 1 pending: 7h `HIERARCHICAL_NODE_RESIZER` (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9).

**Evidence.**

- `layered-loops.json` (16,358,809 bytes): `full` 731, `models` 307, `scenarios` 525, `sites` 64; `LayeredLoopsVectors.test.ts`
  replays every row of the four groups with 0 mismatches (1,637 tests, about 8 s alone; budget 30 s);
  `LayeredLoopsSites.test.ts` replays the 64 `sites` rows again under their scenario titles.
- 10 Java suites ported with their own assertions (16, 2, 5, 3, 2, 1, 1, 1, 1, 1 oracle runs); the start run equals the
  baseline; the end run equals the start run.
- Corpus-wide runs (`PIPELINE_SUITES_FULL=1`): 550, 550, 2,200, 550 + 1, 551 + 1 and `PortListSorterTest` 1,114, 0 failures,
  equal to the oracle's counts.
- Loops sweep: 3,073 oracle cases (part a 600, b 105, c 2,368; 2,997 ok, 76 throws); TS at stride 1: 2,997 hash-equal, 0
  mismatches, 76 throws on both sides.
- Twins: every iterated identity-keyed container of W6 is order-independent on the rows that reach it; R9 holds for
  `SplineEdgeRouter.getSplinePath` (254 rows), and one site (`collectVerticalSegmentsSplines`, 7 of 56 multi-edge rows)
  matches only in insertion order (issue #54).
- Coverage 98.78 / 96.75 / 98.77 / 98.79 after batch 10; coverage map `unreached.md` (372 items: S 97, J 43, U 211, X 21);
  174 anchored cases; mutation checks killed 121 of 137 mutants (5 equivalent or dead, 11 survivors).
- Landed vectors and goldens unchanged; the refs diff adds `layered-loops.json`, `inputs/loops/**` (40 inputs), the sweep test,
  and appends 43 label texts (2,258 to 2,301 keys) to `layered-label-metrics.json`.

**Decisions taken during the run.**

- Task boundary move (batch 2): T5 ported `SelfLoopPreProcessor`, T9 `SelfLoopPortRestorer`, T13 `SelfLoopRouter` and
  `SelfLoopPostProcessor`, so each self loop package met its oracle rows in the batch that ported it.
- Entry-point resolution (T15 `fix`): the cycle through `SplineSelfLoopRouter`'s `extends` makes `OrthogonalSelfLoopRouter` and
  `PolylineSelfLoopRouter` unusable as entry points; they are entered through the enum (7b decision E1, part 3), leave the
  entry-point lists, and no `src/` change was needed.
- NaN-canonical sweep hash (T19 `fix`): NaN is hashed as the one canonical NaN; every other value keeps its raw bits.
- Removed ptolemy filter (T17 `fix`): `ptolemy-suite-sources.ts` no longer excludes `gt_sinewaveoptimization_*`.
- Label-manager twin follows the row's recorder (T20 `fix`).
- Two W9 assertion changes moved between tasks: the `ComponentsCompactor`-related pins of `ComponentsProcessor.test.ts` moved
  from T15 to T12 (the placers construct the compactor without the enum), and `NodeMarginCalculatorTest`'s scope text and the
  `ptolemy-suite-sources.ts` filter widened in T17 (the filter is outside T17's write-set).

**Hand-offs to 7h.**

- Port `HierarchicalNodeResizingProcessor` (the 1 pending arm, `HIERARCHICAL_NODE_RESIZER`) and `CompoundGraphPreprocessor`,
  `CompoundGraphPostprocessor` and `CrossHierarchyEdge` (staged: `test/architecture/staged-classes.json` holds exactly these
  three rows, mission `7h`).
- The 7h refusal categories of the recorder and the sweep are `INCLUDE_CHILDREN` and `HIERARCHICAL_NODE_RESIZER`; the recorded
  ref has 0 accepted refusals.
- The loops sweep dropped 50 label-sweep (part b) cases refused by `INCLUDE_CHILDREN`; they belong to 7h's sweep.
- `include-children*` site rows of earlier missions (`test/helpers/layered-site-replay.ts`) still expect a throw naming 7h; 7h
  flips them.
- U items of `unreached.md` owned by 7h: the `NorthToSouthRoutingStrategy`/`SouthToNorthRoutingStrategy` arms (`:54 if[1]`,
  `:38`, `:58`, `:78`; they run only from the hierarchical port router) and the `SelfLoopPreProcessor.java:55,90,100` arms that
  need a compound node.
- Inputs that use `elk.stress`: `tickets/layered/665_includeChildrenDoesntStop.elkt` and
  `examples/hierarchy/hierarchicalLayoutMixing.elkt` (both set `hierarchyHandling: INCLUDE_CHILDREN` at the root;
  `.agent-notes/layered-pipeline.md`); the recorders' classpath registers no such algorithm, neither file is in a landed ref,
  and the stress algorithm is not ported.
- Suites: the 9 allocated to 7h by `plans/layered-pipeline/suite-allocation.md`.
- Vendor new models outside `inputs/realworld/`; 7g's are under `inputs/loops/`.

**Flags for the user (open decisions).**

- Issue #53 (`needs-ruling`): the NaN-canonical form amends W5's raw IEEE hex for NaN only; confirm or reject, decide whether the
  landed sweeps adopt it, and whether the NaN layouts join the upstream drafts.
- Issue #54 (`needs-ruling`): 7 `HORIZONTAL_COMPACTOR` rows of `models/splines-hyperedges-hyperedges_1/root` match the oracle
  only in insertion order of `SplineSegment.edges` (R9 at `collectVerticalSegmentsSplines`); the rows pass as recorded.
- Issue #56 (`needs-ruling`): the six upstream drafts of the journal's T22 row (`GraphStats.java:295-302`,
  `LabelPlacer.java:296`, `PortRestorer.java:180-188`, `SplineSegment.java:82`, NaN layouts, oracle throws); nothing is filed.
- Issue #55 (`follow-up`): the mutation survivors and the graphs a discriminating oracle row needs.
- The label metrics table grew by 43 texts (2,258 to 2,301 keys); it remains a macOS JVM snapshot (FX8).
- `../elk` HEAD is 22 commits past the pin; the diff to the pin over the layered, core, common and layered-test bundles is empty.

**Follow-ups (outside this mission's write-sets).** The survivors and unreached graphs of issue #55; `SplineEdgeRouterSegments.ts:137
if[1]` (`SplineEdgeRouter.java:395-404`) has no graph; the cleanup follow-ups of 7f and 7f2 stand.

## Revision 2026-11-10 (layered-compound)

Appended; no earlier line is edited. Source: H1-H14 in `plans/layered-compound/decisions.md`; the journal is
`plans/layered-compound/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T16.

**Row 7h is done.** The `compound` package (`CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`, `CompoundGraphPreprocessor`,
`CompoundGraphPostprocessor`) and `HierarchicalNodeResizingProcessor` are ported, the last pending arm
(`HIERARCHICAL_NODE_RESIZER`) is wired, and the hierarchical driver of 7f (`doCompoundLayout`, `hierarchicalLayout`,
`ElkLayeredHierarchy.ts`) is proven against the oracle with no defect found in it. `LayeredLayoutProvider.layout` runs every
hierarchy-handling mode, `INCLUDE_CHILDREN` included. Design and runbook: `docs/architecture/alg-layered-compound.md`; counts:
`docs/conformance.md` § alg.layered, part i.

**Enum tally after 7h.** 59 arms ported, 0 pending (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9, 7h 1).
`test/architecture/staged-classes.json` is `[]`: the staged list is empty.

**Evidence.**

- `layered-compound.json` (12,237,513 bytes): `full` 355, `models` 73 (whole-tree stops), `scenarios` 88, `sites` 24 (19 run
  rows, one of them logged, and 5 throw rows); `LayeredCompoundVectors.test.ts` replays every row through the real driver with 0
  mismatches (542 tests, 5.3 s alone at batch 7; budget 30 s); `LayeredCompoundSites.test.ts` 27 tests.
- Goldens: 24 refs under `test/golden/refs/elk-layered/` (four ptolemy hierarchical models × six direction and hierarchy
  variants, `-XX:hashCode=2`, named in `_meta.json`), equal to the TS layout at AD-4; byte-equal to a run without the flag;
  `refs/elk` and `refs/elk-algorithms` regenerate byte-identically.
- Suites: 97 of 97 `alg.layered.test` Java files ported (the nine issue suites and `SelfLoopTestGraphCreator`'s helper); the
  3 graph.json methods deferred to 7h ported (`EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest`); the
  oracle runs at mission start and at mission end equal the baseline (`docs/conformance.md`).
- Compound sweep: 1,169 oracle cases (part a 45, b 100, c 1,024; the 50 label-sweep refusals of 7g are part a's enumeration, 45
  after the stress filter): 1,164 ok, 5 throws, 0 timeouts, 0 refusals; TS at stride 1: 1,164 hash-equal, 5 throws equal, 0
  mismatches.
- Twins: five of the six hashed-container sites of the 7h classes are order-independent on every row that reaches them (369,
  297, 67, 197 and 321 rows, 0 differ); the postprocessor's `crossHierarchyMap.keySet()` order is observable in a shared port's
  edge list in the intermediate tree (7 of 238 rows, 13 ids with the `sites` rows) and not in any export. The order a
  treeified bucket would use is not established; the observable site has at most 6 keys.
- Mutation checks: 206 mutants, 185 killed by the replay stage and the class tests and twins, 21 survivors (equivalent, or reached
  and not observed by a recorded field); the anchored files alone kill 129.
- Coverage of the 7h classes 99.6 / 98.0 / 100 / 99.6 (statements / branches / functions / lines); whole suite after batch 8
  98.82 / 96.83 / 98.78 / 98.82, 956 files, 45,206 tests.
- Landed vectors, goldens and refs unchanged; the refs diff adds `layered-compound.json`, `refs/elk-layered/**`,
  `golden/layered.json`, 31 inputs under `inputs/compound/`, the sweep test, and appends 16 label texts to
  `layered-label-metrics.json`.

**Decisions taken during the run.** The task and journal rows hold each; the ones a later mission should know:

- The compound `models` rows replay through `RecursiveGraphLayoutEngine`, like `full`, not through a direct `doCompoundLayout`
  call (T1); a nested level's plan lacks the P3 sweep and the hierarchical greedy switch, which `hierarchicalLayout` skips
  without notifying.
- The recorder's tree dump gained `layerNodes` (T1 `fix`, before any TS existed); the first recording differs from the second
  only by that field.
- A throw row is a new row shape (`expected.throws` with class, message and the first ELK frame); a replay compares class and
  the frame through a stack inspection (T14).
- H5 part (c) selects no file as worded; `INCLUDE_CHILDREN` is applied at the root of every ptolemy hierarchical file (T13).
- `STRESS_PENDING` lives in `test/helpers/stress-pending.ts`, not in the runner (T11).

**Divergences fixed at origin.** The TS multimaps had no `toString` (`src/guava/Multimap.ts`, T14); the replay comparator's
value-form maps and the `layerNodes` comparison were fixed in the helpers (T6, T7, T8, T9). None was a layout divergence.

**Hand-offs.**

- To 9 (elkt corpus): layered is ready to register for the corpus; `tools/corpus/ts-layout-compare.ts` registers no layered
  algorithm today (a 7f follow-up), so the elkt corpus does not yet compare layered layouts.
- To 8b (`elk.stress`, issue #58, H13): `Issue665Test` (1 case) and `Issue700Test` (2 of 4 cases) wait. Remove `STRESS_PENDING`
  (`test/helpers/stress-pending.ts`) and its uses when stress is ported; the suites then run 1 + 2 more cases. A third stress
  input, `tickets/layered/588_hierarchicalLayoutNPE.elkt`, is read by no 7h suite and is not vendored.
- To 12 (docs site): `docs/architecture/alg-layered-compound.md` is new and linked from `docs/architecture/overview.md`,
  `alg-layered.md` and `docs/conformance.md`; the site publishes `conformance.md` and `overview.md` as wrappers, and no
  `alg-layered-*.md` page is in its `CANONICAL_PAGES` (unchanged from 7a to 7g).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues (`gh issue list --label needs-ruling --state open`):

- #61: the upstream drafts of this mission: U1 `SplineSegment.java:247` (`SPLINES` in `DOWN` or `UP` under `INCLUDE_CHILDREN`),
  U2 `ElkGraphImporter.java:1146` (`425_selfLoopInCompoundNode.elkt`), U3 `LGraphUtil.java:944` (`FIXED_RATIO`, a `null`
  `portNodeSize` from `CompoundGraphPreprocessor.java:182-185`), U4 `LayerSweepCrossingMinimizer.java:193-194` (one option
  tested twice), U5 `HierarchicalNodeResizingProcessor.java:207-220` (`moveExternalPorts` overwritten for nested graphs).
  Nothing is filed upstream.
- #59: 25 handed-over arms neither reached nor proven dead (six of `NorthToSouthRoutingStrategy`/`SouthToNorthRoutingStrategy`,
  19 of 7c's list); they stay as they are.
- #58: the three stress cases above.
- Earlier, still open: #56 (7g upstream drafts), #54 (spline segment edge order under compaction), #53 (NaN-canonical sweep
  hash), #52 (platform of the label-metrics snapshot), #51 (sign and file upstream fixes).
- The label metrics table grew by 16 texts; it remains a macOS JVM snapshot (FX8, #52).

**Follow-ups (outside this mission's write-sets).** `follow-up` issues open: #60 (oracle graphs for the compound mutants no
recorded field observes: G18, D10, D14, D15, D32 D33 D36 D39 D40 D44, the `moveExternalPorts` group, K9 and the others
that need a recorder field), #62 (three p3order test titles that still say "U for the rows until 7h"), #63 (the `STRIP_KEYS`
hand-off of `docs/architecture/elk-json.md` to 7h, which the brief did not carry and which changes landed parse refs), #55
(7g's unobserved arms).

## Revision 2026-11-11 (alg-trees)

Appended; no earlier line is edited. Source: TR1-TR10 in `plans/alg-trees/decisions.md`; the journal is
`plans/alg-trees/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T20; the base is `ab05a29bf42b0c246d18f891c64f740d21b2b9d4`.

**Row 8a is done.** `alg.mrtree`, `alg.radial` and `alg.vertiflex` are ported to `src/alg/{mrtree,radial,vertiflex}/` with
their generated options and providers (issue #37). `RecursiveGraphLayoutEngine` lays out a graph with each once its provider is
registered. Design and runbook: `docs/architecture/alg-trees.md`; counts: `docs/conformance.md` § Tree algorithms. The final
commit is one squashed commit `feat(trees): port mrtree, radial and vertiflex (8a)` with `Refs: #37`; the per-task history is
under the tag `alg-trees/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14`, `-XX:hashCode=2`, cold re-records `cmp`-identical at mission end): `mrtree.json` 188 rows
  (full 122, stops 54, throws 12), `mrtree-extra.json` 213 (140 / 68 / 5), `radial.json` 309 (148 / 150 / 11),
  `vertiflex.json` 471 (247 / 216 / 8), `mrtree-units.json` 2,656 (`edgeRouter` 422, `cyrusBeck` 46, `orderBalance` 18,
  `average` 2,170). Every row replays through the real provider with 0 mismatches except the two classified radial rows
  (`i30/rand-chain-big`, issue #64).
- Goldens: the `trees` set, 40 refs under `test/golden/refs/elk-trees/` (37 from T4 and 3 retargeted), equal to the TS layout at
  AD-4; `default`, `algorithms` and `layered` regenerate byte-identically.
- JUnit: `MrTreeGraphSizeTest` 6 of 6, `CenterOnRootTest` 2 of 2; oracle 6 / 0 and 2 / 0 at the start and at the end.
- Sweep, 906 cases per algorithm, layered registered in a scratch driver: mrtree ok 814, mismatch 3, both-throw 89; radial ok
  538, mismatch 3, both-throw 365; vertiflex ok 350, mismatch 2, both-throw 553, excluded 1; 0 one-sided throws. The 8
  residual cases are 7 whose option keys belong to unported rectpacking and force providers and 1 last-ulp `Math.sin` string
  (HotSpot ...4178, V8 ...4177).
- Coverage: whole suite 98.87 / 96.91 / 98.82 / 98.87; mrtree 99.6 / 98.7 / 99.5 / 99.6, radial 99.3 / 96.7 / 98.8 / 99.3,
  vertiflex 99.5 / 97.4 / 100 / 99.5. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion kept verbatim; a 2,000-deep path and caterpillar per algorithm complete in oracle and port, with and without
  `--jitless`.

**Decisions taken during the run.**

- TR5 deviated (T5): the three providers were held back with staged provider classes (`// @staged 8a`) until T11, T13 and T17,
  not with `PENDING_TYPES`, because the landed tripwire `test/melk/model-algorithms.test.ts:121-123` asserts `PENDING_TYPES`
  equals `[]` (AD-13; 7a hit the same line). The options were final from T5 on. Flagged for the audit.
- Additive recorder extensions: `fix(T3)` (vertiflex, 283 to 471 rows; node-level `considerNodeModelOrder` and the BEND
  left-pass arm were unexercised because every row set it on the root only) and `mrtree-extra.json` (213 rows beside
  `mrtree.json`, which stays byte-identical because committed tests pin its counts).
- A committed unit-vector recorder `tools/vectors/MrTreeUnitVectors.java` and `mrtree-units.json` replaced scratch probes whose
  expectations sat in a 552 KB file under `src/` (AD-5).
- `DoubleStream.average` settled by 2,170 JVM vectors: Kahan `sum - c` with the simple sum when the compensated sum is NaN and
  the simple sum is non-finite (2,170 of 2,170); `src/alg/mrtree/p4route/DoubleStreamAverage.ts`.
- The sweep tool `tools/corpus/ts-layout-compare.ts` registers the three providers and maps an oracle
  `NullPointerException` to the port's `TypeError` and a `StackOverflowError` to `RangeError` in `classify` (D10, AD-16b).
- Additive golden entries `{mrtree,radial,vertiflex}-generated-retarget`; the three earlier generated entries were recorded with
  layered and stay as valid layered goldens.
- The NodePlacer `DIRECTION` write (`NodePlacer.java:103-105`) is restored in `buildBeforeGraphs` for every replay after it.
- Prose carve-out applied to two progress-monitor task names (no ref records them): "AbsolutPlacer"
  (`AbsoluteXPlacer.java:32`) is "AbsolutePlacer" and "General 'Rotator" (`GeneralRotator.java:30`) is "General Rotator" in
  the port; listed under "upstream typos" in `docs/conformance.md`.

**Divergences fixed at origin.**

- `FanProcessor.java:105` compares `String` objects by reference; the first port compared content, on a proof that assumed one
  `(pId, index)` pair per level. `stops/bfs/cyc79n7/searchOrder=BFS` of `mrtree-extra.json` exposed it; the proof is withdrawn
  and the port models the identity of the `String` objects (T16).
- `NodeComparator.java:45-46` unboxes a null `NODE_MODEL_ORDER`: Java throws, the port returned 0. Found by the sweep
  (`edge_label_placement/hierarchy01`), fixed with `src/java/lang/Unbox.ts`; the same class of site at `RelativeXPlacer.java:455-456`
  (T8).
- A whole-ref test loop timed out at the 5 s default under coverage (`test/helpers/mrtree-replay-state.test.ts:93`); an explicit
  60 s timeout, now required of every whole-ref loop.
- The `trees` golden entries without `retarget` recorded layered (T4, found by T18).

**Hand-offs.**

- To 8b (disco; `elk.stress`, issue #58, as the layered-compound hand-off names it), 8c (spore) and 8x: per TR9, `NodeMicroLayoutTest` still needs force,
  stress and rectpacking (8x); `PlainJavaInitializationTest` and `ElkReflectTest` need force, stress, disco, rectpacking and
  spore (8x, after 8c); `DepthFirstCompaction` recursion is spore's (8c); `TwoBitGridTest`, `PlanarGrid` and `PolyominoOptions`
  registration are disco's (8b).
- To row 9 (elkt corpus): register the remaining providers, layered included, in `tools/corpus/ts-layout-compare.ts`; with layered
  registered the tree sweep has 8 residual cases (7 need rectpacking or force, 8x).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues:

- #64: radial `i30/rand-chain-big` (stops and full rows) depends on the iteration order of a treeified identity `HashSet` bin;
  classified, not matched.
- #65: upstream defects the ports copy (BFS two-parent trees, `edgeRoutingMode=NONE`, boxed and `String` reference comparisons,
  `EadesRadial.java:108`, cyclic graphs that pass the tree checks); drafts only, nothing filed upstream.
- #68: the 8 residual sweep cases and the three `*-generated` goldens recorded with layered (keep or drop).

Open `follow-up` issues: #66 (recorder scenarios for unobserved mutants and unrecorded arms) and #67 (the port's recursion
depth limit is below the oracle's for four deep-tree shapes, 2,500-3,500 against 3,500-7,000).

Audit points: the TR5 deviation (above); assertion pins changed inside the mission, none of them an oracle, vector or golden
expectation: the staging tripwires (enum-test cases that asserted `create()` throws the staged message now assert the
instance; `*Staged.test.ts` shrunk and deleted), the vertiflex count pins (283 to 471, 150 to 247, 125 to 216) changed before
the extended ref was committed, and the `EdgeRouter.test.ts` direction pin (`…/UNDEFINED` to `…/DOWN`, because the oracle's
graphs hold DOWN after `NodePlacer`); the `MARKER` widening in `test/architecture/staged-classes.fitness.test.ts` (one token,
`8a`, and its header comment). The T17 hand-derived coordinates were replaced by structural assertions before the commit.

## Revision 2026-11-11 (alg-force-disco)

Appended; no earlier line is edited. Source: FD1-FD10 in `plans/alg-force-disco/decisions.md`; the journal is
`plans/alg-force-disco/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T13; the base is `554490d4c448caf332ef4c238a9eb95661f784e0` (the 8a squash commit).

**Row 8b is done.** `alg.force` (the force layout `elk.force` and the stress layout `elk.stress`) and `alg.disco` are ported to
`src/alg/{force,disco}/` with their generated options and providers (issue #38). `RecursiveGraphLayoutEngine` lays out a graph
with each once its provider is registered. Design and runbook: `docs/architecture/alg-force-disco.md`; counts:
`docs/conformance.md` § Force, stress and disco. The final commit is one squashed commit
`feat(force): port force, stress and disco (8b)` with `Refs: #38` (FD10); the per-task history is under the tag
`alg-force-disco/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, cold re-records `cmp`-identical): `force.json`
  20,804 rows (full 594, stops 194, throws 2, log 20,014), `stress.json` 431 (320 / 108 / 3), `disco.json` 185 (92 / 88 / 5).
  Replays through the real providers: force 259,243 hex doubles, stress 135,229, all raw-bit identical; disco 75,002 raw-bit
  identical and 32 within 1e-6 only (maximum 8.5e-14), none beyond.
- Goldens: the `force-disco` set, 45 refs under `test/golden/refs/elk-force-disco/` (force 15, stress 10, disco 20), equal to
  the TS layout at AD-4; `default`, `algorithms`, `layered` and `trees` regenerate byte-identically.
- JUnit: `ForceImportTest` 3 of 3, `TwoBitGridTest` 3 of 3; oracle 3 / 0 and 3 / 0 at the start; at the end
  3 / 0 and 3 / 0 again.
- Sweep (layered registered): force planned 906, ok 815, mismatch 2, both-throw 89; stress planned 898, ok 807, mismatch 2,
  both-throw 89; disco planned 906, ok 0, mismatch 819 (all options-only), both-throw 87; 0 one-sided throws in all three. The
  mismatches are the rectpacking option key (issue #71 item 2) and the `debug.discoGraph` identity text (item 1).
- Coverage: the two bundles 99.93 / 98.67 / 100 / 99.93 (statements / branches / functions / lines); 298 of 302 branches, the
  other four are `U` rows 7, 8, 12, 16 of `plans/alg-force-disco/unreached.md` (16 `U` rows; "neither reached nor proven dead"
  is empty). Whole suite at the batch 5 gate 98.9 / 96.94 / 98.86 / 98.91 over 47,912 tests; at mission end
  98.9 / 96.95 / 98.86 / 98.91 over 47,913 tests. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion kept verbatim; a 2,000-node path completes in the oracle, in TS and under `--jitless`.

**Decisions taken during the run.**

- FD1: two JVM recorders (`ForceVectors.java` for force and stress, `DiscoVectors.java`), rows `full`, `stops`, `throws`.
- FD2: a new `force-disco` golden set, one golden per option value, one factor at a time.
- FD3: `EadesModel` calls `JavaMath.log`, the fdlibm `e_log`, raw-bit equal on all 20,014 JVM rows (V8 differs on 101, 0.50 %);
  proven on arm64, unverified on x86_64. `Random.ts` now imports it and its private copy is deleted.
- FD4: identity-hashed containers in insertion order; the one order-observable site (`adjustedPorts`) has a reversed-order twin
  that changes 2 of 41 rows, so the oracle used insertion order; parallel streams are sequential.
- FD5: three staged providers until wired, `MARKER` widened by one token (`8b`, pre-approved, no expected value changed);
  tests register providers explicitly, `PolyominoOptions` beside `DisCoMetaDataProvider`.
- FD6: oracle sweeps per algorithm with `-XX:hashCode=2`; TS through `ts-layout-compare.ts`, which gained the registrations.
- FD7: recursion verbatim; the 2,000-deep probe converted nothing (issue #70 records what lies beyond).
- FD8: `ForceImportTest` and `TwoBitGridTest` ported whole.
- FD9: issue #58 stays with the maintainer; debug properties kept; cross-bundle suites to 8x.
- FD10: one squash commit on the base, tag `alg-force-disco/pre-squash`, footer `Refs: #38`.

Deviations from the plan, all journaled: (1) write-set additions: helper files beside the planned ones rather than edits to
landed helpers (`test/helpers/force-replay-{elk,stops,stress}.ts`, `disco-replay-{elk,stops}.ts`,
`force-replay-dump.test.ts`, `DisCoLayoutProvider.test.ts`). (2) `layered` is registered in `tools/corpus/ts-layout-compare.ts`
beside force, stress and disco, one registration beyond the task's wording: without it the exporter picks different option
suffixes and nested default-algorithm nodes throw (probe on the 286-row sweep: 117 options-only mismatches and 5
`ts-only-throw` each for force and stress, 0 and 0 with it); the registrations are the `*MetaDataProvider`s the oracle registers.
(3) The brief's premise "disco throws in `firstEdgeSection` for an edge without a section" was wrong; the call creates a
section, so those rows are `full` and `stops` rows. (4) The recorder skips `repulsivePower` on graphs with an antiparallel
pair (the hang below). (5) Tests and tools register `PolyominoOptions` next to `DisCoMetaDataProvider` (FD5), which answers the roadmap note that nothing registers it before disco.

**Divergences and kept quirks.** Known divergences (details in `docs/conformance.md`): last-ulp `Math.sin`/`Math.cos` in
`ElkGraphTransformer.getOrthogonalPoints` (32 fields, at most 8.5e-14; V8 equals `StrictMath`, HotSpot's intrinsics differ on 5
`sin` and 9 `cos` inputs of 160 each; no contour cell flips); `debug.discoGraph` identity text (#71); option keys that depend on
the unported rectpacking provider (#71). Kept upstream quirks: the `avoidSamePosition` hang (`AbstractForceModel.java:187-208`);
DisCo's no-op polyomino options; `ComponentsProcessor.dfs` listing a cycle-closing edge twice; `recombine`'s empty bend-point
list for several components; `firstEdgeSection` creating a section; the `NullPointerException` for a parentless layout node
with an edge at its own port (`ElkGraphComponentsProcessor.java:108`); `broadestRow` written and never read; `DCPolyomino`'s
fill leaving a grid-aligned component with sentinel bounds that wrap in 32 bits. No upstream typo was found.

**Landed code fixed outside the bundles (stop 15, each at its origin with a stated mechanism).**

- `src/alg/common/polyomino/structures/TwoBitGrid.ts` `newWords`: `Array.from({ length })` yields `[]` for a negative length
  where Java's `new long[h][...]` throws `NegativeArraySizeException`; the new shim `src/java/lang/NegativeArraySizeException.ts`
  (parent `RuntimeException`, one row added to `test/architecture/exception-hierarchy.fitness.test.ts`). JVM probe: `(-4, 9)`
  gives "-4", `(3, -64)` "-2", `(-4, -64)` "-4", `(0, -64)` "-2".
- `src/graph/json/JsonExporter.ts`: a list-valued option was written with `Array.prototype.toString`; Java writes
  `AbstractCollection.toString`. Array values go through `collectionText`; a unit test was added.
- No landed expected value, ref, vector or tolerance changed. The only change to a landed test file under the gates is five new
  cases in `test/corpus/ts-layout-compare.test.ts`.

**Hand-offs.**

- To 8c (rectpacking): once rectpacking is registered, remove the `SUFFIX_DIFFERENCES` row of golden `force--iterations-50`
  (its tripwire fails until then) and re-run the sweep; the 6 sweep residuals (`interactiveRectpacking_{hierarchy,oneBigNode}`
  for force, stress and disco) close.
- To 8x: `NodeMicroLayoutTest` needs rectpacking; `PlainJavaInitializationTest` and `ElkReflectTest` need the remaining
  algorithms (8x, after 8c); `alg.disco.debug` is reference only.
- To row 9: `tools/corpus/ts-layout-compare.ts` now registers layered, the three tree algorithms, force, stress and disco; the
  remaining registrations (rectpacking, spore, topdownpacking, the others) are row 9's. Issue #68's force keys
  (`desiredEdgeLength`) are registered now; its rectpacking keys wait for 8c.
- Issue #58: the evidence is posted on the issue (all three held-back cases pass with the Java's assertions from temporary
  copies once `elk.force` and `elk.stress` are registered). Two further blockers independent of `elk.stress`:
  `refs/java/layered-label-metrics.json` lacks four label texts (`insideOtherLayout`, `child1`, `child2`,
  `insideOtherDirection`), and the two models are not vendored. `STRESS_PENDING` and both suites are untouched.
- Issue #70 (`follow-up`): `ComponentsProcessor.dfs` and `ElkGraphComponentsProcessor.dfs` overflow V8's stack beyond FD7's
  2,000 (TS completes at 4,000 and overflows at 16,000; the oracle completes at 16,000).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues:

- #69: the two upstream defects the ports copy (the `avoidSamePosition` hang, DisCo's no-op polyomino options), with upstream
  drafts; nothing filed upstream. Also asks whether a browser library may loop forever on a valid input until upstream fixes it.
- #71: the two classified option-text differences (`debug.discoGraph`, the rectpacking-dependent keys).
- #58: the stress-case ruling (evidence posted).

Open `follow-up` issue: #70 (the dfs recursion depth).

Audit points: the `decisions.md` audit points, the `MARKER` widening (FD5) and the new shim behind FD3 (the Java calls
`Math.log`, the port calls `JavaMath.log`); the `AbstractForceModel` entry-point ruling (the base class cannot be loaded first,
resolved under the layered-cycles-layers E1 and 7g T15 precedent; eight landed base classes behave the same); the `layered`
registration in the sweep tool; the x86_64 limit of FD3; the Row 16 argument of `unreached.md` (`ElkGraphTransformer.java:499-500`
is dead by a reading of the Java, not by a vector); the one added exception row in the exception-hierarchy fitness test.

## Revision 2026-11-13 (alg-packing)

Appended; no earlier line is edited. Source: PK1-PK12 in `plans/alg-packing/decisions.md`; the journal is
`plans/alg-packing/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T15; the base is `a30af6618ce3686be283d69fa1eac271670d8042` (the 8b squash commit).

**Row 8c is done.** `alg.rectpacking`, `alg.spore` (the algorithms `sporeOverlap` and `sporeCompaction`) and
`alg.topdownpacking` are ported to `src/alg/{rectpacking,spore,topdownpacking}/` (42, 21 and 11 modules) with their generated
options and providers (issue #39). `RecursiveGraphLayoutEngine` lays out a graph with each once its provider is registered.
Design and runbook: `docs/architecture/alg-packing.md`; counts: `docs/conformance.md` § Rectpacking, spore and topdownpacking.
The final commit is one squashed commit `feat(packing): port rectpacking, spore and topdownpacking (8c)` with `Refs: #39`
(PK12); the per-task history is under the tag `alg-packing/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, cold re-records `cmp`-identical at mission end):
  `rectpacking.json` 1,356 rows (full 558, stops 151, throws 7, sort 640), `spore-layout.json` 339 rows (full 113, stops 60,
  throws 4, minst 95, jitter 4, objects 63), `topdownpacking.json` 898 rows (full 296, stops 288, predicted 296, throws 18).
  Replays through the real providers and `RecursiveGraphLayoutEngine`: rectpacking full and stops rows raw-bit identical
  (66,304 and 132,339 doubles at T12, before the 13 rows T14 added, which also replay at raw bits); spore 67,980 doubles raw-bit
  identical at T11, all 76 order-sensitive `minst` rows in the recorded order (the end-to-end `NaiveMinST` tie order); all 898
  topdownpacking rows equal, with the real row list lengths of `GridElkNode`.
- Goldens: the `packing` set, 44 refs under `test/golden/refs/elk-packing/` (rectpacking 17, sporeCompaction 13, sporeOverlap 7,
  topdownpacking 7; one per option value; the four `--minst-ties-*` entries included), equal to the TS layout at AD-4;
  `default`, `algorithms`, `layered`, `trees`, `force-disco` and `packing` regenerate byte-identically at mission end.
- JUnit: the eight suites ported whole, 30 runs: `CompactionTest` 10, `PaddingTest` 4, `Issue583Test` 1, `UtilsTest` 3,
  `ScanlineOverlapRemovalTest` 1, `TopdownPackingTest` 4, `TopdownLayoutTest` 5, `PortPlacementCalculationTest` 2; the oracle
  runs 30 / 0 at the start and at the end.
- Sweep (every provider registered): rectpacking planned 919, ok 830, mismatch 0, both-throw 89; topdownpacking planned 906,
  ok 906; sporeCompaction planned 906, ok 99, nondeterministic 807; sporeOverlap planned 906, ok 94-97, both-throw 20-21,
  nondeterministic 788; 0 one-sided throws and 0 mismatches among deterministic cases, apart from four `sporeOverlap` cases
  the oracle's two-run determinism check misses (issue #79). The 8b residuals (6 cases) and the #68 item A residuals (7 cases)
  are `ok`.
- Coverage (each bundle's own tests): rectpacking branches 98.12 % (418 of 426), spore 100 % (85 of 85), topdownpacking
  96.42 % (54 of 56); `plans/alg-packing/unreached.md` has 18 `U` rows and one arm neither reached nor proven dead
  (`Compaction.java:364`, issue #81). Whole suite at mission end: 98.92 / 96.99 / 98.84 / 98.92 (statements / branches / functions / lines) over 49,157 tests. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion (PK6): `DepthFirstCompaction.compactTree` (landed `alg.common/spore`) and `GrowTreePhase.growAt` are explicit-stack
  loops, each proven against its verbatim recursive form on 1,000 seeded trees; both 2,000-node chains complete in the oracle
  and in TS. Under `--jitless` the overlap chain is in the default suite and the compaction chain passed in one detached run (2,394 s; it stays behind `SPORE_CHAIN_FULL=1`, `DepthFirstCompaction` being cubic on a path).

**Decisions taken during the run.**

- PK1: three recorders; stops are taken at the providers' own `logGraph` points (rectpacking) and through stepwise calls of
  the phases checked against the engine run (spore, topdownpacking); the `sort`, `minst`, `jitter` groups as planned, and one
  group beyond the plan, `objects` (63 rows: `Objects.equals`, `KVector.equals`, `TTriangle.contains`, `TEdge.equals` with NaN).
- PK2: the `packing` golden set; options with one constant (`structureExtractionStrategy`, `compactionStrategy`, topdown's two
  strategies) and `sporeOverlap`'s `processingOrder.*` (overwritten by the provider) have no golden.
- PK3: `GridElkNode implements ElkNode, Grid<ElkNode>` by delegation; `ElkGraphPackage`'s guard registry holds a list of classes
  per interface name; every landed guard result is unchanged.
- PK4: `Math.random()` verbatim; `jitter` rows assert invariants; nondeterministic sweep cases are counted, not compared.
- PK5: `JavaHashSet<TEdge>` and `JavaHashMap` (KVector strategy) replay the Java insertion history, `clear` keeping capacity.
- PK6: two conversions (above); thresholds beyond 2,000 in issue #76.
- PK7: `Array.prototype.sort` with the verbatim comparator; 427 of 640 JVM sort rows reproduce, 213 are classified (34
  Java-only throws, 179 order differences, all of length 32 or more), issue #75.
- PK8: 13 staged classes, unstaged task by task; `MARKER` widened by `8c`; four `NON_LEAF_DEFAULT_TYPES` entries.
- PK9: sweeps as above; the `SUFFIX_DIFFERENCES` row of `force--iterations-50` is removed.
- PK10: the eight suites. PK11: cross-bundle suites stay with 8x. PK12: one squash commit.

Deviations from the plan, all journaled: (1) T14 was split: its recursion half ran beside T12, its coverage half beside T13.
(2) The recorders were extended additively after the ports existed (13 rectpacking rows, 2 spore rows for arms no row
reached; 63 `objects` rows), each with a byte-identity proof of every earlier row. (3) Helper files beside the planned ones
(`rectpacking-replay-{run,p1p3,p2,provider}.ts`, `rectpacking-sort-classified.ts`, `spore-replay-providers.ts`,
`spore-tree-fixtures.ts`). (4) `tools/melk/config.ts` and the regenerated metadata providers were changed by the wiring tasks
(TDZ entries). (5) `tools/corpus/ts-layout-compare.ts` gained the #71 item 1 neutralisation of `debug.discoGraph` (ruled for
row 9; the PK9 re-run needed it). (6) `Compaction.compact` is split behind the class into `CompactionContext.ts` and
`CompactionPlacement.ts` (limits), and the staged provider tests of spore were deleted, not replaced (the vector replay
exercises the providers).

**Divergences and kept quirks.** Known divergences (details in `docs/conformance.md`): the 213 PK7 sort rows (interactive
rectpacking with at least 32 children carrying tied `desiredPosition`s can order differently from ELK, or lay out where ELK
throws); spore's jitter (inputs with coincident centres are nondeterministic in ELK and in the port); spore inputs whose
spanning tree is a path deeper than about 2,125 overflow V8's stack where the oracle completes up to 4,000 (#76). Kept
upstream quirks: the `absorbBlocks` hang (#73); the stale parent row after `placeNextBeside`; `RectRow.removeBlock` reducing
the width for an absent block; the `AreaApproximation.java:98` `NullPointerException` for zero-size nodes with zero spacing;
`InteractiveRectPackingGraphVisitor`'s reversed `endsWith` (and that nothing applies the visitor); `GridElkNode.put`'s insert
semantics; spore's overwritten explicit margins; `MaxSTPhase` rooting on `.vertex` while `MinSTPhase` roots on
`.originalVertex`. One upstream typo corrected (the task name of `ToAspectratioNodeExpander.java:51`).

**Changes to landed code.**

- `src/java/util/JavaObjects.ts` `equals`: an object equals itself before `equals` is called (the JVM's `Objects.equals`; a
  `KVector` with a NaN component is not equal to itself under `equals`). Found by the sweep (19 ptolemy cases); proven by the
  `objects` vector group; no landed expectation changed.
- `src/alg/common/spore/DepthFirstCompaction.ts` `compactTree`: explicit stack (PK6; the hand-off mission 6a recorded).
- `src/graph/ElkGraphPackage.ts`: the guard registry (PK3). `test/architecture/staged-classes.fitness.test.ts`: `MARKER`.
  `test/golden/force-disco-goldens.test.ts`: three registrations and the pre-approved row removal.
  `tools/oracle/regen-goldens.sh`: the `packing` set. `tools/melk/config.ts`: four `NON_LEAF_DEFAULT_TYPES` entries.
- No landed expected value, ref, vector or tolerance changed.

**Hand-offs.**

- To 8x: `NodeMicroLayoutTest`, `PlainJavaInitializationTest` and `ElkReflectTest` are unblocked (every in-scope algorithm is
  ported).
- To row 9: `tools/corpus/ts-layout-compare.ts` registers every in-scope provider and carries the #71 item 1 neutralisation;
  the sweep's determinism check for spore (#79) and a per-case bound (cubic `DepthFirstCompaction`, #73's inputs) are open.
- `docs/parity-report.md` is generated (`tools/corpus/parity-report.ts`); its TS column is still the constant
  "n/a (no TS port yet)" and it was not regenerated.

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues: #75 (the 213 sort rows), #78 (four oracle rows
falsify a premise of this mission's `RectRow.test.ts`; classified, AD-13), #79 (four nondeterministic sweep cases classified
deterministic), #80 (upstream defects with drafts). Open `follow-up` issues: #73 (the upstream hang; filed as `needs-ruling`
and relabelled during the run), #76 (recursion depth beyond 2,000), #81 (the one open arm).

Audit points: the `decisions.md` audit points (the `MARKER` widening, the `ElkGraphPackage.ts` registry, the
`SUFFIX_DIFFERENCES` row removal, `Math.random()` in shipped code); the `JavaObjects.equals` change and its vector; the
explicit-stack conversion in landed `DepthFirstCompaction.ts`; the classified list in `RectRow.test.ts` (#78); the additive
recorder extensions and the count pins that followed them; the `neutraliseIdentity` step landing ahead of row 9; `U` rows 4
and 9 of `unreached.md` (dead by a reading of the Java supported by a search, not by a vector).

## Revision 2026-11-13 (ts-parity-dashboard)

Appended; no earlier line is edited. Source: TP1-TP8 in `plans/ts-parity-dashboard/decisions.md`; the journal is
`plans/ts-parity-dashboard/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids
are T1-T8; the base is `14f5b691cad42979fc0721ca18186267e1e509bd` (the 8c squash commit).

**Row 9 is done.** The TS engine runs over every `(algorithm, model, variant)` case of a fresh full oracle sweep and each case
gets one category (issue #40). The dashboard is the generated `docs/parity-report.md` (TS conformant column, `TS sweep` table,
annotated `TS findings`), mirrored to `docs-site/parity.md` by `npm run docs:build`. The AD-4 list of non-strict `Math.*` call
sites exists in `docs/conformance.md` § Non-strict Math call sites and is pinned by a fitness test. Design and runbook:
`docs/architecture/parity-dashboard.md`; counts: `docs/conformance.md` § TS corpus sweep. The final commit is one squashed
commit `feat(corpus): ts sweep and per-algorithm parity dashboard (9)` with `Refs: #40` (TP8); the per-task history is under
the tag `ts-parity-dashboard/pre-squash`. This was a tooling mission: no ELK class was ported.

**Evidence.**

- Oracle sweep (TP1): ELK `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, into the default sweep directory: 18,930
  cases, 110 s, 0 `oracle-error`, 0 parse errors, 1 `timeout` (vertiflex, as in the old report). It replaced a 10,881-row
  filtered partial. The old report had 18,023 cases (patch 0001 only); +907 (layered native 6,265 → 7,160, rectpacking native
  21 → 24, one more generated input for nine algorithms).
- TS sweep (TP2, TP3), final run after the one fix: 14 algorithms, 8 forked shards, 120 s per case, 44.7 s wall, Node v26.3.1.
  18,930 cases, one outcome each in `--out`; counts sum to `planned` for every algorithm. ok 15,528; both-throw 1,430; mismatch
  1 (options-only); oracle-only-throw 1; ts-only-throw 0; ts-aborted 0; excluded 1,970; conformant 16,958 of 16,960 compared.
  Per algorithm (planned: ok / both-throw / excluded): box 898: 898/0/0; disco 906: 819/87/0; fixed 898: 869/29/0; force 906:
  817/89/0; layered 7,163: 7,144/19/0; mrtree 906: 817/89/0; radial 906: 540/365/0 and 1 mismatch; random 906: 534/0/372;
  rectpacking 919: 830/89/0; sporeCompaction 906: 99/0/807; sporeOverlap 906: 94/21/790 and 1 oracle-only-throw; stress 898:
  809/89/0; topdownpacking 906: 906/0/0; vertiflex 906: 352/553/1.
- Determinism (stop 6): two TS runs of the same oracle sweep differ in one case, a `sporeOverlap` jitter case (#79).
- Residuals (TP8): the 7 cases of #68 item A and the 6 of #71 item 2 are `ok`. The mission-5 options-only family of
  `fixed`/`box`/`random` (497 mismatches, 18 TS-only throws) is closed: 0 mismatches and 0 one-sided throws in all three.
- `Math.*` list (TP7): 36 transcendental call sites in 14 files (atan2 6, cos 7, sin 6, pow 7, acos 3, asin 3, log 2, exp 1,
  log10 1), each with its Java site and the tests that reach it; all 36 Java sites call `Math`, none `StrictMath`.
  `test/architecture/math-call-sites.fitness.test.ts` compares the scan with `math-call-sites.json` in both directions.
- Gates at mission end: in the journal's last `gate` rows (format, typecheck, complexity, coverage, docs build, full suite,
  report staleness, the six golden sets regenerated byte-identically).

**Decisions taken during the run.**

- TP1: as planned. TP3: `--out` of the sharded path holds `cases`; the in-process `execute` still writes the old summary.
- TP2: forked children with a `ready` handshake (start-up has its own 60 s limit, outside the per-case limit), one case per
  message, parent-side timer and SIGKILL, a fresh child after an abort; `excluded` rows never reach a child. The file is split
  into `ts-layout-{classify,pipeline,shards,protocol,worker}.ts` behind the CLI's re-exports.
- TP2 deviation (issue #82, `needs-ruling`): `CATEGORIES` stays the in-process six and the sweep uses `SWEEP_CATEGORIES`
  (seven, `ts-aborted` before `excluded`) with `summarizeSweep`, because the landed mission-5 test pins the six-key `counts`
  (AD-13). `--out`, stdout and the report carry seven.
- TP4: the report cells as in `decisions.md`, plus `— (no compared cases)` and `timeout none` for the two empty cases; the
  findings detail is a code span cut at 200 characters.
- TP5: `tools/corpus/ts-findings.json` has 7 display-only annotations (#68: 1; #79: 6).
- TP6: one landed-port defect fixed (below), its sibling sites filed as #83, the upstream defect as #84.
- TP7: as planned; no `StrictMath.ts`.
- TP8: evidence comments on #40, #68, #71, #74 and #79; nothing decided there.

Deviations from the plan, all journaled: (1) the #82 category split. (2) `ts-layout-pipeline.ts` and
`test/helpers/ts-layout-worker-deps.ts` beside the planned files. (3) `docs/parity-report.md` joined `.prettierignore`: its
generator compares it byte for byte and the old copy had been reformatted, so the staleness check and `format:check` could
not both pass. (4) T7's prose was written by `documentation-engineer`, not `technical-writer` (which has no Edit tool).
(5) T5 was run by the orchestrator, not fanned out: there were three mechanisms.

**Divergences.** No new known divergence. `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` is the accepted
last-ulp `Math.sin` case (#68 item B; one option string). The spore jitter cases are oracle nondeterminism (#79): in this sweep
the four cases of #79 are `nondeterministic`, and two more (`…/hierarchical/ptolemy_electricpowersystem_…SimXFMU`,
`…/ptolemy_test_auto32_…SimXFMU`) have verdict `throws` by chance (24 oracle runs each: 20 and 16 throws, 4 and 8 distinct
layouts), so a TS sweep shows 0 to 2 `oracle-only-throw` findings from them.

**Changes to landed code.**

- `src/alg/layered/p1cycles/ModelOrderCycleBreaker.ts`: the two reads of `ModelOrderCycleBreaker.java:70-71` go through
  `unboxInteger`. A nested graph under `INCLUDE_CHILDREN` has no `MAX_MODEL_ORDER_NODES` (`ElkGraphImporter.java:380-384` sets
  it on the top-level graph only), the Java throws a `NullPointerException`, the port laid out. Found by the sweep
  (`native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking`, now `both-throw`); the added
  unit test carries the oracle's message. No landed expected value, ref, vector or tolerance changed.
- `tools/corpus/ts-layout-compare.ts` and `parity-report.ts`: split and extended; their landed tests pass unedited.
  `parity-report.ts` now requires `--ts-summary` (exit 2 without it).
- `.prettierignore`: `docs/parity-report.md`.

**Hand-offs.**

- To row 12 (docs site): the dashboard publishes with the site through `docs-site/copy-reports.mjs`; no site component was
  added and `parity.md` stays in `TRANSLATABLE_EXCLUDES`.
- To row 13 (ELK upgrade): the runbook of `docs/architecture/parity-dashboard.md` (oracle sweep, TS sweep, report, staleness
  check) is the upgrade check; the `Math.*` fitness test fails on a new call site until it is listed.
- To #74: the `Math.*` list is the audit's input (per-site deltas against the 0.01 px bar were not measured here).
- `npm run complexity` and the coverage gate do not scan `tools/corpus`; this mission checked those files with explicit runs.

**Flags for the maintainer (open decisions).** New `needs-ruling` issues: #82 (the category lists against the landed test),
#84 (the upstream `MAX_MODEL_ORDER_NODES` defect, with a draft upstream issue; nothing was filed upstream). New `follow-up`
issue: #83 (`GreedyModelOrderCycleBreaker` and `SCCModelOrderCycleBreaker` miss the same unboxing throw; oracle evidence in
the issue). Still open and untouched: #72, #74, #75, #79.

Audit points: the change to landed `ModelOrderCycleBreaker.ts` and its test; the #82 split; the `.prettierignore` entry and
the reformatted (now unpadded) committed report; the annotations for the four #79 cases, which are not findings in this
sweep; the evidence cells of the `Math.*` table (a test reaches the call; it does not prove the test would detect a last-ulp
difference).

## Revision 2026-11-13 (text-sizing-seam)

Appended; no earlier line is edited. Source: TX1-TX8 in `plans/text-sizing-seam/decisions.md`; the journal is
`plans/text-sizing-seam/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids
are T1-T7; the base is `854cbbd7cb51bed20ca1fb176c5b69f72a00a4b9` (the row-9 squash commit).

**Row 10 is done, with one part waiting for a ruling (#86).** The oracle carries its first text-sizing patch,
`tools/oracle/patches/0003-alg.test-pluggable-label-text-measurer.patch` (issue #41), and the port has the paired seam in
`test/helpers/layout-test-text-measurer.ts`. With the fixed measure on both sides, the port sizes every label of every
label-bearing model as the oracle does. Design and runbook: `docs/architecture/text-sizing-seam.md`; counts:
`docs/conformance.md` § Text-sizing seam. The final commit is one squashed commit
`feat(oracle): text-sizing seam patch and ts measurer (10)` with `Refs: #41`; the per-task history is under the tag
`text-sizing-seam/pre-squash`. No ELK class was ported and nothing under `src/` changed.

**Decisions (planned unattended; all eight held, with the deviations below).**

- TX1: the patch touches only the test bundle `org.eclipse.elk.alg.test`; at the pin no plugin measures text.
- TX2: `TextMeasurer` with `AwtTextMeasurer` (the former body, verbatim) and `FixedAdvanceTextMeasurer`, selected by the
  system property `org.eclipse.elk.alg.test.textMeasurer` (unset or `awt`; `fixed`; anything else throws).
- TX3: "both". The default stays AWT in the oracle and the FX8 snapshot in TS; fixed mode exists only for the comparison.
- TX4: the fixed measure is `[length × 6, 12]`, exact in binary; not a font model.
- TX5: the TS twin lives in `test/helpers/`, not `src/`, because its Java site is test-framework code.
- TX6: evidence is a committed ref for the vendored models, a local corpus comparison, and runner parity in fixed mode.
- TX7: the default is proven unchanged by class hashes, default-mode JUnit outcomes and an AWT re-measure.
- TX8: refs are restamped by script only; the only ref diff is the `patches` arrays.

**Evidence** (reference platform `Darwin arm64`, JDK 21.0.1; oracle `8aaa3c14` + patches 0001, 0002, 0003).

- TX7: 1,348 class hashes before the rebuild, 1,351 after; the only differences are `TestConfiguration.class` (changed) and
  the three new classes. Default-mode JUnit over the 43 runner suites: 5,619 runs, 0 failures, per class equal before and
  after. The AWT re-measure through the patched code equals `layered-label-metrics.json` on 2,317 of 2,317 texts (the file
  is byte-identical).
- TX6(a): `test/golden/refs/java/label-sizing.json` (new, by `tools/vectors/label-sizing-vectors.sh`): 17 text rows, 119
  vendored label-bearing models, 1,052 label rows (131 preset), each model's layout. `test/golden/label-sizing.test.ts`
  (239 tests): every key, text, size and `preset` equal, every layout equal at 1e-6.
- TX6(b): `test/corpus/label-sizing-sweep.test.ts` (skip-gated; the oracle output is local): 759 of 759 corpus models and
  21,753 label rows equal (1,513 sized by the measurer, 20,240 preset by the model).
- TX6(c): in fixed mode the oracle's 43 suites give 5,619 runs and 0 failures; the TS runner's cases equal the JUnit line for
  41 of 43 classes. `Issue665Test` and `Issue700Test` differ by #58's three stress-dependent cases, in default mode too.
- TX8: all ten regen scripts reran; nine `_meta.json` gained `0003` in `patches`, nothing else moved.
- Gates at mission end: in the journal's last `gate` rows.

**Deviations from the plan, all journaled.**

- 119 models, not "up to 137": the planning count was a text grep; the recorder counts models whose parsed graph holds a
  label (108 + 19) and drops 8 content duplicates.
- The local corpus output is `$ELK_ORACLE_DIR/sweep/label-sizing/`, not `$ELK_ORACLE_DIR/label-sizing/`: a new untracked
  directory at the oracle root makes `build.sh` call the worktree stale.
- `build.sh` ran with an environment-scoped git excludes file for four existing cache directories (`vector-cache/`, `t4/`,
  `rerecord/`, `final-gate/`), which its staleness filter does not know (#85). `build.sh` itself was not edited.
- JUnit runs used a scratch copy of `java-tests.sh` with `org.eclipse.elk.alg.common.test` added (three suites live there).
- `test/helpers/label-sizing-rows.ts` beside the planned files: the label-row derivation both comparison tests share.
- The parity report changed in its patch line only, generated from the committed report's own sweep inputs and the new
  oracle manifest, not from the fresh sweep (#86, below).

**Flags for the maintainer (open decisions).**

- #86 (`needs-ruling`): a report generated from a fresh sweep cannot differ from the committed one by the patch line alone.
  Six `sporeOverlap` verdicts flicker between sweeps (unseeded `Math.random()` jitter, #79; confirmed by four repeats on one
  build) and the 14 timing rows change on every sweep. The spore rows, the timings and `ts-findings.json` are untouched;
  against the live sweep cache the staleness check reports the committed report stale.
- #85 (`follow-up`): `build.sh`'s staleness filter does not exempt `vector-cache/` and three old output directories.
- TX5 against `docs/conformance.md` § 4 step 3, which said "in `src/`": the step now has a sentence for test-bundle seams.
- TX3 "both": the snapshot is neither replaced nor extended. #58's four texts are still missing from it; in fixed mode they
  are not needed.
- The rebuild changed `oracle-build.json`, which is part of the vector cache's salt, so the next run of every cached JVM
  recorder is cold (the elkj round-trip recorder took 3 h 58 min cold in mission 4e).
- The patch's new Java types are `public`; the package is not exported by the bundle, as before.
- `../elk` past the pin over `plugins/` and `test/org.eclipse.elk.alg.test`: only `8bd00922` (prose, `graph` bundle), as at
  planning.

**Hand-offs.**

- To #58: in fixed mode the three stress-dependent cases need no snapshot rows; `STRESS_PENDING` and model vendoring remain.
- To #57 and #77 (upstream PRs as oracle patches): the next patch is `0004`; the in-place rebuild needs the #85 workaround
  or its fix, and it empties the vector cache.
- To row 13 (ELK upgrade): a pin bump must re-prove TX1 (no plugin measures text) and rerun
  `label-sizing-vectors.sh --remeasure-awt` on the reference platform.

## Revision 2026-11-13 (deferred-bundles-adr)

Appended; no earlier line is edited. Source: DB1-DB7 in `plans/deferred-bundles-adr/decisions.md`; the journal is
`plans/deferred-bundles-adr/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T3; the base is `887d11e9b05dc357cc5b17fd50b018fb58080d75` (the row-10 squash commit).

**Row 11 is done as an ADR with Status Proposed; acceptance is pending on #88 (`needs-ruling`).** The ADR is
`docs/architecture/deferred-bundles-adr.md`; its evidence, with every command, is `plans/deferred-bundles-adr/evidence.md`.
The final commit is one squashed commit `docs(adr): propose deferred-bundles decision (11)` with `Refs: #42`; the per-task
history is under the tag `deferred-bundles-adr/pre-squash`. No ELK class was ported and nothing under `src/`, `test/` or
`tools/` changed.

**Recommendation per bundle (6,019 lines evaluated, 0 ported).**

| Bundle | Lines | Recommendation | Reason |
| ------ | ----: | -------------- | ------ |
| `alg.libavoid` | 1,548 | no-go: skip | A client of a downloaded C++ binary (libavoid-server v0.3.1); the routing is not in the Java, so the pin does not define the result; no delegate exists |
| `alg.graphviz.dot` | 2,728 | no-go: skip | Portable and oracle-provable, but its only consumer is `alg.graphviz.layouter` and `DotImporter` has none; 7 to 10 tasks for code nothing calls |
| `alg.graphviz.layouter` | 1,743 | no-go in this package | Process and Eclipse code; results depend on an unpinned Graphviz; a dot-engine delegate is feasible only as a separate package (AD-14), about 5 to 8 tasks, when a consumer asks |

For all three: no in-scope caller, no ELK test, none of the 898 corpus models. No recommendation needs a locked rule
amended.

**What did not change, and why.**

- `test/architecture/bundle-deps.json` and `tools/bundle-deps.ts` are byte-identical to the base (DB3): no bundle is
  adopted. The committed table equals a regeneration from the pinned manifests (checked by hand, journal T3).
- No new fitness test (DB4). "Deferred = not ported" is enforced by `module-boundaries.fitness.test.ts:322`
  (`has no unmapped directories`), self-checked at `:306`. The row-11 exit "fitness test updated" is met by that citation.
- CLAUDE.md's "Deferred" list, the skeleton's AD rows and `docs/conformance.md` are untouched; `inventory.md` rows 38-40 and
  `port-map.md` link the ADR and keep `Deferred` (DB6).
- No oracle rebuild, JVM run or external binary (DB7).

**On acceptance (#88), not done here.** CLAUDE.md moves the three bundles from "Deferred" to "Out of scope"; AD-17 is
appended to `plans/elk-engine-skeleton/decisions.md`; the inventory and port-map rows become `Out`; the ADR becomes Accepted.
A "go" for any bundle instead needs its suffix in `IN_SCOPE_SUFFIXES`, a regenerated `bundle-deps.json`, a mapping test and
a new roadmap row.

**Flags for the maintainer.**

- #88 (`needs-ruling`): accept, amend or reject the ADR.
- #89 (`follow-up`): `module-boundaries.fitness.test.ts:342` (`regenerated deps equal the committed file`) is skipped
  unless the ELK checkout's HEAD is exactly the pin; on this machine neither `../elk` (`b715fb10`) nor `../elk-oracle`
  (`d650f036`, pin plus patches) qualifies, so the check does not run locally.
- The LGPL-2.1-or-later licence of libavoid is recorded as a cost of porting it; whether such a port could ship in an
  EPL-2.0 package was not answered.

**Hand-offs.**

- To row 12 (docs site, first publish): the ADR is not a site page; links to it from the inventory and port-map pages are
  rewritten to GitHub blob URLs, which resolve once `chore/issue-queue` reaches `main`.
- To row 13 (ELK upgrade): a pin move that touches one of the three bundles, or gives one an in-scope caller or test, is a
  revisit trigger of the ADR.
- To the `shared.test` port (`test/integration/`): its manifest requires `alg.graphviz.layouter`, but none of its four
  classes uses it; the entry is not carried.

## Revision 2026-11-14 (docs-publish-prep)

Appended; no earlier line is edited. Source: DP1-DP9 in `plans/docs-publish-prep/decisions.md`; the journal is
`plans/docs-publish-prep/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T9; the base is `372d7871c34d3a8523e955be0811193694f18900` (the row-11 squash commit).

**Row 12 is done except its three maintainer-only parts**, which are handed over as rulings: accepting the export surface
(#90), and claiming the npm name with the first `npm publish` and switching the release workflow on (#91). **Nothing was
published or run:** no `npm publish` (not even `--dry-run`), no `npm login`, no semantic-release run, no tag. The final
commit is one squashed commit `docs(site): api reference, example tests and release prep (12)` with `Refs: #43`; the
per-task history is under the tag `docs-publish-prep/pre-squash`.

**Exit items and their evidence** (journal rows by task).

| Exit item (§ 12, #43) | State | Evidence |
| --- | --- | --- |
| Docs build with the API reference | done | `npm run docs:build` runs `docs:api` (typedoc 0.28.20 on an isolated TypeScript 6.0.3, `tools/typedoc/`): 0 errors, 200 warnings, 72 pages under the generated `/reference/` (T2) |
| Link check in CI | done | `npm run docs:linkcheck` (linkinator 8.1.0, internal links and fragments): 555 links, 0 broken; in `ci.yml` after `docs:build`; external links weekly in `links.yml` (T5, T8) |
| Example tests in CI | done | three programs in `test/docs/examples/` equal the oracle refs of the new golden set `elk-examples` at 1e-6 and are the snippets of the getting-started page (T3, T4); they run inside `coverage` |
| Export surface proposed in a reviewable doc | done, **ruling #90** | `docs/architecture/public-api.md` (69 exports in four tiers, eight open questions, acceptance steps) and the same surface as code, `test/public-api/candidate-index.ts`; `src/index.ts` unchanged (T1) |
| Release config in place, not run | done, **ruling #91** | `.releaserc.json`, `release.yml` (`workflow_dispatch` only, `main` only, environment `release`), `publish:check`, `prepublishOnly`, registry pins, `PUBLISHING.md` (T6) |
| "Installs and lays out a graph in a clean project" | rehearsed, not published | `npm run pack:smoke`: tarball contents checked, offline install into a clean project, import; with `--entry` the bundled candidate lays out an example in a clean process and equals its oracle ref (T7); both modes in CI (T8) |
| Queue gates | pass | journal, T9 |

**Decisions held.** DP1-DP9 as written. Three readings to know:

- **AD-6 ("adds a TS 6 alias")** is carried out as a private package with its own lockfile, not an alias: typedoc's peer
  is the name `typescript`, and npm cannot alias a peer beside the root's TypeScript 7 (DP3). TypeScript 7.0.2 remains the
  project compiler; AD-6 is not edited.
- **DP6 (pinned nav).** `test/docs/locale-complete.test.ts` pins the English nav and sidebar exactly (`:91-105`,
  `:107-115`, `:117-119`), so the two new pages are outside the navigation and outside translation until #90 (AD-13: the
  rows are named in the ruling, not changed). They are reachable by URL, by site search, from `README.md` and from each
  other.
- **DP7 wording.** "PR titles drive versions" is true for dot-engine's squash merges. This repository merges with merge
  commits, so semantic-release will read every per-task commit; `PUBLISHING.md` and `CONTRIBUTING.md` say so.

**Deviations and additions** (each journaled with its reason).

- T2-T7 were done by the orchestrator, not by the subagents the brief suggested (journal, start/plan).
- `package.json` `files` gains `NOTICE.md` (the dry run showed the derivative-work notice was not in the tarball); the pack
  check requires it. Flagged in #91 for a veto.
- `release.yml` checks `npm >= 11.5.1` instead of installing `npm@latest` into a job that holds `id-token: write`.
- `npm publish --dry-run` was not run (stop 2). The publish target was established with npm's own resolver instead: before
  the pins `https://npm.pkg.github.com`, with them `https://registry.npmjs.org/`.
- Files outside the planned write-sets: `.prettierignore` (the generated reference), `docs-site/linkinator*.config.json`,
  `docs-site/.vitepress/README.md` (on-call entry for the link check), `tools/release/consumer-layout.mjs`,
  `CONTRIBUTING.md` gate list, `tools/typedoc/reference-index.md`.

**Two defects found and fixed, both in the docs site** (diagnosis artifacts in the journal, T5).

- 138 dead language-switcher links on the base build (6 English-only pages × 23 locales): the default theme appends the
  page path to each locale prefix (`langs.js:15`). Fixed with `themeConfig.i18nRouting: false`.
- 18 dead member anchors in the generated reference (new with T2): the site slugs heading ids by GitHub's rule, the
  typedoc theme slugs its links by VitePress's default. Reference pages now get ids by the generator's rule
  (`referenceHeadingSlug`); no id on any other page changes.

**Changes to landed code.** None under `src/`. No landed test, vector or ref changed: `git diff <base> -- test/golden/refs/`
shows only the new `elk-examples/` set, and all six earlier sets regenerate byte-identically. Landed files that changed:
`tsconfig.json` (`paths`), `vitest.config.ts` (alias), `package.json`/`package-lock.json`, `.gitignore`, `.prettierignore`,
`tools/oracle/regen-goldens.sh` (the `examples` set), both `TRANSLATABLE_EXCLUDES` copies (two entries),
`docs-site/.vitepress/config.ts` (`i18nRouting`, heading ids under `reference/`), `ci.yml`, `README.md`, `CONTRIBUTING.md`,
`docs/architecture/overview.md`. CLAUDE.md and the AD rows are untouched.

**On acceptance (#90), not done here.** Move the candidate into `src/index.ts` (changes the landed `src/index.test.ts`
assertion), flip the three `@knowvah/elk-engine` mappings, add the two pages to `navFor`/`sidebarFor` (changes the pinned
rows above), update CLAUDE.md's "exports nothing yet", remove the "proposed" notices. Then #91: first version, manual
publish with 2FA, tag `v<version>`, trusted publisher, switch `release.yml` to `push: main`.

**Flags for the maintainer.**

- #90 (`needs-ruling`): the surface, with eight open questions (algorithm option enums, subpath exports, text formats and
  grandom, `EnumSet`, errors, internal types in signatures, no registration helper, first version).
- #91 (`needs-ruling`): the first publish. **It freezes the ElkGraph API (AD-14) and is irreversible.**
- **A UX change shipped with the link fix:** the language switcher now opens each locale's home page, not the same page in
  that locale. VitePress has no per-page switch; the alternatives were rejected in DP5. Revert by removing
  `i18nRouting: false`, at the price of the 138 dead links (and one per locale for every page under `/reference/`).
- #92 (`follow-up`): translate the getting-started page and add nav labels after #90.
- #93 (`follow-up`): `docs-site/guide/overview.md` still says "No layout algorithm is ported yet".
- #94 (`follow-up`): the English search index grew from about 177 KB to 2.0 MB with the reference; `headingSlug` drops
  `_` where GitHub keeps it (nothing broken today).
- #87: the `childPids()` check of `ts-layout-shards.test.ts` failed once more under load, at `:263`; a rerun at low load
  passed (comment on the issue).
- The weekly external link check will report nine GitHub `blob/main` links as 404 until `chore/issue-queue` reaches
  `main` (files that exist only on the queue branch).

**Hand-offs.**

- To the surface ruling (#90): `docs/architecture/public-api.md` § "On acceptance" lists every site by path.
- To row 13 (ELK upgrade): an upgrade check now includes `npm run docs:build` (typedoc on the isolated TypeScript 6 package;
  compare the warning count with 200), `regen-goldens.sh --set examples` with `examples.test.ts`, and both `pack:smoke`
  modes. A typedoc release with TypeScript 7 support removes `tools/typedoc/` (its README says how).
- To a later wrapper layer (AD-14, AD-16c): open questions 4, 5 and 7 of the proposal (`EnumSet`, errors, registration) are
  the first candidates for idiomatic API.

## Revision 2026-11-14 (elk-upgrade-runbook)

Appended; no earlier line is edited. Source: UP1-UP9 in `plans/elk-upgrade-runbook/decisions.md`; the journal is
`plans/elk-upgrade-runbook/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T5; the base is the row-12 squash commit: `13dcc88137473dfb51e4d5a4277a63efb1355fa3` when the mission started,
`2605fe3c3aaee1816abd30ff2d1b5ddff67cd207` after the signing rebase of 13:34 that day (same tree; see the flags below).

**Row 13 is done: the runbook is committed and rehearsed once; the pin did not move.** The runbook is
`docs/architecture/elk-upgrade.md`; `test/docs/elk-upgrade-runbook.test.ts` keeps its script inventory equal to the
recorder, regen and sweep scripts on disk. The rehearsal ran every step against `b715fb10` (upstream `master`, 22 commits
past the pin) in a scratch clone with a scratch oracle and a scratch Maven repository, and all of it was removed
afterwards. Moving the real pin is handed over as ruling #99. The final commit is one squashed commit
`docs(oracle): elk upgrade runbook and rehearsal (13)` with `Refs: #44`; the per-task history is under the tag
`elk-upgrade-runbook/pre-squash`.

**Rehearsal verdict: no content difference; a triaged list of nine items, none blocking the move.**

| # | Item | Class | Next step |
| --- | --- | --- | --- |
| 1 | `GraphFeature.java`: one space in the `COMPOUND` description (upstream #1202, from this project) | Java diff, prose | nothing to port; on a real move the "upstream typos" entry and the comment in `src/graph/properties/GraphFeature.ts` close (#99) |
| 2 | `build/pom.xml`: Tycho 4.0.12 → 4.0.13 | build | none: builds on Maven 3.9.11 with patches 0001-0003 unchanged |
| 3 | 57 re-recorded files differ by one line each: 44 vector refs, 10 golden `_meta.json`, `census.json`, the `.melk` manifest, `bundle-deps.json` | stamp-only | regenerated by the real move (AD-13, #99); 0 files differ once the sha is normalized |
| 4 | 5 of 18,930 corpus-sweep verdicts and one TS finding differ, all `sporeOverlap` | not caused by the move | the unseeded jitter of `ElkGraphImporter.java:169`: 22 and 19 distinct layouts in 24 runs on the new and the pinned oracle; comment on #79 |
| 5 | `spore-layout-vectors.sh` and `elkt-sweep.sh` were committed without the executable bit | tool-side | fixed here (mode only); the fitness test checks the bit |
| 6 | `census.test.ts` and `corpus.test.ts` ignore `ELK_MODELS_DIR` | tool-side | #98; the runbook's rehearsal mode works around it |
| 7 | the pinned sha is repeated in 41 recorder constants; two recorders have no script | tooling | the runbook edits them in one step; #96 |
| 8 | 32 of 124 ported JUnit classes are outside `java-tests.sh`'s two test bundles and were not run | not run | #97 |
| 9 | one failure of `test/corpus/ts-layout-shards.test.ts:314` in the queue worktree during the comparison run | not caused by the move | the #87 intermittent under load; the clone passed it; comment on #87 |

Everything else was the same on both oracles: `.melk` sources and generated options (no diff), 16 unstamped refs
(byte-identical), the twelve sweeps (result files byte-equal to the pinned oracle's; json apart from its `ms` field; the
corpus sweep apart from item 4), the 92 layered JUnit classes (51,267 runs, 0 failures, identical lines), the TS suites over the whole
corpus (28,126 passed on both sides), the `Math.*` fitness test, typedoc (200 warnings), the link check, the example
tests and both `pack:smoke` modes.

**What the rehearsal changed in the plan** (each journaled).

- The stamp is not only `tools/oracle/ELK_COMMIT`: the bump step edits 41 recorder constants, and `sync-sources.sh`,
  `bundle-deps.ts --write` and `census.ts --write` rewrite three more stamped files (start `finding`).
- Cold recorders cost seconds, not hours: 33 scripts and the eleven regen commands took 17 minutes in one lane;
  `elkj-vectors.sh` alone took 4 h 23 min and `elkj-sweep.sh` 5 h 31 min. The re-record phase ended 4 h 23 min after
  its start (cap: 10 h).
- A real move deletes the old oracle and its sweep outputs, so the runbook first copies the "before" side (section 5
  step 1); the comparisons of sections 9 and 10 are byte comparisons against it.
- `git worktree prune` is not part of the cleanup (UP9 as written would have dropped another session's registration).
- The scratch oracle build took 15 minutes because `repo.eclipse.org` answered `503` for four Tycho plugin files; it is
  about 3 minutes otherwise (T2 `finding`).
- The AWT remeasure is compared with `layered-label-metrics.json`, not with `awt.json` as the brief's T3 says.

**Deviations** (each journaled with its reason).

- All five tasks were done by the orchestrator; the runbook text was not delegated (start `plan`).
- Files outside the planned write-sets: `docs/architecture/overview.md` (one table row, T1); the modes of
  `tools/vectors/spore-layout-vectors.sh` and `tools/oracle/elkt-sweep.sh` (T3 `fix`).
- The `elkj` sweep was started beside the `elkj` recorder, paused when the load rule no longer held, run under a
  watchdog, and resumed for good once T3 had ended (T4 `plan`, `fix`): 5 h 31 min of running time in 7 h 12 min; its
  results are byte-equal to the pinned oracle's, so the pauses left no trace.
- Forty-eight short oracle runs for the `sporeOverlap` diagnosis were started without rechecking the load (T4 `finding`).

**Changes to landed code.** None under `src/`. No landed test, vector, ref, tolerance or expected value changed:
`git diff <base> -- test/golden/refs/` is empty, and `tools/oracle/ELK_COMMIT` and `tools/oracle/patches/` are untouched.
Landed files that changed: `tools/oracle/README.md` (a heading and a link), `docs/architecture/overview.md` (one row), and
the two mode changes. CLAUDE.md and the AD rows are untouched.

**Flags for the maintainer.**

- #99 (`needs-ruling`): move `ELK_COMMIT` to `b715fb10`. It regenerates the 57 stamped files (AD-13), closes the
  `GraphFeature.COMPOUND` carve-out, and needs the AD-2 pin text and CLAUDE.md's pin line amended.
- #96, #97, #98 (`follow-up`): one source for the pinned sha and scripts for two recorders; `java-tests.sh` bundle list;
  two tests that ignore `ELK_MODELS_DIR`.
- Comments: #79 (four more flickering `sporeOverlap` ids), #89 (`sync-sources.sh` has the same "HEAD must be the pin"
  condition), #87 (the `childPids()` check failed once more under load, at `:314`).
- **The squash sits on `2605fe3c`, not on the base the driver named.** At 13:34, during the mission, the branch was
  rebased onto `main` with every commit signed, so `13dcc881` and the mission's first six commits got new ids (trees
  unchanged) and `13dcc881` is no longer an ancestor of the branch. Resetting to it would have dropped the nine signed
  commits below it, so the one squashed commit has the signed row-12 commit `2605fe3c` as its parent.
  `refs/mission-base/44` still names `13dcc881`: the driver cannot verify the landing until it points at `2605fe3c`.
- Another repository's session loaded this machine to a 1-minute load above 100 in bursts all afternoon; the measured
  wall times of the long jobs are upper bounds.

**Hand-offs.**

- To the pin move (#99): `docs/architecture/elk-upgrade.md` sections 3 to 13 are the procedure; section 14 repeats
  the rehearsal. The cost tables hold this rehearsal's wall times.
- To #57 and #77 (upstream PRs as oracle patches): a new patch changes the `patches` array of every `_meta.json`;
  normalize it like the sha before calling a file content (runbook section 11).
- To any mission that adds a recorder, regen or sweep script: name it in the runbook and make it executable, or
  `test/docs/elk-upgrade-runbook.test.ts` fails.

## Revision 2026-11-18 (elk-pin-move-8bca22f4)

Appended; no earlier line is edited. Source: issue #104 (the maintainer's ruling of 2026-11-18) and D1-D9 in
`plans/elk-pin-move-8bca22f4/decisions.md`; the journal is `plans/elk-pin-move-8bca22f4/decision-journal.md`. Where this
section conflicts with the text above, this section wins. Task ids are T1-T8; the base is
`9c420f07cb73bac91ca7584f7faa1e5fbef8d0d2`.

**The pin is `8bca22f4afa3371562d2f702d59929818f7f7b71`** (upstream `master` after eclipse-elk/elk#1244, 16 commits past
`e7eaea57`). The oracle is built there with patches 0001-0003, every stamped ref is re-recorded, the six-file net Java diff is
ported with its five JUnit classes, and every sweep and ported suite is rerun. **The mission is halted at the coverage gate on
one test that needs a ruling (#105); everything else is done and committed, unsquashed.**

**Ported (upstream PR → port).**

| Upstream PR | Change | Port |
| --- | --- | --- |
| eclipse-elk/elk#1237 | the desired-position comparator of `InteractiveNodeReorderer` breaks ties by model order | `compareDesiredPositions(modelOrder)`; `InteractiveNodeReordererTest` (3) |
| eclipse-elk/elk#1239 | `placeBeside` sets the moved block's parent row | one line in `CompactionPlacement.ts`; the new `CompactionTest` case |
| eclipse-elk/elk#1241 | nested `INCLUDE_CHILDREN` graphs refuse model order strategies | `ensureNoModelOrderStrategies` in `ElkGraphImporterModelOrder.ts`; `NestedModelOrderConfigurationTest` (10) |
| eclipse-elk/elk#1242 | the spore shift of coincident centres is seeded (`randomSeed`, default 1) | a `Random` field and `shiftUntilUnique` in spore's `ElkGraphImporter.ts`; `RandomSeedTest` (6); regenerated option classes |
| eclipse-elk/elk#1244 | `updateGraph` keeps node centres unique | the `updateGraph` hunk; the new `ScanlineOverlapRemovalTest` case |
| eclipse-elk/elk#1234 | `layerId` and `positionId` lose `output` | regenerated `LayeredOptions.ts` and `LayeredMetaDataProvider.ts` (`HIDDEN` → `VISIBLE`, one sentence) |

**Refs.** 54 files under `test/golden/refs/` changed (44 vector refs, 10 golden `_meta.json`), plus `census.json`, the `.melk` manifest and `bundle-deps.json`; 38 vector refs and every `_meta.json` are stamp-only (the six `elkj` refs among them, recorded in 4 h 49 min). Content, each traced to a PR: `metadata.json` and `layered-framework.json` (#1234, #1242);
`layered-compound.json` (one `frame` line, #1241); `spore-layout.json` (4 `jitter` rows `runsAgree` true, one `frame` line,
`throws/overlap/scanlineHitboxes` re-planned as a full row with its stops; #1242, #1244); `rectpacking.json` (272 rows: the 213
`sort` rows of #75, 55 `stops` and 2 `full` rows through the parent row, 2 `frame` lines; #1237, #1239). Two recorders changed
with the Java: the rectpacking `sort` group copies the comparator and follows #1237, and the spore scenario moved groups. No
golden output changed.

**The expectations of #104.**

| Expectation | Result |
| --- | --- |
| the 213 `sort` rows change, #75's lists become empty | confirmed: exactly those rows changed; 640 of 640 reproduce; the lists are deleted. The old comparator on V8 also reproduces all 640: the rows had recorded the JVM sort |
| `stops` rows that use `placeBeside` may change (#78), the hang ends (#73) | confirmed: 55 `stops` and 2 `full` rows; #78's recomputed list is empty; #73's input terminates on both sides |
| `modelOrderCycleBreaking` throws `UnsupportedConfigurationException` on both sides (#84) | confirmed, byte-equal messages; a second case (`modelOrderCrossingMinimization`) changes its exception the same way |
| the 788 + 807 nondeterministic spore cases become comparable; new TS findings expected | confirmed, and no finding: sporeCompaction 906 ok; sporeOverlap 879 ok, 27 both-throw; two sweeps agree byte for byte |
| the four #79 cases settle | confirmed: all six annotated cases are `ok` on both sides; annotations removed |
| the ptolemy scanline throws go (#1244) | **refuted for 27 cases**: they throw through `NaN` rectangles, not coincident centres (#108). The coincident-centre throws are gone (2 corpus cases, the recorded input) |

**Sweeps and suites.** All twelve sweeps reran; the `elkj` sweep (5 h 47 min) is byte-equal to the old oracle's (2,192 results, identical output trees), and every consumer test passes with no mismatch. The corpus sweep differs from the old oracle's only in spore verdicts (1,597) and the
two layered exceptions above; phase, order, placement, routing, pipeline, labels, loops, json, elkt and label-sizing results are
byte-equal; `compound` differs in 5 `frame` fields. The 92 layered JUnit classes of the old run are identical (51,267 runs); with
the 8 classes added since, 100 classes, 51,299 runs, 0 failures. The five new or changed upstream classes pass on the oracle. The
TS suites over the whole corpus: 28,023 passed.

**Flags for the maintainer.**

- **#105 (`needs-ruling`), the reason for the halt.** `ElkGraphImporter.test.ts` "two nodes ending at identical centres
  collapse into one nodeMap entry …" asserts the behaviour #1244 removes. It is not in the approved list (D5), so it is left
  red. The replacement is `plans/elk-pin-move-8bca22f4/needs-ruling-updateGraph-collapse.patch` (applies cleanly; 192 of 192
  with it). After a yes: apply it, rerun the coverage gate, tag `elk-pin-move-8bca22f4/pre-squash`, squash onto the base.
- **Assertion changes made under D5**, each journaled with before and after: the #75 lists (D5.2); `CHILDREN_NOT_X_GROUPED_ROWS`
  four ids → empty (D5.3); the #79 annotations and the spore source text with its two test strings (D5.4); row counts in five
  test files (D5.5); the comparator's call sites (D5.6); the two PK4 jitter blocks (D5.7). The D5.6 tie test kept its two
  expected values by giving each call its own model order; that reading is listed in #105 for review.
- **Follow-ups:** #106 (exact `jitter` rows), #107 (an arm of `Compaction` no row reaches since #1239), #108 (the `NaN`
  scanline throws, upstream), #109 (the translated `conformance.md` paragraph).
- The runbook's section 6 lacked the bundle names for `melk:generate`; fixed there.
- The machine was shared: the 1-minute load passed 80 several times (this mission's corpus sweep and full test runs, and
  another session). Wall times are upper bounds.

**Hand-offs.**

- To the session that finishes this mission after the ruling: the closing steps are in the "Mission summary" of
  `plans/elk-pin-move-8bca22f4/README.md`.
- To the next pin move: plan the assertion sites from the hunks, not from keywords (`.agent-notes/elk-pin-move-8bca22f4.md`);
  regenerate the "before" list of ported JUnit classes first.

**Close-out, 2026-11-19.** #105 was ruled yes: the `updateGraph` collapse test is replaced by the test of the shift as
proposed (192 of 192 in its file), and the constant the patch left unused is removed (a CodeQL finding, fixed). Gates 1-7 are
green: the full suite has 49,476 passed, 93 skipped and 0 failed, coverage 98.92 / 96.99 / 98.84 / 98.92, and the ref diff is
unchanged. The mission is done: per-task history under the tag `elk-pin-move-8bca22f4/pre-squash`, one squashed commit on
`9c420f07`. The halt paragraph and the #105 flag above describe the state on 2026-11-18. Open for the maintainer: the review
of the D5.6 tie test, and #106 to #109.

## Revision 2026-11-19 (dev-assert)

Appended; no earlier line is edited. Source: issue #45 and D1-D8 in `plans/dev-assert/decisions.md`; the journal is
`plans/dev-assert/decision-journal.md`, the site table `plans/dev-assert/inventory.md`. Where this section conflicts with
the text above, this section wins. Task ids are T1-T8; the base is `98085a3ba4988c620699ce2fb613567ede41e64c`.

**The `devAssert` helper of translation rules 6.8 exists, and 130 of the 143 Java `assert` statements are restored.**
This closes the "Any time: devAssert" follow-ups of the revisions of 2026-10-26 (alg-common, alg-common-nodespacing),
2026-10-30, 2026-11-03 and 2026-11-05 and the later "still unwritten" notes.

**The helper.** `src/java/lang/DevAssert.ts`: `devAssert(check: () => boolean, detail?: () => unknown)`, both arguments
thunks (JLS 14.10: a disabled `assert` evaluates nothing, the detail only on failure). One module flag, off by default as
on a JVM without `-ea`, written by `setAssertionsEnabled`; it is the first reviewed entry of the module-globals fitness
test, and `src/` reads no environment. A failure throws `src/java/lang/AssertionError.ts` (parent JS `Error` = `Throwable`,
so a ported `catch (Exception e)` does not catch it). The suite runs with assertions on (`test/setup/dev-assertions.ts`,
vitest `setupFiles`), as ELK's Tycho build runs JUnit; `ELK_DEV_ASSERTIONS=off` runs it with the production default.

**The sites.** 143 statements at `8bca22f4` in six bundles (core 9, core.debug.grandom 2, alg.common 4, alg.layered 126,
alg.mrtree 1, alg.force 1), all in ported files.

| Outcome | Sites |
| --- | --- |
| restored at the Java position | 124 |
| restored in front of a `throw` the port already had for `assert false; return x;` | 6 |
| left a comment naming an issue (the Java assert fires under `-ea` on an input the suite replays) | 13 |

Five sites had no TS arm (an `if` chain for a `switch`, a dropped `else`, a private constructor); each got its arm.
Supporting code the Java has only for an assert came with it (`ThresholdStrategy.EPSILON`,
`ForsterConstraintResolver.BARYCENTER_EQUALITY_DELTA`, `PolylineSelfLoopRouter.areOrthogonallyRouted`). Four functions
were split for the complexity limits, Java order kept. `SelfLoopHolderTest.test.ts` imports the shim in place of its
local `AssertionError` (D6, the one test edit); `testNonSelfLoopGraph` now passes through `install`'s assert, as in Java.

**No port defect surfaced.** The first run with all 143 sites had 234 failures from thirteen sites. Each was shown
Java-faithful: the oracle or a recorder under `JAVA_TOOL_OPTIONS=-ea` throws the same `AssertionError` at the same line,
or the Java source decides it for a direct unit-test input.

**Flags for the maintainer.**

- **#112 (`needs-ruling`)**: four Java asserts fire under `-ea` on layouts ELK runs: `BoxLayoutProvider.java:738` and
  `:754` (a strict `>` against the current size), `EndLabelPreprocessor.java:377` (unsized end labels, 170 replay rows),
  `SingleEdgeGraphWrapper.java:193` (int overflow on the `Integer.MIN_VALUE` sentinel; the MANUAL / LOOK_BACK rows).
  Upstream drafts are in the journal (T7, "Upstream drafts"); nothing is filed upstream.
- **#113 (`needs-ruling`)**: nine asserts that a port-written unit test or a JVM site vector drives on purpose
  (`InstancePool.java:59`, `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`, `LGraphUtil.java:821`
  and `:907`, `LNode.java:165`, `HighDegreeNodeLayeringProcessor.java:255`, `EdgeLabelSideSelection.java:58`,
  `ForsterConstraintResolver.java:239`). The recommended ruling restores them and lets the named tests run that step
  with assertions off, which is a test edit (AD-13).
- **Follow-ups:** #114 (the three older `AssertionError` stand-ins), #115 (six arms that throw where the Java returns
  after `assert false`), #116 (the corpus sweeps with assertions on), #117 (`ForsterConstraintResolver`: the Java
  unboxing NPE of a null barycenter is not ported).
- Three recorder runs with `-ea` into `$TMPDIR` (cache off) were added to the brief's plan as evidence; no ref, cache
  entry or oracle file was written.
- `SplineEdgeRouter`'s side chain (#141) now leaves the ports null for a value that is neither `LEFT` nor `RIGHT`, as
  the Java does; the old ternary sent it to the right ports. The enum has two constants, so nothing reachable changes.

**Gates.** Format, typecheck and complexity clean. Full suite, assertions on: 49,492 passed, 93 skipped, 0 failed (the
base's 49,476 plus 16 tests of the helper); assertions off: the same 49,492, so the sites are inert in production.
Coverage 98.81 / 96.99 / 98.56 / 98.86 (statements, branches, functions, lines; the function figure is 0.28 below the
base's because thunks of unreachable arms are never called). Typedoc: 0 errors, 200 warnings (200 at the base). CodeQL:
every finding accepted, no new entry. `git diff 98085a3b -- test/golden/refs/` is empty.

**Hand-offs.**

- To whoever rules #112 and #113: the thirteen sites are found with `grep -rn "Not a devAssert yet" src`; each comment
  carries the Java statement and line.
- To later ports: write `devAssert(() => expr)` at the Java position from the start, and run a step that drives an
  asserted-away state with assertions off (`.agent-notes/dev-assert.md`).

## Revision 2026-11-19 (test-helper-consolidation)

Appended; no earlier line is edited. Source: issue #46 and D1-D8 in `plans/test-helper-consolidation/decisions.md`; the
journal is `plans/test-helper-consolidation/decision-journal.md`, the site map
`plans/test-helper-consolidation/inventory.md`. Where this section conflicts with the text above, this section wins.
Task ids are T1-T8; the base is `f5c2c889b7620e152f52a76bbfc993e80dae0f25`.

**The duplicated test helpers that the revisions of 2026-10-26 (alg-common), 2026-11-02, 2026-11-03 and 2026-11-05
(layered-pipeline) left as cleanup are consolidated, with two rows left for the maintainer.** No file under `src/` other
than `*.test.ts` changed, no ref, vector or recorder changed, and no JVM ran.

**Item 1, the per-file `Factories` objects, `CALLERS` tables and order site-replay blocks.** The tree had 181
`: Factories` objects (planning counted 176). 109 moved, 72 stay.

| What | Before | Now |
| --- | --- | --- |
| `Factories` objects moved to an export | 86, one per file | 20 exports: 17 in `test/helpers/layered-replay-factories.ts`, 3 beside the caller tables |
| Order site-replay blocks (`SITE_ROWS`, `siteFactories`, `replaySite`) | 23 files, two variants | `replayOrderSite(id)` in `test/helpers/layered-order-site-replay.ts` |
| `CALLERS` tables | 8 (the routing vectors test and seven spline tests) | four class tables in `test/helpers/layered-spline-callers.ts`; the vectors test spreads them |
| `Factories` objects kept | 72 | each with its reason in `inventory.md` |

Only identical code moved (D1): a script compared each site with its export by text (whitespace collapsed, file-local
phase constants replaced by their literals) and by the module and symbol every identifier resolves to. An `expect` or
`throw` inside a moved object moved with it. The exports are not interchangeable: they differ in which processors are
injected as classes, which phases they dispatch and what a phase outside that set does. The 72 kept objects occur once
(58, most of them injecting the class under test inside one test), spread their file's factories (the seven
`SITE_FACTORIES`, which now spread the imported export), or close over a table or value that differs per file.
`strategyFactories` of `test/helpers/layered-loops-replay-ops.ts` was a sixth copy of the strict five-phase object and is
now that export under its old name.

**Item 2, `fromPattern`.** One copy in `test/helpers/polyomino-fixtures.ts`; the two polyomino tests import it.

**Item 3, the JUnit delta assertion.** `AssertionFailure` lives in `test/helpers/junit-delta.ts`, whose
`assertEqualsWithin` throws it; `edge-route-orthogonal.ts` uses both and re-exports the class.
`LabelAndNodeSizeProcessorOffsetTest.test.ts` had a third identical copy and imports the shared one under the Java's
name. `Issue447Test.test.ts` keeps its own: it is built on `expect(…).toBe(true)`, so replacing it removes an assertion
line (#119).

**Item 4, the older `.elkt` layout harness.** `Issue489Test` and `Issue475Test` run on `defineLayoutTest` and now apply
the Java's `@DefaultConfiguration`, which the harness never did; both pass, assertions unchanged. `Issue457Test` stays on
the harness, so the harness and its test stay: with defaults its two label-less nodes get labels `n` and `ni`, and the
recorded AWT table `layered-label-metrics.json` has neither, so the runner's measurer throws before layout. That needs a
JVM re-record of a ref, which this mission may not do (#118 has the diagnosis and the three steps left).

**Item 5, `ElkLayered.test.ts`'s 199-row loop.** Removed. `LayeredPipelineVectors.test.ts`'s `full rows` group runs the
same 199 row ids through the same `compareFullRow(runFullRow(row), row)` assertion under the same registrations; the
`finds the 199 full rows` pin stays.

**Case counts (vitest JSON reporter, sweep directories off, before the first edit and after the last).**

| | Before | After |
| --- | --- | --- |
| Test files | 1,182 | 1,182 |
| Cases | 49,585 | 49,386 |
| Passed | 49,492 | 49,293 |
| Skipped | 93 | 93 |
| Failed | 0 | 0 |

Per file, three files differ: `ElkLayered.test.ts` 219 → 20 (the 199 proven duplicates), and `Issue489Test.test.ts` and
`Issue475Test.test.ts` with two cases each retitled to the runner's `name [graphFile(…) configMethod(…)]` form. Every
other file has the same titles and statuses. D7 also expected −3 for the harness test and +N for the runner test;
neither happened, because the harness stays.

**Decisions made on the way (journal, T1).**

- Three `.sites` tests wrote `createPhase` as a method where eight others wrote the same body as an arrow property; all
  eleven share one export. D1 names one semantic merge (`switch` against ternary); this second one is syntax only (no
  body uses `this`) and is flagged for review.
- D1's "inject a class directly" is read as a reason to keep once-only objects, not as a bar on identical groups, since
  the brief's lanes list those groups as expected work.
- A planning group of five split in two on its `INJECTED` table (three comment tests, two label tests); each table moved
  with its export.

**Gates.** Format, typecheck and complexity clean. Full suite: 49,293 passed, 93 skipped, 0 failed. Coverage 98.81 /
96.99 / 98.56 / 98.86 (statements, branches, functions, lines), equal to the base. Typedoc and CodeQL figures are in the
journal (T8). `git diff f5c2c889 -- test/golden/refs/` is empty.

**Open rows.**

- **#118 (`follow-up`)**: record `n` and `ni` in the label metrics, move `Issue457Test` to the runner, then map the three
  harness-test cases onto the runner test (two need a ported case) and delete the harness.
- **#119 (`needs-ruling`)**: whether `Issue447Test.test.ts`'s `expect`-based delta assertion may give way to
  `junit-delta` (an assertion edit under AD-13, equivalent in outcome).

**Hand-offs.**

- To whoever writes the next anchored layered test: import a `Factories` export from
  `test/helpers/layered-replay-factories.ts` when one matches exactly; keep a local object when the test injects its own
  class or needs another fallback (`.agent-notes/test-helper-consolidation.md`).
- To whoever moves a suite onto `defineLayoutTest` with defaults: check that the graph's node ids are in
  `layered-label-metrics.json` first.

## Revision 2026-11-19 (linkedlist-int32-cleanup)

Appended; no earlier line is edited. Source: issue #47 and D1-D5 in `plans/linkedlist-int32-cleanup/decisions.md`; the
journal is `plans/linkedlist-int32-cleanup/decision-journal.md`, the caller audit
`plans/linkedlist-int32-cleanup/audit.md`, the `int` site table `plans/linkedlist-int32-cleanup/int32-sites.md`. Where
this section conflicts with the text above, this section wins. Task ids are T1-T3; the base is
`8af2af35cda0683c8b6beb04195eee13885752f1`.

**Two follow-ups are closed: "`LinkedList.ts`'s header claims identity equality for every ELK element" (§ Revision
2026-11-05) and "crossing-count sums … use plain `+`" (§ Revision 2026-10-30).** No ref, vector, golden or recorder
changed, no existing test changed, and no oracle patch was added. Two JVM runs, both read-only: a javac pass over the
Java sources for the audit and one single-file oracle check for #120.

**Item 1, `LinkedList` equality.** The header of `src/java/util/LinkedList.ts` now states the contract: `remove(e)`,
`contains` and `indexOf` compare with `===`; that differs from Java's `equals` for `KVector` (so every `KVectorChain`),
boxed numbers, `Pair`/`Triple`/`Quadruple` and collections; a caller that needs `equals` compares at its call site, as
`HypernodesProcessor.removeEqual` does. The shim's behaviour is unchanged (D3).

Every caller was audited, type-driven on both sides: on the TS side by renaming the methods and reading `tsc`'s
errors (14 calls outside tests), on the Java side by a javac Tree API pass over the sixteen in-scope bundles (845
equality-based calls with receiver type and resolved overload, 178 on a list or collection).

| Verdict (D2) | Rows | What |
| --- | --- | --- |
| `same` | 14 | identity element types (`TEdge` of mrtree, `LNode`, `BlockRow`), the index overload `remove(int)` (3), the no-argument `KVectorChain.remove()` (1) |
| `handled` | 1 | `HypernodesProcessor.java:178`, `KVectorChain.remove(Object)`, through `removeEqual` |
| `differs`, `unreachable-differs` | 0 | no fix under D3 was needed |

The value-equal lists the shim holds (`KVectorChain`, the `LinkedList<Double>` coordinates of `HyperEdgeSegment`,
`rowIndices`/`rowHeights` of `BoxLayoutProvider`) have no other equality-based call in the Java. The planning concern
about `List<Integer>.remove(int)` against `remove(Object)` does not arise: no number list is removed from.

**A defect outside the shim, filed and not fixed (#120).** The javac pass covers every Java list, so the calls on a
value-equal element type that the port keeps as an array were checked as well (the nine rows of `audit.md` § 4): eight
are `same` or compare explicitly, one differs. `LayoutMetaDataService.java:494` tests `category.getLayouters().contains(algorithm)`
with `LayoutAlgorithmData.equals` (ids); `LayoutMetaDataService.ts:139` uses `includes`. Registering a provider twice
leaves one layouter in the Java category and two in the port's (oracle run in the issue). No in-scope bundle reads
`getLayouters()`, so no layout changes. The brief scopes arrays out of #47, hence the issue.

**Item 2, `int` sums.** 30 statements in 9 files of `intermediate/greedyswitch/`, `p3order/` and `p3order/counting/`
now go through `Int32.add`/`Int32.sub`: the four-term sums and `+=` of `SwitchDecider`, the merge-loop sums of
`BetweenLayerEdgeTwoNodeCrossingsCounter`, `NodeInfo.transfer` and every `pathsTo…` sum of `LayerSweepTypeDecider`
(including `allPaths` and the difference, which are `int` operations widened afterwards), the hierarchical sums of
`GreedyPortDistributor`, the group degree of `ForsterConstraintResolver`, three statements of
`HyperedgeCrossingsCounter`, and four `++` on accumulators that are not counts of one collection
(`connectedEdges`, `wrongModelOrder` twice, the barycenter `degree`). 9 rows stay bare with their reason: `double`
accumulators (`LayerSweepCrossingMinimizer.java:416`), counters of one collection, array sizes, index arithmetic.

Two statements of the 2026-10-30 follow-up did not hold when checked: the thoroughness loops of
`LayerSweepCrossingMinimizer` only compare, so there was nothing to convert, and `GraphInfoHolder.ts` has no `Int32`
call (its one counter, `nPorts++`, counts ports). One wrap test exists, at the only pure seam
(`LayerSweepTypeDeciderNodeInfo.transfer`, `2147483647 + 1` reads `-2147483648`, JLS 15.18.2); the other 27 statements
need more than 2^31 crossings or paths to wrap and rest on the unchanged suite (D5).

**Gates (queue gates 1-7, on the finished code tree).** `format:check`, `typecheck`, `complexity` exit 0 (no
violation line). Coverage, full suite with the nine sweep directories off: 1,173 files and 49,295 tests passed (the
base's 49,293 plus the two new ones), 93 skipped, 0 failed; statements 98.81 %, branches 96.99 %, functions 98.56 %,
lines 98.86 %. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`: every finding accepted, no new
entry in `tools/codeql/accepted.json`. `git diff --exit-code 8af2af35 -- test/golden/refs/`: empty.

**Open rows.** #120 (`follow-up`): the `LayoutMetaDataService` re-registration defect. #121 (`follow-up`): value
equality through sets, maps and indirect list calls, which the list audit did not cover. #122 (`follow-up`): Java
`int` arithmetic outside the three crossing-min directories. No `needs-ruling` issue.

**For later missions.** A type-driven caller list costs one `tsc` run (rename the method, read the errors) and a
type-driven Java call list one javac Tree API pass (`audit.md` § 5); both are described in
`.agent-notes/linkedlist-int32-cleanup.md`. A ported `equals` proves nothing about its call sites: check each
`includes`/`indexOf` on instances of a class whose Java declares `equals`.

## Revision 2026-11-20 (label-switcher-mutants)

Appended; no earlier line is edited. Source: issue #48 and D1-D7 in `plans/label-switcher-mutants/decisions.md`; the
journal is `plans/label-switcher-mutants/decision-journal.md`, the mutant table with verdicts and proofs
`plans/label-switcher-mutants/mutants.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T4; the base is `bc7250e5c12e97c6f4c715d3d4d277548533596b`.

**One follow-up is closed, with one mutant left open: "Five mutation survivors in
`LabelDummySwitcherSpaceEfficient.ts` need a new oracle graph to discriminate" (§ Revision 2026-11-06).** No `src/`
file changed (D7: no port defect was found), no oracle patch was added, and one ref grew by two rows.

**The mutant set (D1).** 7f2 journaled only the labels A3, A6, A7, A9, A10 and a count; its scratch copy is gone, so
the five cannot be named. The mission fixed a kept table instead, one edit per decision point of the file: planning's
M1-M18 and eleven more that T1 added for points the table missed (M19-M29). A set that covers every decision point
contains whatever 7f2 mutated. Each mutant is applied alone in a scratch copy under `$TMPDIR` and run against the
switcher cases and the labels replay (D2, D3); no mutation tool was added.

| | killed | survived |
| --- | --- | --- |
| Base suite (`bc7250e5`), 29 mutants | 19 | 10 |
| After the two rows and eight cases | 26 | 3: 2 equivalent with proofs (M1, M5), 1 open (M11, #123) |

Of planning's M1-M18: 15 killed, 2 equivalent, 1 open.

**Rows added.** Two site rows, siblings of Sc13 (`sites/LabelDummySwitcher/spaceEfficient`), recorded by
`tools/vectors/layered-labels-vectors.sh` at oracle `8bca22f4` with patches 0001-0003:

- `sites/LabelDummySwitcher/spaceEfficient-fitsAndTies` (`RIGHT`; nodes 20/50/20/50/20 wide; labels 0 and 50 wide on
  layers `[1,2]`, 80 on `[2,3]`): the trivial fit of a 0-wide label, the early return on a label exactly as wide as
  its leftmost layer, and a tie of potential widths. It kills M6, M8, M14, M17, M26.
- `sites/LabelDummySwitcher/spaceEfficient-vertical` (`DOWN`; labels of extent 30 on `[1,2]`, 50 and 80 on `[1,3]`):
  every `layerWidths` entry starts at 0 in a vertical layout (`LGraphUtil.java:316-318`), so the "no positive
  potential width" arm and the "last unassigned label on a layer" choice are reached. It kills M10, M14, M17, M18.

Each row replays green in `LayeredLabelsVectors.test.ts` and has four anchored cases in
`LabelDummySwitcherSites.test.ts`, literals copied from the row; the T17a cases are byte-identical.

**The ref change (AD-13, D4).** `test/golden/refs/java/layered-labels.json` is append-only: of the 1,305 base rows 0
changed (as parsed JSON and as raw line bytes), 0 are missing, the order is kept, and the header differs only in
`rowCounts.sites`, 42 → 44; 1,307 rows, 14,353,655 bytes (cap 16 MiB). A cold rerun of the recorder on the final
source is byte-identical to the landed ref. Two literals follow the header's count, both journaled as `ad13`:
`LayeredLabelsVectors.test.ts:123` (named by D4) and `test/helpers/layered-labels-replay-rows.test.ts:96` (not seen at
planning; the mission halted on it at gate 4 on 2026-11-19 and resumed on the maintainer's yes, #124).

**The two equivalence proofs.** M1 (the empty-list early return): with no non-trivial label the sort and the loop run
no statement. M5 (the range end of the trivial fit): every layer's `getSize().x` is 0 when the switcher runs, for
every input. The field is private, a javac tree pass over the pinned `alg.layered/src` finds 13 accesses, and only
`LayerSizeAndGraphHeightCalculator.java:60,75` writes `x`, in a slot after the switcher's; an oracle probe prints 0.0
on every layer of five graphs. So the trivial fit succeeds exactly for a dummy width ≤ 0, at the first layer of the
range, with either range end.

**Open: M11 (#123, `needs-ruling`).** The initial `widestLayerWidth` of 0 against -1 differs in effect only when the
leftmost layer's potential width is NaN and a later one is 0. The oracle reaches that (`DOWN`,
`spacing.labelLabel=NaN`), and the port agrees with it on that graph in a scratch replay, but every recorder refuses a
NaN in a recorded value, so no row can carry it. The mutant is equivalent on every input without NaN. The ruling asked
is how to close it: as equivalent on NaN-free inputs, by a NaN-bearing row, or by a direct case from the Java source.

**Gates (queue gates 1-7, on the final tree, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377
files, 10,720 functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,173 files
and 49,305 tests passed (the base's 49,295, plus 2 row replays and 8 anchored cases), 93 skipped, 0 failed;
statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200 typedoc
warnings, as at the base. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`. Gate 7:
`git diff --stat bc7250e5 -- test/golden/refs/` lists `layered-labels.json` only, and the append-only proof holds.

**Oracle.** `oracle-build.json` names `8bca22f4…` and patches 0001-0003 at both sessions; no rebuild.
`git -C ../elk log --oneline 8bca22f4..HEAD` over the layered and core bundles is empty (HEAD is the pin).

**Open rows.** #123 (`needs-ruling`): M11 and the NaN row. #125 (`follow-up`): 7f2's T17b survivors U3/U4
(`AlternatingLayerUnzipper.ts`) are called equivalent on the same "one row" ground, with no kept mutant table. #124 is
ruled (yes) and its edit is in this mission.

**For later missions.** Keep the mutant table (site and edit) in the plan directory: a label is not a mutant. "No row
tells them apart" is a missing row until a proof for every input exists: seven of ten survivors died on two more
rows. A brief that appends rows to a ref names every literal that pins its counts; grep the counts over `src/` and
`test/` before recording. A survivor of an initial-value or `>` mutant is checked against NaN before it is called
equivalent.

## Revision 2026-11-20 (p3order-test-titles)

Appended; no earlier line is edited. Source: issue #62 and D1-D3 in `plans/p3order-test-titles/decisions.md`; the
journal is `plans/p3order-test-titles/decision-journal.md`. Where this section conflicts with the text above, this
section wins. Task ids are T1-T2; the base is `68f37f6e5364ff71ea977d5c528bd5591f163641`.

**One follow-up is closed: the three `describe` titles that mission 7h left** (`plans/layered-compound/decision-journal.md`,
T8 rows of 2026-11-10: "H7 names header comments only, so the titles stay and go to a `follow-up` issue"). Three
lines of `src/` changed, each a title; no assertion, `it` title, body or comment changed (D2), no ref changed, no
oracle run.

| File | Old title | New title |
| ---- | --------- | --------- |
| `p3order/LayerSweepCrossingMinimizerSweep.test.ts:122` | `the hierarchical sweep (hand-built nested graph; U for the rows until 7h)` | `the hierarchical sweep (hand-built nested graph; the layered-compound.json rows reach it, 7h)` |
| `p3order/LayerSweepTypeDecider.test.ts:109` | `LayerSweepTypeDecider on a nested graph (hand-built; U for the rows until 7h)` | `LayerSweepTypeDecider on a nested graph (hand-built; the layered-compound.json rows reach it, the deterministic arm only the ported suites, 7h)` |
| `p3order/GraphInfoHolder.test.ts:151` | `GraphInfoHolder: a graph nested in a node (hand-built; U until 7h)` | `GraphInfoHolder: a graph nested in a node (hand-built; the layered-compound.json rows reach it, parentGraphData only the ported suites, 7h)` |

**Backing (D1).** Cited: `plans/layered-compound/unreached.md`, § H8 closure row 4.1 (reached:
`LayerSweepCrossingMinimizerHierarchical.ts` both functions and `LayerSweepTypeDecider.useBottomUp` on
`full/hierarchy-aware/deep3/sweepiness-0.1`), row 4.1a and the table of § Crossing minimisation (H8 4), which mark
`GraphInfoHolder.parentGraphData` / `portPositions` and the `crossMinDeterministic()` arm of `useBottomUp` **J**
(ported suites only). Measured again on the base tree (TypeScript v8 coverage, no JVM): `LayeredCompoundVectors.test.ts`
alone reaches every function and branch of `LayerSweepCrossingMinimizerSweep.ts` (`sweepInHierarchicalNodes` 10,085
calls, `sweepInHierarchicalNode` 907) and all 23 functions of `LayerSweepTypeDecider.ts`, and has 0 hits on
`parentGraphData`, `portPositions` and `LayerSweepTypeDecider.ts:66 if[0]`; the three ported suites
(`LayerSweepHierarchicalTwoSidedGreedySwitchTest`, `LayerSweepCrossingMinimizerTest`, `SwitchDeciderTest`) reach all
three. Two of the suites assert one of those items (`GraphInfoHolder.test.ts:167`, `LayerSweepTypeDecider.test.ts:136`),
so titles 2 and 3 name it instead of D1's shorter proposed words, which would have overclaimed.

**Gates (queue gates 1-7, on the final tree, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377
files, 10,718 functions, no violation line). The three suites: 3 files and 31 tests passed before and after.
Coverage, full suite with the nine sweep directories off: 1,173 files and 49,305 tests passed, 93 skipped, 0 failed,
as at the base; statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200
typedoc warnings, as at the base. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`.
Gate 7: `git diff --exit-code 68f37f6e -- test/golden/refs/` is empty.

**Oracle.** Not run. `oracle-build.json` names `8bca22f4…` and patches 0001-0003; no rebuild.
`git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.

**Open rows.** #130 (`follow-up`): other staging text that an earlier mission made false, not fixed here (D3). Checked
and stale: `ElkLayeredTestExecutionState.ts:6` ("staged until 7f"; `ElkLayered.prepareLayoutTest` is ported),
`OrthogonalRoutingGenerator.ts:255`, `DebugUtil.ts:12-13`, `docs/architecture/alg-layered.md:394-396`,
`tools/vectors/LayeredOrderVectors.java:26-27` (a recorder source), and the header comments of
`LayerSweepTypeDecider.test.ts:3-4` and `GraphInfoHolder.test.ts:3-4`, which say the rows prove the two items above.
Candidates not checked: ten `intermediate/*.test.ts` headers ("staged until T8" / "T11"),
`test/helpers/layered-pipeline-replay-ops.ts:6-7`, `docs/architecture/alg-layered-placement.md:83-84`. No
`needs-ruling` issue was filed.

**For later missions.** "The rows reach it" is checked per function before it is written: one vitest run of the
ref's vector test with `--coverage.include` on the files in question prints the hits of every function in about ten
seconds (`.agent-notes/p3order-test-titles.md`). A comment that names a mission as the end of a staged state is
removed by the mission that ends it, titles included: a rule limited to comments leaves the titles behind.

## Revision 2026-11-20 (oracle-stale-caches)

Appended; no earlier line is edited. Source: issue #85 and D1-D5 in `plans/oracle-stale-caches/decisions.md`; the
journal is `plans/oracle-stale-caches/decision-journal.md`. Where this section conflicts with the text above, this
section wins. Task ids are T1-T3; the base is `b6b946015df56a9130f2016c67f01afe242b5b07`.

**One follow-up is closed: `tools/oracle/build.sh` called the oracle worktree stale over the vector cache.**
`verify_worktree` counts every `git status --porcelain` line outside `OUTPUT_FILTER` as dirt, and the filter did not
know the `vector-cache/` root that `tools/vectors/vector-cache.sh` writes. An in-place rebuild therefore exited `2`,
and the only documented answer removed the worktree with every cache under it. #85's option 1 is taken (D1); option 2
(one cache root, which would change `tools/vectors/` and turn every cache cold) and option 3 (document the
environment-scoped excludes file) are rejected.

**`build.sh` (T1), 4 lines added and 3 removed.** The filter's last alternative is now
`^\?\? (census|sweep|vector-cache)/$`, with a comment that names the script-written caches. The last line is
`if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi`, so a test can source the file; executing it is unchanged
(`build.sh --bogus` still exits 1 with the usage error). Nothing else joins the filter: the three ad hoc directories
that #85 names (`t4/`, `rerecord/`, `final-gate/`) were already gone from the live worktree (D4).

**Test (T1).** `test/architecture/oracle-build.test.ts`, 8 cases, drives the real `verify_worktree` on a throwaway
git repository and one detached worktree per case, with the maintainer's git configuration shut out, and compares
exit status, stdout and stderr whole.

| Worktree holds | Result |
| -------------- | ------ |
| nothing untracked | verified (0) |
| `vector-cache/` only | verified (0) |
| `census/`, `sweep/`, `vector-cache/`, `oracle-build.json` | verified (0) |
| those four and `t4/` | stale (2) |
| `vector-cache-old/` | stale (2) |
| `sub/vector-cache/`, `sub/` untracked | stale (2) |
| `plugins/vector-cache/`, `plugins/` tracked | stale (2) |
| those four and a modified tracked file | stale (2) |

Red first: against the unguarded script all 8 failed (sourcing ran `main`, which stopped at the usage check); with
the guard alone exactly rows 2 and 3 failed with exit 2; with the filter all pass. `shellcheck` and `bash -n` clean.

**Live proof (T2), read-only.** With the base filter the live porcelain leaves exactly `?? vector-cache/`. With the
new script, sourced and called with `GIT_OPTIONAL_LOCKS=0`, `verify_worktree` prints
`existing oracle worktree verified` and exits 0. `oracle-build.json` has sha256 `87705f69…9911` before and after, and
the worktree's index file kept its mtime, size and hash. `build.sh` was never run on the live oracle, so there was no
rebuild and the 192 MB vector cache is still warm.

**Docs (T2).** `docs/conformance.md` § 1, § 4 step 1 and § 5 rows 1-2, `docs/architecture/elk-upgrade.md` (the
"Stale worktree (issue #85)" hazard, without the pointer to the excludes workaround) and
`docs/architecture/elk-json-text.md` step 5 name the three exempt roots, say that any other untracked root directory
still gives exit `2` and that run output belongs under `sweep/`, and warn that removing the worktree deletes the
caches. They also say what the exemption does not do: a rebuild rewrites `oracle-build.json`, which is part of every
vector-cache salt, so each cached recorder still runs cold once after it. `tools/oracle/README.md` needed no change.

**Gates (queue gates 1-7, on the final tree, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377
files, 10,718 functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,174 files
and 49,313 tests passed, 93 skipped, 0 failed (one file and 8 tests more than the base); statements 98.81 %, branches
96.99 %, functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`:
every finding accepted, no new entry in `tools/codeql/accepted.json`. Gate 7:
`git diff --exit-code b6b94601 -- test/golden/refs/ tools/vectors/` is empty; no recorder or regen script has a
changed input.

**Oracle.** Not rebuilt and not run. `oracle-build.json` names `8bca22f4…` and patches 0001-0003.
`git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.

**Open rows.** #131 (`follow-up`): the 23 translated `docs-site/<locale>/conformance.md` pages still carry the old
text of the four paragraphs (D5; the brief counted 21). No `needs-ruling` issue was filed; no stop condition was met.

**For later missions.** To learn whether the live oracle worktree is stale, source `build.sh` and call
`verify_worktree` (`.agent-notes/oracle-stale-caches.md`); running `build.sh`, with or without `--record-only`,
rewrites `oracle-build.json` and turns every vector cache cold. Local run output still goes under `sweep/`: a new
directory at the oracle root makes the next rebuild exit `2`, and the answer is to move it, not to widen the filter.

## Revision 2026-11-20 (bundle-deps-pinned-read)

Appended; no earlier line is edited. Source: issue #89 and D1-D5 in `plans/bundle-deps-pinned-read/decisions.md`; the
journal is `plans/bundle-deps-pinned-read/decision-journal.md`. Where this section conflicts with the text above, this
section wins. Task ids are T1-T3; the base is `6a16e697346e49a67c7340ac2b9ea7d34100f4bc`.

**One follow-up is closed: two guards asked for the ELK checkout's `HEAD` to be the pin where the pin only has to be
present.** `regeneration › regenerated deps equal the committed file` in
`test/architecture/module-boundaries.fitness.test.ts` is the only check that ties `test/architecture/bundle-deps.json`
to the manifests and to `IN_SCOPE_SUFFIXES`. It was skipped unless `git rev-parse HEAD` of the ELK checkout was the
file's `elkCommit`, because `tools/bundle-deps.ts` read the manifests from the working tree. `tools/melk/sync-sources.sh`
died on the same condition although it reads every blob as `<pin>:<path>`. Both were dead whenever `../elk` sat past
the pin (observed on 2026-11-13; it is at the pin again since the 2026-11-18 pin move) and with the oracle worktree at
any time. #89's suggested fix is taken.

**`tools/bundle-deps.ts` (T1).** `readManifests(elkDir, commit)` reads each in-scope manifest with
`git -C <elkDir> show <commit>:plugins/<bundle>/META-INF/MANIFEST.MF`, never the working tree, and
`generateBundleDeps(elkDir, commit)` stamps the commit it read, so a stamp can no longer name a commit the content
did not come from. The CLI reads at `tools/oracle/ELK_COMMIT` (new `readPinnedCommit`), not at `HEAD`:
`npx tsx tools/bundle-deps.ts --write` now writes the pin's table from any checkout that holds the pin. New
`elkCommitPresent(elkDir, commit)` is `git cat-file -e <commit>^{commit}`. `readElkCommit` (the `HEAD` reader) is
removed. `buildBundleDeps`, `serializeBundleDeps`, the parsers and `IN_SCOPE_SUFFIXES` are unchanged.

**Fitness test (T1).** The regeneration case skips only when the ELK directory is missing or does not contain the
committed `elkCommit` (`ELK checkout <dir> does not contain committed elkCommit <sha>`); its name and both
expectations are unchanged. One new case always runs: `pinned commit › committed elkCommit equals
tools/oracle/ELK_COMMIT`; before it, no test tied the table's stamp to the pin. No other case changed.

**`sync-sources.sh` (T2), four lines.** The two `HEAD` checks become `rev-parse --git-dir`
(`ELK_SOURCE_DIR is not a git checkout: <dir>`, as before) and `cat-file -e "$PINNED^{commit}"`
(`ELK checkout <dir> does not contain <pin>`). Nothing else in the script changed.

**Tests that run in CI (T1, T2).** `test/architecture/bundle-deps.test.ts` (7 cases) builds a throwaway repository
with the 16 in-scope manifests, two commits and an uncommitted third edit, and checks that reading at each commit
gives that commit's stamp and `requires` and never the working tree; it also covers `elkCommitPresent` (present,
absent commit, not a repository) and `readPinnedCommit`. `test/melk/sync-sources.test.ts` (3 cases) runs the script
with `--check` on a non-repository and on a repository without the pin, comparing exit status, stdout and stderr
whole, and runs it live against the configured ELK checkout when that holds the pin. Both were red before the change
(6 of 7 and 1 of 3 failing).

**Proofs.** `module-boundaries.fitness.test.ts`: 58 passed, none skipped with the default `../elk` (`HEAD` = pin) and
with `ELK_SOURCE_DIR=../elk-oracle` (`HEAD` `cb2b6d54`, the pin plus three patch commits; 56 passed, 1 skipped
before); 57 passed, 1 skipped with `/nonexistent` and with a throwaway repository that lacks the pin, each with its
reason in the test name. Negative proof, on temporary hand edits of `bundle-deps.json` that were reverted and checked
against the base: with `src/alg/common` deleted from `src/alg/layered` the regeneration case fails with both
checkouts (with two other cases); with `src/alg/force` added in sorted position to `src/alg/radial` it is the only
failing case with both checkouts, and with `/nonexistent` nothing fails, so it is still the only check of the table's
content. The CLI's output equals the committed file byte for byte with both checkouts; the base CLI with
`../elk-oracle` stamped `cb2b6d54…`. `ELK_SOURCE_DIR=../elk-oracle tools/melk/sync-sources.sh --check` exits 0 with
no output; the base script died there with `ELK checkout is at cb2b6d54… but ELK_COMMIT pins 8bca22f4…`.

**Unchanged.** `test/architecture/bundle-deps.json`, `tools/melk/sources/`, `test/golden/refs/` and `tools/vectors/`
are byte-identical to the base. No assertion, vector or golden changed. No oracle build, recorder or sweep ran;
every git call against an ELK checkout was read-only.

**Docs (T3).** `docs/architecture/elk-upgrade.md`: section 6 (the `sync-sources.sh` comment, the hazard row with
the new message, the `bundle-deps.ts --write` paragraph), the rehearsal note (the regeneration test is no longer a
difference between the clone and the original) and the section 11 list of tests that fail between the pin bump and
the re-record, which gains the two new stamp checks. `docs/architecture/melk-codegen.md`: step 1 of the regeneration
table. `docs/architecture/deferred-bundles-adr.md`: the "Enforced now" sentence, and its four line citations, which
T1 moved. No `docs-site/` page describes either guard.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718
functions, no violation line; `tools/bundle-deps.ts` checked on its own, 19 functions). Coverage, full suite with the
nine sweep directories off: 1,176 files and 49,324 tests passed, 93 skipped, 0 failed (2 files and 11 tests more than
the base); statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200
typedoc warnings, as at the base. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`.
Gate 7: `git diff --exit-code 6a16e697 -- test/golden/refs/ tools/vectors/ tools/melk/sources/
test/architecture/bundle-deps.json` is empty; no recorder or regen script has a changed input.

**Oracle.** Not rebuilt and not run. `oracle-build.json` names `8bca22f4…` and patches 0001-0003.
`git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.

**Open rows.** #132 (`follow-up`): the pin file's path and its read-and-trim are written in 13 TypeScript files (two
tools, eleven tests); this mission added the second tool reader. No `needs-ruling` issue was filed; no stop condition
was met. #89 stays open until the branch merges.

**For later missions.** No pin-stamped tool needs the ELK checkout at `HEAD` any more: `tools/bundle-deps.ts`,
`tools/melk/sync-sources.sh` and `tools/oracle/build.sh` all read the pin by object id, so `../elk-oracle` (or any
clone that has fetched the pin) serves when `../elk` has moved on. During a pin move, bump `tools/oracle/ELK_COMMIT`
before `tools/bundle-deps.ts --write`: the CLI stamps that file's commit, and the `pinned commit` case fails until
the table is rewritten.

## Revision 2026-11-20 (overview-status)

Appended; no earlier line is edited. Source: issue #93 and D1-D6 in `plans/overview-status/decisions.md`; the journal
is `plans/overview-status/decision-journal.md`. Where this section conflicts with the text above, this section wins.
Task ids are T1-T3; the base is `9c31c988647273d0aba2bf41a9612ef3d171de97`.

**One follow-up of docs-publish-prep is done: the site and the README no longer say that no layout algorithm is
ported.** `docs-site/guide/overview.md`, the home page `docs-site/index.md` and `README.md` carried the pre-alpha
notice ("No layout algorithm is ported yet… `src/index.ts` exports nothing public yet") and the sentence "The first
npm publish freezes this surface". The first has been false since rows 7a-8c landed; the second since ruling 8 on #90
as amended on #91 (0.x may change, 1.0 freezes the surface). The docs-publish-prep mission (#43) found the text and
could not change it (DP6); #93 became ready with the #90 ruling.

**English text (T1).** Four blocks on the two site pages and two in the README, nothing else: the overview's warning
and § Public contract; the home page's fourth feature tile and its warning; the README's § Status and § Public
contract. Each now says, with a journaled source per claim: all in-scope ELK layout algorithms are ported and checked
against ELK built from source, with a link to the parity report (rows 7a-8c above, `docs/parity-report.md`); the
public export surface is accepted but not yet in `src/index.ts` (#90, `src/index.ts` is `export {}`); versions stay
0.x until 1.0 and 1.0 freezes the surface (ruling 8 as amended). § Public contract names the accepted surface by kind
(the ElkGraph model and `ElkGraphUtil`, the layout engine, each algorithm's metadata provider and options with their
value types, ELK JSON and the textual graph formats) and links the getting-started page; it does not name the
registration helper or the error classes, which #90 leaves to the implementation. The container and tile title
`Pre-alpha` is `Pre-1.0`. The phrases "No layout algorithm", "Pre-alpha" and "first npm publish" are gone from the
three files.

**One sentence per page depends on the #90 implementation.** It is the same in all three English files: "The public
export surface is accepted but not yet in `src/index.ts`, so the package entry exports nothing public yet." Its
counterparts sit in the warning of each of the 46 locale pages. #90 has a comment listing all 49 files, the
getting-started notice ("has not accepted yet", false since 2026-11-14, #90 step 5) and the header of
`docs/architecture/public-api.md` ("Status: Proposed", "The first npm publish freezes this surface"), which the
README now links and this mission did not edit.

**Scope line (D2): the navigation is left to the #90 implementation.** No change to `navFor`/`sidebarFor`,
`test/docs/locale-complete.test.ts`, `src/index.ts`, the `i18nRouting` setting or any `.vitepress/` file. The
getting-started page and `/reference/` stay out of the navigation; the overview's § Public contract links the
getting-started page in the body, unprefixed in every locale because the page is English-only.

**Translations (T2).** The 23 locale copies of `guide/overview.md` and `index.md` (46 pages) take the counterparts of
the four site blocks and the new `sourceHash`. Per page the difference from the base is three hunks (the hash line and
two blocks) and nothing outside them, checked by the orchestrator with a line diff per file, not taken from the
translators' reports. Six `general-purpose` subagents on `sonnet` with Edit, never Write, each with its own locale
directories, made the edits from one shared brief; the orchestrator then corrected six wordings (a singular "textual
graph format" in de and sv, a dropped "in-scope" in the fi and et tiles, the ko and ru container titles). Container
titles: `Pre-1.0`, except `Pré-1.0` (fr, pt-br), `1.0 以前` (ja), `1.0 이전` (ko), `До 1.0` (ru). `/parity`,
`/guide/getting-started` and `/guide/roadmap` stay unprefixed in every locale; the brief's "`/guide/roadmap` takes
`/<p>/`" was wrong (the roadmap page is English-only) and was not followed.

**Translation status.** Before: three stale pages in each of the 23 locales (`conformance.md`,
`guide/architecture.md`, `guide/overview.md`). After: two (`conformance.md`, `guide/architecture.md`); `index.md` is
stale nowhere. The overview copies had been stale through the hash alone since the pin moves `3da09a9c` and
`a23e0219` edited their sha line; that is cleared.

**Finding: the other two stale pages are not stale through the hash alone.** The brief took `conformance.md` and
`guide/architecture.md` to be in the overview's state. They are not: all 23 copies of each record the hash of the
English sources at `0932a534` (2026-10-11), and since then `docs/conformance.md` gained 2,189 lines over 44 commits
and the two architecture sources 71 lines over 26 commits. #109 and #131 ask for single paragraphs of the conformance
copies. #133 (`follow-up`) records the measurement and asks for a translation pass or a ruling that the conformance
page becomes English-only, and for step 13.2 of `docs/architecture/elk-upgrade.md` to refresh `sourceHash` when a pin
move edits the sha line of a copy whose only drift is that line (every overview copy, from now on).

**Unchanged.** No file under `src/`, `test/`, `tools/` or `docs/`. No assertion, vector or golden changed (D6: no
test pins this prose). No oracle build, recorder, sweep or JVM ran.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,176 files and 49,324 tests
passed, 93 skipped, 0 failed, as at the base; statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %.
`docs:build` exit 0 with 200 typedoc warnings, as at the base; `docs:linkcheck` scanned 555 links with none broken;
`npx vitest run test/docs` 9 files and 897 tests passed, the translation lint over the 23 registered locales among
them. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`. Gate 7:
`git diff --exit-code 9c31c988 -- test/golden/refs/` is empty; no recorder or regen script has a changed input.

**Oracle.** Not rebuilt and not run. `oracle-build.json` names `8bca22f4…` and patches 0001-0003.
`git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.

## Revision 2026-11-20 (recorder-pin-source)

Appended; no earlier line is edited. Source: issue #96 and D1-D6 in `plans/recorder-pin-source/decisions.md`; the
journal is `plans/recorder-pin-source/decision-journal.md`. Where this section conflicts with the text above, this
section wins. Task ids are T0-T4; the base is `f69bbe41328863e14ea646533e11c604949d5715`.

**One follow-up is closed: under `tools/` the pinned ELK commit is written once.** Row 7 of the upgrade-runbook
revision ("the pinned sha is repeated in 41 recorder constants; two recorders have no script") is done. Before, each
of 41 `tools/vectors/*Vectors.java` held `ELK_COMMIT = "<sha>"`, and that constant, not the oracle, was the
`elkCommit` / `oracle` stamp of its vector ref; a pin move had to `sed` all of them, and a forgotten `sed` re-recorded
refs with the old stamp. Now the pin is in `tools/oracle/ELK_COMMIT` (AD-2) and in the generated `.melk` stamp
`tools/melk/sources/manifest.json`, and nowhere else under `tools/`.

**The scripts pass the pin; the recorders read it (T1, D1, D2).** `tools/vectors/vector-cache.sh` has a new
`vc_elk_commit` and passes `-Delk.commit=<pin>` on its three `java` lines (cache off, whole program, per row), which
covers the 26 scripts that call `vc_run`; `graph-vectors.sh`, `graph-json-vectors.sh`, `metadata-vectors.sh` and
`transfer-vectors.sh` pass `-Delk.commit="$pinned"` on their own line. Every one of these scripts already refused to
run unless `oracle-build.json` named the pin. The cache salt formula is unchanged: `oracle-build.json` is in it, and
it names the same commit. In each of the 41 recorders the constant became a lazy accessor of the same visibility,
`elkCommit()`, which throws `system property elk.commit is <value>, not a 40-digit sha; run this recorder through its
tools/vectors/*-vectors.sh script` unless the property is 40 lowercase hex digits. It is lazy because eight recorders
also run in `--sweep` / `--dump` mode from `tools/oracle/*-sweep.sh`, which stamp nothing and pass nothing; no sweep
script changed. 38 recorders call it once more at the start of their vector path, so a recorder started by hand
refuses before it records a row (the other three stamp before their first row). Nothing else in a recorder changed.

**Fitness test (T1, D4).** New `test/architecture/elk-pin.fitness.test.ts`, written first and seen red on the base (41
offenders for each of the first two rules): the pin occurs in no file under `tools/` but the two named above; no
`tools/vectors/*.java` holds a quoted 40-hex literal (a copy at an older pin); every `java` line of
`vector-cache.sh` (exactly three) passes `-Delk.commit=`; exactly 41 recorders call `elkCommit()`, and each is named
by a `*-vectors.sh` that calls `vc_run` or passes the property on every `java` line it has. The program-name rule it
shares with `test/docs/elk-upgrade-runbook.test.ts` moved, unchanged, to `test/helpers/recorder-scripts.ts`.

**Two new scripts (T2, D3).** `tools/vectors/core-jdk-vectors.sh <outDir>` (JDK major 21, then the command of the
program's header) and `tools/vectors/guava-vectors.sh <outDir>` (oracle built from the pin; `com.google.guava`
`Bundle-Version` `33.3.0.jre` and `com.google.guava.failureaccess` `1.0.2` from the p2 cache, each checked). Neither
adds a JVM flag, and `CoreJdkVectors.java` and `GuavaVectors.java` are unedited: both scripts' output into a fresh
directory is `cmp`-identical to the six committed refs. Their stale `Run:` header lines are #134.

**Runbook (T2).** `docs/architecture/elk-upgrade.md` § 5 step 3 keeps its number and now says there is nothing to
edit, with one check (`git grep -c "$OLD" -- tools` prints only the `.melk` stamp); § 7.3 names the two scripts in
place of the hand-built command lines. `docs/architecture/core-engine.md` § 7.6 runs `core-jdk-vectors.sh`. From the
next pin move on, the bump is the pin file alone.

**Cold proof (T3, D5): no ref changed.** Every script whose program, own text or `vector-cache.sh` changed ran cold
into `test/golden/refs/java`: the 29 short scripts in 6 min 17 s of recorder time (31 programs `cache: … recorded`,
the four direct scripts uncached, no `hit`), and `elkj-vectors.sh` in 4 h 03 min (four programs `recorded`, `ElkjRoundTripVectors rows 0/281` in
3 h 22 min, `ElkjWriteVectors rows 0/126`). After each script,
and at the end, `git diff --exit-code f69bbe41 -- test/golden/refs/` was empty with no untracked file. The planner's
risk did not occur: 13 of these scripts do not pin `-XX:hashCode=2`, and their 24 refs are byte-identical although
each program's source changed (`.agent-notes/recorder-pin-source.md`). The eight sweeps whose program changed
(`compound`, `labels`, `loops`, `order`, `phase`, `pipeline`, `placement`, `routing`) were fresh at the base, reran
without `--force` after T1 (12 min 48 s) and wrote `results.jsonl` files `cmp`-identical to the before-side (67,111
lines in all); their eight consumer tests pass on the real sweep dirs. Negative path: `MetaDataVectors.java` without
the property exits 1 with the message above and writes no file; with 40 `a`s as the property its output differs from
the ref in the `elkCommit` line only. All 41 recorders, started without the property, exit 1 with that message
before writing a file.

**Not done, on purpose.** #50 (multi-file `javac` build and two other recorder debts) stays separate (D6): bundled, a
ref change could not have been attributed. The four scripts whose programs stamp nothing (`java-vectors.sh`,
`gson-vectors.sh`, `label-sizing-vectors.sh`, `layered-label-metrics-vectors.sh`) are untouched and were not rerun.
The translated `docs-site/` pages are untouched.

**Issues filed.** #134 (`follow-up`): the `Run:` lines of the two unedited recorders and one sentence of
`docs/translation-rules.md` still give the bare `java` command. #135 (`follow-up`): `AlgCommonVectors.java` does not
compile under `-XX:hashCode=2` (javac's inference of one `List.of(Map.entry(…))` changes when every identity hash is
equal; the base source fails the same way), which matters only if that script is ever pinned. No `needs-ruling`
issue: no stop condition fired.

**Unchanged.** No file under `src/`. No assertion of an existing test, no vector and no golden changed (AD-13). The
oracle was not rebuilt and no patch changed.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,177 files and 49,333 tests
passed, 93 skipped, 0 failed (the base's 1,176 and 49,324 plus the new fitness test's file and 9 tests); statements
98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %, as at the base. `docs:build` exit 0 with 200 typedoc
warnings, as at the base. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`. Gate 7:
every recorder and sweep whose input changed was rerun (above) and `git diff --exit-code f69bbe41 --
test/golden/refs/` is empty.

**Oracle.** Not rebuilt. `oracle-build.json` names `8bca22f4…` and patches 0001-0003 (`builtAt`
2026-11-18T15:18:16Z, sha256 `87705f69…`). `git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty.
`$ELK_MODELS_DIR` is at `ac5af2ba…`, the commit of `test/corpus/manifest.json`.

## Revision 2026-11-20 (java-tests-bundles)

Appended; no earlier line is edited. Source: issue #97 and D1-D6 in `plans/java-tests-bundles/decisions.md`; the
journal is `plans/java-tests-bundles/decision-journal.md`. Where this section conflicts with the text above, this
section wins. Task ids are T1-T3; the base is `5beafe570c607909f5cae92593f17a367418bbed`.

**One follow-up is closed: `tools/oracle/java-tests.sh` runs every ported JUnit class.** The script's `TEST_BUNDLES`
held two bundles (`alg.layered.test`, `alg.test`), so every ported class of another test bundle ran only through a
`sed`-made scratch copy of the script, and section 10 of the upgrade runbook left those classes out of a pin move.
`TEST_BUNDLES` is now a fixed list of thirteen (T1, D1): the two it had, then `alg.common.test`, `alg.disco.test`,
`alg.force.test`, `alg.mrtree.test`, `alg.radial.test`, `alg.rectpacking.test`, `alg.spore.test`, `alg.topdown.test`,
`core.test`, `graph.json.test` and `graph.test` (each `org.eclipse.elk.`-prefixed). Only the array, its comment and
the header comment changed; `THIRD_PARTY`, `build_classpath`, `run_class` and everything under `tools/vectors/` are
as they were (D2). `org.eclipse.elk.shared.test` stays out: nothing cites it, and it needs
`org.eclipse.elk.alg.graphviz.layouter`, which is not an oracle jar.

**The count is 143, not the issue's 124.** The issue's grep matched `Test.java` only. Eight `graph.json.test` suites
are cited as `src/…Test.xtend` (`EdgeCoordsTest`, `EdgesTest`, `ExportTest`, `GraphTest`, `IndividualSpacingsTest`,
`LayoutOptionsTest`, `SectionsTest`, `TransferLayoutTest`); their compiled classes run as plain JUnit 4. With the
ports landed since #44 the list is 100 `alg.layered.test` classes, 35 other `.java` classes and the 8 Xtend suites
(D4).

**The option the issue named was rejected (D1).** An environment variable appended to the list would have left the
runbook spelling out eleven bundle names, would silently drop 43 classes when unset, and is a knob with one caller.
A glob over the oracle's test directories would take `shared.test` and any future bundle unseen.

**Fitness test (T1, D3).** New `test/architecture/java-tests-bundles.fitness.test.ts` (4 tests), written first and
seen red on the base script with exactly the eleven new bundles listed as missing: every test bundle a `.ts` file
under `src/` or `test/` cites by path is in `TEST_BUNDLES`, `alg.test` is carried, the scan finds an `.xtend`
citation of `graph.json.test` (so an empty scan cannot pass), and the array parser reads a list that wraps over
lines. A port that cites a new test bundle fails there until the script carries it. The test needs no oracle.

**Evidence on the pinned oracle (T1, D5).** Before the edit, the landed two-bundle script over the 100 layered
classes: 51,299 runs, 0 failures, 402 s. After it, one call over all 143 classes with section 10's commands: exit 0,
**51,577 runs, 0 failures**, 432 s under `nice -n 10`. The 100 layered lines of the two runs are byte-identical, so
thirteen bundles on the classpath changed no count; the 43 other lines (278 runs) equal the planning probe class by
class, and agree with the counts earlier missions recorded through scratch copies. Per bundle (classes/runs):
`alg.layered.test` 100/51,299, `alg.common.test` 7/49, `alg.disco.test` 1/3, `alg.force.test` 1/3,
`alg.mrtree.test` 1/6, `alg.radial.test` 1/2, `alg.rectpacking.test` 5/23, `alg.spore.test` 3/11,
`alg.topdown.test` 3/11, `core.test` 11/127, `graph.json.test` 9/36, `graph.test` 1/7. All 143 lines are the
baseline in `plans/java-tests-bundles/java-baseline.md`.

**Docs (T2, D6).** `docs/architecture/elk-upgrade.md` § 10 lists the `.java` and `.xtend` citations and runs them
with two commands (they were three, for two bundles); it gives 143 classes, 51,577 runs and about 7 minutes at the
`8bca22f4` pin, and says once that an old-oracle file from the two-bundle commands shows the 43 other rows as
additions the first time. § 5 step 1 follows. The Java-baseline paragraphs of `alg-trees.md`, `alg-force-disco.md`,
`alg-packing.md`, `alg-layered-pipeline.md`, `alg-layered-compound.md` and `text-sizing-seam.md` call the landed
script directly; each keeps its expected counts. The scratch-copy recipes in `plans/*/java-baseline.md` and the
past-tense records of `docs/conformance.md` are history and were not edited. From the next pin move on, section 10
covers every ported JUnit class.

**Not done, on purpose.** The TS half of section 10 (`PIPELINE_SUITES_FULL`) is unchanged. The translated
`docs-site/` pages hold no architecture page and are untouched.

**Issues filed.** #136 (`follow-up`): `tools/vectors/label-sizing-vectors.sh:11` says its classpath "is the one of
tools/oracle/java-tests.sh"; with thirteen bundles in the script and two in the recorder that is no longer exact.
Not edited here, because any edit under `tools/vectors/` colds the vector cache. No `needs-ruling` issue: no stop
condition fired.

**Unchanged.** No file under `src/`. No assertion of an existing test, no vector and no golden changed (AD-13).
The oracle was not rebuilt and no patch changed.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,178 files and 49,337
tests passed, 93 skipped, 0 failed (the base's 1,177 and 49,333 plus the new fitness test's file and 4 tests);
statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %, as at the base. `docs:build` exit 0 with
200 typedoc warnings, as at the base. `codeql`: every finding accepted, no new entry in
`tools/codeql/accepted.json`. Gate 7: `java-tests.sh` is an input of no recorder, regen script or sweep stamp, so
none was rerun; `git diff --exit-code 5beafe57 -- test/golden/refs/ tools/vectors/` is empty.

**Oracle.** Not rebuilt. `oracle-build.json` names `8bca22f4…` and patches 0001-0003 (`builtAt`
2026-11-18T15:18:16Z). `git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/ test/` is empty. `$ELK_MODELS_DIR`
is at `ac5af2ba…`, the commit of `test/corpus/manifest.json`. The JVM runs wrote nothing under `$ELK_ORACLE_DIR`.

## Revision 2026-11-20 (models-dir-env)

Appended; no earlier line is edited. Source: issue #98 and D1-D4 in `plans/models-dir-env/decisions.md`; the journal
is `plans/models-dir-env/decision-journal.md`. Where this section conflicts with the text above, this section wins.
Task ids are T1-T2; the base is `6307bf36c0ff4cd50c7349625e9550c96a06e53f`.

**One follow-up is closed: `census.test.ts` and `corpus.test.ts` read `ELK_MODELS_DIR`.** Both files resolved the
models directory at module scope with `resolveModelsDir({})`. The resolver (`test/corpus/corpus.ts:122-131`) reads
the variable from the environment it is handed, so a literal empty object always gave the default relative path, and
on a checkout that supplies the corpus only through the variable the census drift test, the four golden-input tests
and the `goldens not verified` placeholder skipped without a failure. `census.test.ts:25` and `corpus.test.ts:41`
now call `resolveModelsDir()`, as the 22 other callers do (T1, D1). The constant `defaultResolution` of
`corpus.test.ts` is renamed `resolution` (three lines): under the variable it no longer holds the default path's
result. The resolver's own two tests (`corpus.test.ts:49`, `:58`) keep their env objects. `test/corpus/corpus.ts` and
every other caller are unchanged. This fixes tool-side row 6 of the 2026-11-14 revision on the branch; that row and
the follow-ups line naming #98 stay as written (D4).

**Proof (T1, D2): three runs of the two files, no new test.** The module-scope call has no unit seam, so the evidence
is behavioural. In a scratch `git clone --shared` under `$TMPDIR` whose `../../eclipse-elk/elk-models` does not
exist, with `ELK_MODELS_DIR` naming the pinned models checkout: at the base 46 tests passed and 6 skipped (52), both
skip texts naming the clone's default path; at the T1 commit 51 passed and none skipped (51; the placeholder is
registered only when the directory does not resolve). In the queue worktree after the fix,
`ELK_MODELS_DIR=/nonexistent` gives 46 passed and 6 skipped with skip texts naming `/nonexistent`, so the variable
wins over an existing default; unset, the two files give 51 passed, as at the base. The clone was removed.

**Runbook (T1, D3).** `docs/architecture/elk-upgrade.md` § 14 step 5 loses the paragraph about the two files and
its `mkdir`/`ln -s`/`vitest`/`rm` block; the paragraph after it now opens "Some differences between the clone's
suite and the original checkout's are expected". Step numbers and anchors are unchanged, and
`test/docs/elk-upgrade-runbook.test.ts` is green. A rehearsal clone runs the census and golden-input checks from its
`env.sh` alone.

**Not done, on purpose.** No fitness test forbids `resolveModelsDir({})` (D2: not asked for). The only other
literal-env resolver calls in `test/` are `inputsRoot({…})` in `test/helpers/layout-test-runner.test.ts:229-255`,
tests of that resolver's own rule. `.agent-notes/elk-upgrade-runbook.md` and `plans/elk-upgrade-runbook/` are history
and were not edited; `.agent-notes/models-dir-env.md` says what supersedes them.

**Issues filed.** None: no stop condition fired, so no `needs-ruling`, and nothing was found for a `follow-up`.

**Unchanged.** No file under `src/` or `tools/`. No assertion, title literal or expected value of a test, no vector
and no golden changed (AD-13): the edit changes which directory two landed tests read when the variable is set. The
oracle was not rebuilt and no patch changed.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718
functions, no violation line). Coverage, full suite with the nine sweep directories off and `ELK_MODELS_DIR` unset:
1,178 files and 49,337 tests passed, 93 skipped, 0 failed; statements 98.81 %, branches 96.99 %, functions 98.56 %,
lines 98.86 %; counts and percentages equal the base's. `docs:build` exit 0 with 200 typedoc warnings, as at the
base. `codeql`: every finding accepted, no new entry in `tools/codeql/accepted.json`. Gate 7: no input of a
recorder, regen script or sweep stamp changed, so none was rerun; `git diff --exit-code 6307bf36 --
test/golden/refs/ tools/vectors/` is empty.

**Oracle.** Not rebuilt and not run. `oracle-build.json` names `8bca22f4…` and patches 0001-0003 (`builtAt`
2026-11-18T15:18:16Z). `git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty. `$ELK_MODELS_DIR` is at
`ac5af2ba…`, the commit of `test/corpus/manifest.json`; the models checkout was read, never written.

## Revision 2026-11-20 (dev-assert-restore)

Appended; no earlier line is edited. Source: issue #127 (the maintainer's rulings of 2026-11-20 on #112 row #32,
#113 and #119) and D1-D9 in `plans/dev-assert-restore/decisions.md`; the journal is
`plans/dev-assert-restore/decision-journal.md`, the firing census `plans/dev-assert-restore/census.md`. Where this
section conflicts with the text above, this section wins. Task ids are T1-T7; the base is
`b716710e5098cc2ab9392c251702a2d8bcda6e88`.

**Ten Java asserts that #45 left as comments are `devAssert` calls again.** `InstancePool.java:59`,
`NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`, `LGraphUtil.java:821` and `:907`,
`LNode.java:165`, `EndLabelPreprocessor.java:377`, `HighDegreeNodeLayeringProcessor.java:255`,
`EdgeLabelSideSelection.java:58` and `ForsterConstraintResolver.java:239` (with Java's `lastValue`, start
`Short.MIN_VALUE`) (T2, D5). Of the 143 statements, 132 are now restored, 6 are restored before a kept throw, and 5
stay comments: `BoxLayoutProvider.java:738, 754` and `SingleEdgeGraphWrapper.java:193` (upstream defects, #112;
knowvah/elk#27, #28) and `ThresholdStrategy.java:395, 403` (#128). `plans/dev-assert/inventory.md` has a superseding
section; its earlier rows are unchanged.

**Census (T2).** With the sites live and nothing wrapped, the suite failed in exactly the ruled sets: 170 tests in
12 files at #32 (plus 6 that follow in `LayeredCompoundTwins`), and #113's tests and rows for the other nine. Nothing
else fired.

**The switch (T1, D1).** `withAssertions(enabled, body)` lives in `test/helpers/with-assertions.ts` (one export;
`DevAssert.test.ts` imports it). A step that a test drives into a state the Java assert rejects runs inside
`withAssertions(false, …)`: the `create()` calls without a provider factory in four core test files, one call each
in `NodeContext`, `LNode`, `HighDegreeNodeLayeringProcessor`, `EdgeLabelSideSelection` and (two) in
`ForsterConstraintResolver` tests, the nine `adapters/sweep-*` rows of `LayeredFrameworkAdapterVectors`, and the four
`site/lgraphutil/externalPorts/*` rows in both of their replays (T4, T5, D4). Ten new tests, one per site, pin the
`AssertionError` with assertions on through `assertionErrorOf` (`test/helpers/assertion-error-of.ts`): message `''`,
and `UNDEFINED` at `LGraphUtil.java:907` as on the JVM (D6).

**The #32 rule (T3, D2, D3).** `hasUnsizedEndLabel(root)` (`test/helpers/unsized-end-labels.ts`): some label of an
edge anywhere in the prepared root has `EDGE_LABELS_PLACEMENT` `HEAD` or `TAIL` and fails `width > 0 && height > 0`.
`withEndLabelRule(root, body)` runs the layout step with assertions off when it holds. It is applied in the three
runners the census found (`runRoutingPrefix`, `runRow`, `runPlainFullRow`) and, after T6, in the labels sweep's
`replayCase`. **The predicate selects 572 tests, not the 170 that #127 expected.** All 170 are among them; 6 more
are the twins; 43 never run `EndLabelPreprocessor`; 353 run it without handing the assert a label cell, because
`removeLabelOverlaps` only visits the NORTH and SOUTH sides of a horizontal layout and the EAST and WEST sides of a
vertical one. The oracle under `-ea` exits 0 on `labelStacking_left_down.elkt` and throws at `:377` on
`labelStacking_down_up.elkt`. Whether a model fires depends on port sides and direction, so the rule is per model;
issue #138 records the cost (396 replays with assertions off that would not fire) and the narrowing options.

**#119 (T1, D7).** `Issue447Test.test.ts` uses `junit-delta`'s `assertEqualsWithin`; its private copy is gone and
its two calls are unchanged.

**Sweeps (T6, D9).** The ten sweep files at stride 1 with assertions on, against oracle results of 2026-11-20:
`label-sizing`, `loops` (3,073 checked), `phase` (30,265), `pipeline` (6,646), `order` (6,280), `placement` (1,970),
`routing` (6,280) and `sweep.test.ts` were green as they were. `labels` (68 cases) and `compound` (4 cases, the
`.elkt` model `hierarchy01`) failed, every case at `EndLabelPreprocessorPlacement.ts:117` on a model that meets the
predicate, and are green after the one wrap in the labels sweep helper (950 and 1,169 checked). No other assert
fired. `sweep.test.ts` is a planner unit test that lays nothing out, and `ts-layout-compare` runs its workers with
assertions off, so neither is evidence about asserts (issue #137).

**Issues filed.** #137 and #138, both `follow-up`. No `needs-ruling`: no stop condition fired.

**Unchanged (AD-13).** No expected value, tolerance, case list or existing test title; every edited `expect` line
keeps its text. No vector, golden, recorder or oracle patch. `src/` changed only at the ten sites (nine files).
With assertions off the library behaves as before.

**Gates (queue gates 1-7, 2026-11-20).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,190 files (10 skipped),
49,361 tests passed, 93 skipped, 0 failed; statements 98.81 %, branches 96.99 %, functions 98.56 %, lines 98.86 %,
equal to the base; +2 files and +24 tests against the base (the ten site tests, 11 for the predicate helper, 3 for
`assertionErrorOf`). The same suite with `ELK_DEV_ASSERTIONS=off`: 49,361 passed, 0 failed. `docs:build` exit 0 with
200 typedoc warnings, as at the base. `codeql`: every finding accepted, no new entry. Gate 7:
`git diff --exit-code b716710e -- test/golden/refs/ tools/vectors/ tools/oracle/` is empty.

**Oracle.** Not rebuilt. `oracle-build.json` names `8bca22f4…` and patches 0001-0003 (`builtAt`
2026-11-18T15:18:16Z); `git -C ../elk log --oneline 8bca22f4..HEAD -- plugins/` is empty. It ran twice under
`JAVA_TOOL_OPTIONS=-ea:org.eclipse.elk...` for the #32 evidence, writing to `$TMPDIR` only.

## Revision 2026-11-21 (spore-scanline-0004)

Appended; no earlier line is edited. Source: issue #111 (the maintainer's carried-patch ruling of 2026-11-13) and
D1-D8 in `plans/spore-scanline-0004/decisions.md`; the journal is `plans/spore-scanline-0004/decision-journal.md`.
Where this section conflicts with the text above, this section wins. Task ids are T1-T6; the base is
`832a847d2bebbd10324811509384088fc09fb0a4`.

**Oracle patch `0004` is the first carried upstream patch.** Upstream pull request eclipse-elk/elk#1247 (fixes
eclipse-elk/elk#1246; fork knowvah/elk#19 and #26), open at head `1bf1da95561140eb78d70d5dd747dd46803ead2a` whose
parent is the pin `8bca22f4`, is carried as
`tools/oracle/patches/0004-Report-all-overlaps-of-a-node-inserted-into-the-over.patch` (sha256 `71ad3d68…b140db`),
written by `git format-patch` from the PR's head commit in a scratch clone; its hunks equal `gh pr diff 1247` (T1).
Patches 0001-0003 are seams; `0004` changes what ELK computes, and the port follows the patched Java. It is dropped in
the mission that moves the pin past the PR's merge. If the PR's head moves or it closes unmerged, that is a ruling.

**The change.** `ScanlineOverlapCheck`'s handler `insert` walked the nodes on the scanline in the order of their left
sides and stopped at the first node that did not overlap the inserted node once it had found an overlap, which drops
every overlapping node behind such a node. It now stops at the first node whose left side is at or right of the
inserted node's right side. Port: `src/alg/common/spore/ScanlineOverlapCheckHandler.ts` `insert`, `@see` unchanged,
with a comment naming the PR and the patch (T3). The PR's two tests are ported into
`src/alg/spore/ScanlineOverlapRemovalTest.test.ts` (red on the old walk, both missing the pair `c-p`; green on the
new one). Only `sporeOverlap` runs that check.

**Oracle.** Rebuilt in place with `tools/oracle/build.sh` (the first attempt failed on a 504 from the Eclipse
Foundation licence service, the second built in 143 s): `oracle-build.json` names `8bca22f4…` and patches 0001-0004,
`builtAt` 2026-11-21T05:47:58Z, JDK 21.0.1, Darwin arm64. The per-class diff of the 16 jars and 14 test bundles shows
three changed classes: `ScanlineOverlapCheck`, `ScanlineOverlapCheck$OverlapsScanlineHandler` and the test class
`ScanlineOverlapRemovalTest`. `tools/oracle/java-tests.sh org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest`:
`runs=4 failures=0`. `git -C ../elk log --oneline 8bca22f4..HEAD` over alg.common, alg.spore and the spore test
bundle is empty.

**Refs regenerated by script, patch id `0004` (T2).** Every other ref is byte-identical.

- `test/golden/refs/java/alg-common.json`: 3 of 8 `scanline` rows gain handler calls (`scanline-random-n16` 14 → 17,
  `scanline-random-n24` 40 → 51, `scanline-dense-n30` 84 → 166).
- `test/golden/refs/java/spore-layout.json`: 23 of 340 rows, all `sporeOverlap`: 14 `stops` rows (scanline,
  triangulation and tree stops only; every grow, update and end stop is equal) and 9 `minst` rows. No `full`,
  `throws`, `jitter`, `objects` or `sporeCompaction` row.
- `test/golden/refs/elk-packing/sporeOverlap--overlapRemoval.maxIterations-1.json`: two node positions and one edge
  section.
- The `patches` array of ten `_meta.json` files.

The unported walk fails exactly those rows; the port reproduces all of them at AD-4. No hand-written assertion
changed (AD-13).

**Sweep evidence (T4), nothing committed.** `sporeOverlap` on the patched oracle, 906 cases: 880 `ok`, 26 `throws`;
the port: 880 `ok`, 26 `both-throw`, 0 mismatch. Against the sweep before the patch, 609 of 879 outputs differ, and
one case no longer throws, `…/realworld/ptolemy/hierarchical/pn_brockackerman_BrockAckerman`: its two `NaN` compound
nodes tied on centre x before the patch (both 509.73 wide after their own layouts) and no longer do (643.34 and
442.99), so the scanline's `TreeSet` keeps both. The issue expected the 27 `NaN` throws of #108 to stay; 26 do.
`docs/parity-report.md` is not regenerated (D6) and, like the cached full sweep, still shows 879 / 27.

**Docs (T5).** `docs/conformance.md` § 1 lists four patches and has a "Carried upstream patches" subsection (the
convention, the `0004` row, the refs moved, the sweep evidence); § 4 and two alg-packing passages point to it.
`docs/architecture/elk-upgrade.md` § 4 says a carried patch ends as "merged upstream".

**Issues filed.** #139 (`follow-up`): the corpus sweep cache is keyed by commits, not the patch series, so the cached
full sweep and the parity report predate `0004`. No `needs-ruling`: no stop condition fired.

**Gates (queue gates 1-7, 2026-11-21).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,190 files (10 skipped),
49,363 tests passed (+2, the ported tests), 93 skipped, 0 failed; statements 98.81 %, branches 96.99 %, functions
98.56 %, lines 98.86 %, equal to the base. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`:
every finding accepted, no new entry. Gate 7: the D3 recorders and regen scripts rerun on the final tree leave
`git diff --exit-code test/golden/refs/ test/corpus/generated` empty, and a cache-off rerun of the two vector
recorders is byte-identical to the committed files.

## Revision 2026-11-21 (layered-evidence-gaps)

Queue mission for issue #49, on `chore/issue-queue` (plan and journal in `plans/layered-evidence-gaps/`). It closes the
four coverage-evidence follow-ups the layered missions left open (revisions 2026-10-27, 2026-10-30, 2026-11-02 and
2026-11-03 above). Every new expected value comes from the oracle (`8bca22f4` + patches 0001-0004, no patch change); no
`src/` file changed, and every new row replays at the AD-4 bar.

**1. `InvertedPortProcessorTest.testValidNodeOrder` (found rows, D1).** The 13 ptolemy rows stay vacuous: the nine
vendored ptolemy inputs have no edge leaving a WEST port or entering an EAST port of a side-fixed node (0 edges reach an
assertion on each row). The port of the test now also runs on the 16 other rows of `layered-order.json` that end at
`INVERTED_PORT_PROCESSOR` behind `PORT_SIDE_PROCESSOR`; six execute assertions and pass
(`scenarios/InvertedPortProcessor/inverted-ports` 5 edges, `…/long-edges` 3, `sites/HeadLabels/invertedPort/short`,
`…/both` and `sites/HeadLabels/westOutput` 1 each, `models/ticket-528-violatedNodeOrder/root` 1). Positivity is asserted
where the row's imported input has such an edge. `sites/InvertedPortProcessor/freePorts` omits `PORT_SIDE_PROCESSOR`
on purpose and fails the Java assertion on the oracle's own recorded state (a free-port node keeps an EAST input the
processor skips, `InvertedPortProcessor.java:117-119`); it is outside the test's contract and a test pins that it is
the only row left out. No ref changed.

**2. `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` (new rows, D2).** Six site rows in `layered-placement.json` (604 → 610,
`sites` 26 → 32): `sites/HierarchicalPortDummySizeProcessor/{two-north, two-south, three-north, three-south,
two-south-out, mixed}`. With `spacing.edgeEdgeBetweenLayers` 7 the oracle's dummy widths per layer are `[0, 14]`,
`[14, 0]`, `[0, 14, 28]`, `[28, 14, 0]`, `[14, 0]` and (two north, two south) `[0, 14, 14, 0]`, and each dummy's EAST
port sits at its width: `delta` and `step` are oracle values.

**3. The three Medium splitter arms (new rows, D3 rung 1 for all).** Seven plan-A site rows in
`layered-routing-steps.json` (277 → 284, `sites` 25 → 32; `layered-routing.json` byte-identical):
`sites/HyperEdgeSegmentSplitter/noFreeArea/{unbounded, finite, consumed}` reach `HyperEdgeSegmentSplitter.ts:220 if[1]`,
`…/areaStartRounding/{single, consumed}` reach `:400 if[1]`, `…/areaEndRounding/{single, consumed}` reach `:406 if[1]`.
Breakpoints on the unmodified oracle classes (`jdb`) count each arm on the JVM; the five earlier splitter rows take
none. The generic routing replay now takes all 24 branches of the splitter, and
`HyperEdgeSegmentSplitter.sites.test.ts` pins the oracle's counts and split positions. No direct-call row and no
unreachability proof was needed. Mechanisms and the count table: `plans/layered-evidence-gaps/unreached.md`.

Corrections to `plans/layered-edge-routing/unreached.md` (that file is not edited): its `:31` says two Medium arms where
its rows list three; its `:105` argument that a critical-cycle segment always has a free area in its own span does not
hold (two segments sharing both coordinates have none); its `:114` classification of the two rounding arms as
unreached is superseded. Open, not blocking: `:406` with only non-negative coordinates, and a span emptied by
consumption without exactly equal coordinates.

**4. Port alignment and border offsets through layered (new rows, D4).** 72 `scenarios` rows in
`layered-pipeline.json` (1,239 → 1,311, `scenarios` 93 → 165; `full` stays 199): `scenarios/PortAlignment/*` (27
graphs: `portAlignment.default` × BEGIN, CENTER, END, JUSTIFIED, DISTRIBUTED; each side's option × BEGIN, CENTER, END,
JUSTIFIED; a default with two side overrides; single-port sides; overhanging ports) and `scenarios/PortBorderOffset/*`
(9 graphs: +5 and −5 on north and south ports, alone, under BEGIN and END, on every side, and mixed). Each graph is
recorded at `LABEL_AND_NODE_SIZE_PROCESSOR` (`…/ports`, where the row holds every port position) and at the end of the
plan (`…/end`), because a whole-plan row records no port position. Layered sizes nodes through
`NodeDimensionCalculation`, never `NodeMicroLayout`, so `node-micro-layout.json` is untouched (planning D4). Under the
pipeline replay alone, the untaken branch arms of `PortPlacementCalculator.ts` drop from 8 to 2 (the two left are the
FIXED_RATIO cases, reached by other suites).

**Findings.**

- An unset port alignment is placed DISTRIBUTED in layered, although `Layered.melk:144` declares JUSTIFIED:
  `NodeContext.getPortAlignment` reads the `CoreOptions` default. The oracle rows record it and the port agrees (#142).
- The planning scan missed two earlier whole-layout rows that set per-side alignments
  (`full/labels/examples-general-spacing-ports/default` and `…-portsSurrounding/default` in `layered-labels.json`);
  neither sets END or `portAlignment.default`.
- The acceptance line of T1 that named `freePorts` as a passing row was a planning assumption; see item 1.

**Refs regenerated by script (D5).** `layered-placement.json`, `layered-routing-steps.json`, `layered-pipeline.json`:
for each, an id-keyed diff against the base shows every base row JSON-equal and in order, the new ids only under the
mission's prefixes, and the header differing only in `rowCounts`. Every other file under `test/golden/refs/` is
byte-identical. Recorder runtimes: 9 s, 11 s and 15 s. Inventory growth (D6): `HierarchicalPortDummySizeProcessor.test.ts`
row list, `layered-routing-replay-rows.test.ts` group counts, `OrthogonalEdgeRouter.test.ts` `P5_EDGE_ROUTING` 29 → 36.
No assertion about an existing row changed (AD-13).

**Docs.** `docs/conformance.md` parts c-f, `docs/architecture/alg-layered-placement.md`, `alg-layered-routing.md`,
`alg-layered-pipeline.md` and the three counts in `docs/architecture/overview.md`.

**Issues filed.** #140 (`follow-up`): a ptolemy row where the Java test asserts needs a vendored corpus model and
`.elkg` conversion tooling. #141 (`follow-up`): the superseded statements of `plans/layered-edge-routing/unreached.md`
and the two open points. #142 (`follow-up`): the unset-alignment default. No `needs-ruling`: no stop condition fired.

**Gates (queue gates 1-7, 2026-11-21).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,191 files (10 skipped),
49,487 tests passed (+124 over the base's 49,363), 93 skipped, 0 failed; statements 98.81 %, branches 97.00 % (base
96.99), functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`:
every finding accepted, no new entry (one new finding, an unchecked `Integer.parseInt` in the pipeline recorder, was
fixed instead). Gate 7: the three recorders rerun on the final tree are byte-identical to the committed refs and
`git diff --exit-code test/golden/refs/` is empty. Two gate fixes on the way, both in the pipeline recorder and both
journaled: a helper deleted by a comment edit (the recorder did not compile), and the `parseInt` finding.

## Revision 2026-11-21 (vector-recorder-debts)

Queue mission for issue #50, on `chore/issue-queue` (plan and journal in `plans/vector-recorder-debts/`). It closes the
three recorder-tooling debts of revisions 2026-10-28 and 2026-10-29 above. No file under `src/` changed, no oracle
patch or pin changed, and every file under `test/golden/refs/` is byte-identical to the base.

**1. A multi-file build for the recorders (D1, D2).** JDK 21's source launcher takes one file, which is why the layered
recorders ran to 4,752 lines. `tools/vectors/java-program.sh` now starts every cached recorder: a program
`tools/vectors/<Program>.java` with a directory `tools/vectors/<Program>/` beside it is compiled by `javac` (the entry
and every `*.java` under the directory, into a temporary directory that is removed afterwards) and run by class name;
without the directory the launch is word for word the old source-launcher line. `jp_run` takes that line as its
arguments, so the three launch lines of `vector-cache.sh` still read `java -Delk.commit=…` and the pin fitness test
(#96) is unedited. The cache salt and the loops sweep's stamp cover every source of a program and the helper script.

**2. One recorder split as the proof (D3).** `LayeredLoopsVectors.java` (4,571 lines) is now an entry file of 358
lines and ten helper sources of 291 to 659 lines in `tools/vectors/LayeredLoopsVectors/`: the former file cut at its
section comments, by verbatim moves. The helpers are one chain of superclasses ending in the entry, so static
initialization keeps the single file's textual order (JLS 12.4.1) and inherited names need no qualifier; the cut
needed 123 compiler-derived insertions on 118 of 3,983 body lines (77 qualifiers for what stays nested in the entry, 6
for a later helper, 40 record accessors), and a script check found no other difference. Two things keep recorded
output fixed: `ShrinkWidthManager` and the four exception classes stay nested in the entry (the ref records
`LayeredLoopsVectors$ShrinkWidthManager`), and every helper class name starts with `LayeredLoopsVectors`, because
`elkFrame` tells the recorder's stack frames from ELK's by that prefix (found during the cut, not at planning).
`layered-loops-vectors.sh` passes `--plan-dump` through, since `java LayeredLoopsVectors.java` no longer compiles.

**3. The melk recorder encodes `List<Integer>` defaults (D4).** `test/melk/recorder.ts` takes a list's element number
kind from the declared type in the vendored `.melk` model (three options, all `List<Integer>`). Both melk tests now
compare the `cmEnforcedGroupOrders` option and support records, and the framework service dump, with the unfiltered
JVM dump; the `ShapePrimer` exclusions and their three "unencodable" assertions are gone (D4: they asserted a tool's
limit). A mutated default item fails the full comparison naming the record. No oracle value changed.

**4. `dumpLGraph` encodes `KVectorChain` (D5).** As the recorder does: a list of `KVector` objects. The patch module
`test/helpers/layered-site-replay-dump.ts` stays: instrumented after the change, it patches no `KVectorChain` (2,307
before) but still `Random` 1,870, `Spacings` 1,870, `LayeredLabelsVectors$ShrinkWidthManager` 170,
`LayoutOptionProxy` 28 and `LPort` 8 values over 62 test files. Planning expected only `KVectorChain` and 10
importers; there are 56. No replay assertion changed.

**Proof (D6).** `vector-cache.sh` is in every salt, so all 26 scripts that source it recorded afresh on their first
run after the change: 24 of the 25 short scripts print `recorded` only (30 programs, 276 s), `layered-loops` recorded
on its final sources in T4's check (`cmp` equal) and hit that entry in the batch, and the `elkj` lane recorded all 407 rows of
its two row programs (`rows 0/281`, `rows 0/126`) and its four whole programs in 3 h 47 min, exit 0, with no `hit`.
`git diff --exit-code f9e33263 -- test/golden/refs/` is empty. The loops sweep, run at the base and again on the split
recorder, wrote 3,073 results both times, `cmp`-identical (sha256 `7f9633a8…8712`); its consumer test checks 1,537
cases with 0 mismatches; `--dump` of four cases is byte-equal. The nine unpinned scripts among the 26 are launched as
before and their refs did not move. The 10 scripts that do not use the cache are untouched and were not rerun.

**Not done (D3, rejected (a)).** The other 14 recorders of 1,800 lines or more are still single files, and the ten
layered recorders still carry their own copies of the `Dump` and `Encoder` (#143).

**Docs.** Runbook `docs/architecture/elk-upgrade.md` § 7.1 ("Multi-file recorders") and
`docs/architecture/alg-layered-loops.md` § 3. Notes: `.agent-notes/vector-recorder-debts.md`.

**Issues filed.** #143 (`follow-up`): split the remaining multi-thousand-line recorders, with the six preconditions
this mission met. #144 (`follow-up`): the five classes `dumpLGraph` still leaves as `{ class }`. No `needs-ruling`: no
stop condition fired.

**Gates (queue gates 1-7, 2026-11-21).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,194 files (10 skipped),
49,509 tests passed (+22 over the base's 49,487), 93 skipped, 0 failed; statements 98.81 %, branches 97.00 %,
functions 98.56 %, lines 98.86 %. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`: every
finding accepted, no new entry; the Java suite scanned the ten helper files and reports 0 findings. Gate 7: every
recorder whose inputs changed was rerun (all 26 cached scripts and the loops sweep), and
`git diff --exit-code test/golden/refs/` against the base is empty.

## Revision 2026-11-21 (layered-loops-evidence)

Queue mission for issue #55, on `chore/issue-queue` (plan and journal in `plans/layered-loops-evidence/`). It closes the
arms of the self-loop, wrapping and compaction port that mission 7g left unobserved (revision 2026-11-10 above; 7g's
journal, T21 rows). Every new expected value comes from the oracle (`8bca22f4` + patches 0001-0004, no patch change); no
`src/` file changed, and every new row replays at the AD-4 bar.

**1. The ten mutation survivors (M1-M10): all killed by new oracle rows.** 15 `sites` rows are appended to
`layered-loops.json` (1,627 → 1,642 rows, `sites` 64 → 79; 16,399,101 → 16,511,138 bytes, 112,037 of the mission's
250,000-byte budget, 266,078 bytes left under the 16 MiB cap). The id-keyed diff shows every earlier row byte-equal and
in its order. Rerunning the ten mutants against the kill suite (12 files, 2,619 tests) kills each one, and only through
the replay of a new row:

| Mutant | Site (Java) | Killing row (`sites/…`) |
| ------ | ----------- | ----------------------- |
| M1 | `PortSideAssigner.java:189` (`size / 2`) | `PortSideAssigner/oddCornerSplit/EQUALLY` |
| M2 | `BreakingPointInserter.java:283` (`lDist < rDist`) | `BreakingPointInserter/improveCutsTie` |
| M3 | `NetworkSimplexCompaction.java:130` (`Math.max(0, delta)`) | `NetworkSimplexCompaction/negativeSeparationDelta` |
| M4, M5 | `NetworkSimplexCompaction.java:254`, `:264` (inverted-port edge) | `NetworkSimplexCompaction/westInvertedPortEdge` |
| M6 | `LGraphToCGraphTransformer.java:654` (`margin.bottom`) | `LGraphToCGraphTransformer/southExternalPortMargin/{INSIDE,OUTSIDE}` |
| M7, M8 | `ComponentsCompactor.java:173`, `:174` | `ComponentsCompactor/externalEdgeOffset/{west,northFlush,northAbove}` |
| M9 | `ComponentsCompactor.java:164-166` (the y arm) | `ComponentsCompactor/externalEdgeOffset/{northFlush,northAbove}` |
| M10 | `ComponentsToCGraphTransformer.java:271` (placeholder bottom) | `ComponentsToCGraphTransformer/southPlaceholderExtent/{south,southWest}` |

No mutant is equivalent or open. Three of #55's recipes could not work as written (M2: no index beats the manual cuts;
M6: the dummy has no margin without `PORT_LABELS` in the size constraints; M10: a WEST or EAST placeholder never leaves
its hull's y-range), and planning's "no negative `delta`" (M3) was wrong. The graphs and the mechanisms are in
`plans/layered-loops-evidence/unreached.md` ("Mutant findings") and `mutants.md`.

**2. `SplineEdgeRouterSegments.ts:137 if[1]`: reached, class X.** `layerUnzipping.strategy=ALTERNATING` with
`edgeRouting=SPLINES` on an inverted port inside a cycle (W.p0 → T, W → X, X → T) reaches the router with two edges
between non-adjacent layers, one per Java site (`SplineEdgeRouter.java:398-402`, `:445-449`). The oracle then throws a
`NullPointerException` at `SplineEdgeRouter.getSplinePath` (`:956`), so there is no row (D5). Two single-file oracle
probes give the layers before the router, the two edges and the throw site; `SplineEdgeRouter.sites.test.ts` asserts all
three in the port (a `TypeError` out of `getSplinePath`) and the sizes of two control layouts. Planning's graph (W.p0 → T
alone) does not reach the arm.

**3. Sc28, the four rectilinear-hull arms: no row, reclassified.** `RectilinearConvexHull.ts:17` (equal arm) and
`:223 if[1]` are U by proof for every hull `of` builds; `RectilinearConvexHullRectangleEventHandler.ts:71 if[1]` is U
for finite coordinates (a hand-built list with a non-finite y reaches it; no row of the ref hands `of` such a point);
`PointQuadrant.ts:63 binary-expr[1]` was already covered by a structural case and is U on V8 through the hull
(`Array.prototype.sort` passed the later element first in every one of 1.5 million measured calls). 7g's "hulls of 32+
points" described the JDK's sort.

**4. Node-level `selfLoopDistribution` × `selfLoopOrdering` (D7).** Four rows
`sites/PortRestorer/freeDistribution/{NORTH-REVERSE_STACKED, NORTH_SOUTH-REVERSE_STACKED, EQUALLY-SEQUENCED,
EQUALLY-REVERSE_STACKED}`: the options on a FREE node whose ports are all hidden, with two one-sided loops on the north
side. The 27 root-level rows are untouched.

**Corrections to `plans/layered-loops-wrapping-compaction/unreached.md`** (that file is not edited, D10; the new
classes are in `plans/layered-loops-evidence/unreached.md`): `SplineEdgeRouterSegments.ts:137 if[1]` S → X;
`PointQuadrant.ts:63 binary-expr[1]` S → J, and U on V8 through the hull; `RectilinearConvexHull.ts:17` equal arm and
`:223 if[1]` S → U; `RectilinearConvexHullRectangleEventHandler.ts:71 if[1]` S → U for finite coordinates. #55's line
numbers `ComponentsCompactor.ts:95,96,169` are `:96`, `:97`, `:170-173` at the base.

**Ref regenerated by script.** `test/golden/refs/java/layered-loops.json`, by `tools/vectors/layered-loops-vectors.sh`
(cold, `nice -n 10`) on the oracle named above; the recorder gained `evidenceSites()` and three small builders in
`LayeredLoopsVectorsSites.java` (465 lines) and a header paragraph. No other ref changed, and no existing assertion
changed (AD-13).

**Docs.** `docs/architecture/alg-layered-loops.md` (counts, § 8), `docs/architecture/overview.md` (the 7g sentence),
`docs/conformance.md` (part h evidence). Notes: `.agent-notes/layered-loops-evidence.md`.

**Issues filed.** #148 (`needs-ruling`): two ELK behaviours met on the way, drafted for upstream in
`plans/layered-loops-evidence/upstream-drafts.md` and not filed there: the spline `NullPointerException` under layer
unzipping (item 2), and NaN positions from components compaction for a bottom padding of 4e-5 with a component spacing
of 0 (the port agrees with the oracle on both). #149 (`follow-up`): a JVM vector for the non-finite hull case, NaN in
`layout` step rows of the replay, the superseded 7g entries, and a test that times out under load. Stop 4 did not fire.

**Gates (queue gates 1-7, 2026-11-21).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite with the nine sweep directories off: 1,194 files (10 skipped),
49,542 tests passed (+33 over the base's 49,509), 93 skipped, 0 failed; statements 98.81 %, branches 97.00 %,
functions 98.56 %, lines 98.86 %. A first coverage run was red on one timeout (5,240 ms against vitest's default
5,000 ms) in an untouched disco test while the machine's load average was about 41; the rerun at a lower load is the
result above (#149). `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`: one finding in the new
recorder code (`Integer.parseInt` on a table entry) was fixed at its origin; every finding accepted, no new entry.
Gate 7: the loops recorder rerun cold reproduces the committed ref byte for byte, and
`git diff --stat 4c380f26 -- test/golden/refs/` shows `layered-loops.json` only.

## Revision 2026-11-21 (layered-stress-cases)

Queue mission for issue #58, on `chore/issue-queue` (plan and journal in `plans/layered-stress-cases/`). It carries out
the maintainer's ruling of 2026-11-13 (option 1): the three runner cases 7h held back because their models lay a child
out with `elk.stress` (H13) now run. No file under `src/` other than the two suite files changed, no oracle patch or pin
changed, and no ref changed apart from four keys appended to one table. Oracle: `8bca22f4` + patches 0001-0004 (built
2026-11-21T05:47:58Z); `git -C ~/git/knowvah/elk log 8bca22f4..HEAD` over alg.layered, alg.force, alg.test and
alg.layered.test is empty.

**1. The hold-back is gone (ruling item 1).** `STRESS_PENDING`, `test/helpers/stress-pending.ts` and its pin test are
deleted. `Issue665Test.test.ts` and `Issue700Test.test.ts` list their sources inline, each Java source after its
`compound/` twin, with the Java's assertions byte-identical. Ruling-authorised test changes, not an AD-13 loosening:
`Issue665Test` loses its `it.skip` and gains a count test of 1; `Issue700Test`'s count goes from 2 ("the oracle runs
minus the H13 cases") to 4 (the oracle's runs).

**2. The runner registers force and stress (D1).** `registerTestAlgorithms()` in `test/helpers/layout-test-runner.ts`
registers `ForceMetaDataProvider` and `StressMetaDataProvider` next to layered, once each behind a probe of the
algorithm id (#120), before an experiment's graph is provided: a model resolves its algorithm and option suffixes while
it is parsed. That is the seat `PlainJavaInitialization` has in the Java (alg.test registers every provider; the suite
bundle does not require alg.force). The other six providers of that list are not registered: no ported suite names
them. The ten option ids force and stress add share no dot-suffix with a core or layered id, and the 52 test files that
import the runner give the same test titles and statuses before and after, in default mode, under
`PIPELINE_SUITES_FULL=1` and with the fixed measurer.

**3. Label metrics, appended (ruling item 2).** `tools/vectors/layered-label-metrics-texts.txt` gained
`insideOtherLayout`, `child1`, `child2`, `insideOtherDirection`; the unmodified recorder on the reference platform (macOS
arm64, JDK 21.0.1) wrote `[89.0, 11.77734375]`, `[29.0, 11.77734375]`, `[29.0, 11.77734375]`, `[101.0, 11.77734375]`,
the ruling's values. **Ref change:** `test/golden/refs/java/layered-label-metrics.json`, +5/−1 lines; the earlier
entries are byte-identical. Count correction: 2,317 earlier entries, not the ruling's 2,258 (7g and 7h appended after
that count was taken). The oracle's own measurer (`label-sizing-vectors.sh --remeasure-awt`) reproduces the new table
byte for byte on all 2,321 texts.

**4. Two models vendored (ruling item 3).** Byte copies from elk-models `ac5af2ba`, with manifest rows:
`test/golden/inputs/compound/tickets/layered/665_includeChildrenDoesntStop.elkt` (sha256 `bbba2eae…a2e0a`) and
`test/golden/inputs/compound/examples/hierarchy/hierarchicalLayoutMixing.elkt` (sha256 `c082c39d…683b4`). The
inventory test of `test/golden/algorithm-refs.test.ts` gained a two-entry list (`STRESS_SUITE_INPUTS`); the compound
recorder's 31 inputs are unchanged, and no recorder walks `compound/`, so no recorder input changed.
`tickets/layered/588_hierarchicalLayoutNPE.elkt` stays out (no suite reads it).

**Evidence.** Both suites pass with 1 and 4 layout cases in default mode (vendored), under `PIPELINE_SUITES_FULL=1`
and with `ELK_TEST_TEXT_MEASURER=fixed`. The oracle gives `Issue665Test runs=1 failures=0` and `Issue700Test runs=4
failures=0`, in default mode and with the fixed measurer. Beyond the brief, because the two suites assert little: the
port's layout of each of the two models is byte-equal to the oracle's JSON export (`tools/oracle/run.sh`; 3,685 and
10,645 bytes).

**Docs.** `docs/conformance.md` (the 7h table, the H13 bullet, the 8b bullet, two sentences after dated
text-sizing-seam evidence), `docs/architecture/{alg-layered-compound,alg-force-disco,text-sizing-seam,alg-packing,
overview}.md`, and one new H13 row in `plans/layered-compound/decision-journal.md`. Notes:
`.agent-notes/layered-stress-cases.md`.

**Issues filed.** #150 (`follow-up`): a stale 7h sentence about unported bundles, the absent golden for the two
mixed-algorithm models, `registerForce` applying each options class twice, and `loadGraphFile` registering layered
only. No `needs-ruling` question arose and no stop condition fired. One tool slip is journaled: the brief's
`java-tests.sh` line lacked `MODELS_REPO`, which makes JUnit report each runner class as `runs=1 failures=1`; the rerun
with it set is the result above.

**Gates (queue gates 1-7, 2026-11-21).** `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,729
functions, no violation line). Coverage, full suite, one run: 1,193 files, 49,557 tests passed (+5 over the base's
49,552), 83 skipped (−1), 0 failed; statements 98.81 %, branches 97.01 %, functions 98.56 %, lines 98.86 %, as at the
base. `docs:build` exit 0 with 200 typedoc warnings, as at the base. `codeql`: every finding accepted, no new entry.
Gate 7: the metrics recorder rerun reproduces the committed ref byte for byte, and
`git diff --stat 32ca890e -- test/golden/refs/` shows `layered-label-metrics.json` only.
