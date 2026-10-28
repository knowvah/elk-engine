<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — layered-framework, mission 7a (locked 2026-10-27)

The user approved L1–L7 during planning, as recommended. They amend, and never rewrite, AD-1…AD-16
(`plans/elk-engine-skeleton/decisions.md`), the standing rules (`plans/core-metadata/decisions.md`), M-rows
(`plans/core-engine/decisions.md`), R-rows (`plans/core-remainder/decisions.md`), AC1–AC6/P1–P7
(`plans/alg-common/decisions.md`), NS1–NS6/Q1–Q6/U1 (`plans/alg-common-nodespacing/decisions.md`) and D1–D7/E1–E3
(`plans/ad13-rederivation/decisions.md`).

| ID  | Decision |
| --- | -------- |
| L1  | **Forward references.** A phase-strategy factory arm (`CycleBreakingStrategy`, `LayeringStrategy`, `CrossingMinimizationStrategy`, `NodePlacementStrategy`) whose class is not ported throws `UnsupportedOperationException` naming the class and its mission, with no import. Every other forward reference becomes a **staged class**: its own file at the Java path, the members 7a code references ported verbatim, every other method throwing `UnsupportedOperationException` naming the completing mission. Each staged file carries the header marker `@staged <mission>`; `test/architecture/staged-classes.json` lists `{ path, mission }` and a fitness test keeps the two in sync both ways. The list is empty after 7h |
| L2  | **Scope split.** `ElkLayered`, `GraphConfigurator`, `InteractiveLayeredGraphVisitor`, `DebugUtil`, `DotDebugUtil`, `JsonDebugUtil` (~3,100 lines) move to 7f. 7a ports `LayeredLayoutProvider`, `LayeredPhases` and `IHierarchyAwareLayoutProcessor` fully; `ElkLayered` is staged (the members the provider calls throw until 7f) |
| L3  | **Oracle.** One recorder, `tools/vectors/LayeredFrameworkVectors.java` → `test/golden/refs/java/layered-framework.json`, with groups `transform` (import → LGraph dump with every property; transferrer back → ELK JSON), `adapters` (`NodeDimensionCalculation` over `LGraphAdapters`, sweep including port alignment and N/S port border offset) and `metadata` (service state with core + labels + layered registered). `metadata.json` is untouched |
| L4  | **Expectations.** Numeric and algorithmic expectations come only from oracle rows. Java constants, enum constants, option ids and defaults may be read from the Java. Replay-alone coverage is measured per 7a class before unit tests (T9); each unreached branch gets a targeted site row (T10) and an anchored test (T11). A hand-derived numeric expectation is a stop |
| L5  | **Registration.** Layered registers explicitly: `LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider())`. `getInstance()` keeps registering core and labels only (C8) |
| L6  | `TestGraphCreator` (1,217 lines) ports in 7b with its first consumers |
| L7  | `npm run melk:generate Layered` (P3 precedent) emits `src/alg/layered/options/{LayeredOptions,LayeredMetaDataProvider}.ts`. `DEFAULT_BUNDLES` is unchanged. `LayeredLayoutProvider` sits in `PENDING_TYPES` from T3 until T7 ports it (C1); `PENDING_TYPES` is empty at mission end |

## Scope decisions (planning, 2026-10-27)

| ID  | Decision |
| --- | -------- |
| S1  | Full-layout follow-ups go to 7f, the first sub-mission with a running pipeline: the 3 label-placement JUnit files (`InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest`), `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId`, `LayeredSpacingTest.AfterLayoutTest`, and an end-to-end alignment/border-offset sweep. 7a's `adapters` group covers alignment and border offsets at the adapter level |
| S2  | The `TreeSet` stand-in promotion goes to 7c (first consumer `CrossingsCounter`); no 7a class uses a `TreeSet` |
| S3  | `IntermediateProcessorStrategy` goes to 7b: after L2 no 7a class uses it, and its first consumers are the 7b phases' processor configurations |
| S4  | **melk generator edits** that `Layered.melk` needs are push-forward, provided `npm run melk:generate Core Labels Polyomino` leaves its six committed files byte-identical; otherwise stop 1 (user, Phase 6) |

## Baseline

Recorded at planning (Phase 8) on `main` at `1458f8b`; see the baseline row in [decision-journal.md](decision-journal.md).
Stop 12 compares a later run at similar load.

## Execution decisions (user, during the run; append-only)

| ID  | Date | Decision |
| --- | ---- | -------- |
| X1  | 2026-10-27 | **Origin identifier section file** (T3 stop 7 + 1). T3 adds `src/alg/layered/graph/transform/ElkGraphTransformerUtility.ts` (+ test): the "Utility" section of `ElkGraphTransformer.java:52-80` (`getOriginIdentifier`, private recursive `getIdentifier`) fully ported as module functions; `LGraphElement` imports it. T6's `ElkGraphTransformer` keeps a static `getOriginIdentifier` delegating to it (P1: sections never import the facade). No staged entry; breaks the `LGraphElement → ElkGraphTransformer → ElkGraphImporter → LGraph` TDZ cycle. T3's write-set gains the file and its test |
| X2  | 2026-10-27 | **Exception registration** (T3 stop 1). T3's write-set gains the import and the `[UnspecifiedSpacingException, RuntimeException]` row in `test/architecture/exception-hierarchy.fitness.test.ts` for `options/SpacingsUnspecifiedSpacingException.ts` (the bundle's only exception class) |
| X3  | 2026-10-27 | **Pending provider tripwire and held-back algorithm classes** (T3 stop 4). M9 tripwire precedent: T3 edits `test/melk/model-algorithms.test.ts`'s `PENDING_TYPES` assertion to `['org.eclipse.elk.alg.layered.LayeredLayoutProvider']` (test title updated to say so); T7 restores `[]`. Under S4 the emitter also emits a held-back algorithm's class: option constants kept, factory class and its static omitted, `apply()` body replaced by the held-back comments; new emit tests pin it; `melk:generate Core Labels Polyomino` stays byte-identical. T3's write-set gains `test/melk/model-algorithms.test.ts` (that assertion only) and `test/melk/emit.test.ts` (new cases only) |
| X4  | 2026-10-27 | **Layered adapters vectors** (T9 stop 4). The T1 recorder moves each LGraph's layerless nodes into one new `Layer` (`new Layer(g)`, `g.getLayers().add(layer)`, `node.setLayer(layer)` over a copy of the layerless list, in order) before the two sizing sequences, so `LGraphAdapter.getNodes()` sees them. `layered-framework.json` is re-recorded (journaled with this id); `transform` and `metadata` rows must stay byte-identical. T8's replay performs the same step. Lands as `fix(T1)` and `fix(T8)` commits |
| X5  | 2026-10-27 | **Literal L4 reading** (T9 stop 3/11). Every unreached branch, the 300 structural (J) branches included, gets an oracle site row and an anchored test. This exceeds stop 11's ~15-scenario cap (15 numeric scenarios + 6–7 structural groups, `unreached.md` § Re-planning input), so T10/T11 are re-planned before they run. The mission halts after T9 |
| X6  | 2026-10-28 | **Re-planned batches 7 and 8** (stop 11 after X5). Stop 11's "about 15 scenarios" becomes "the 22 groups S1–S22 of `unreached.md`" (a 23rd group is a stop; rows per group are free within L3's 5 MB). T10 records every group through one step interpreter ([batch-7/T10-site-recorder-x5.md](batch-7/T10-site-recorder-x5.md)); T11 becomes T11a (generic replay) + T11b/T11c/T11d (anchored tests) in parallel ([batch-8/overview.md](batch-8/overview.md)). No oracle row for the 4 U branches, the 31 X factory arms, the TS-only null/primitive guards of `isHierarchyAwareLayoutProcessor`, and the provider's `isCanceled` arm (reachable only after 7f): journaled, not anchored. Provider rows keep the oracle's full layout output for 7f to replay; 7a asserts the staged throw. Landing commit 4 lists T11a–T11d |
| X7  | 2026-10-28 | **Port-side view bounds** (T11 stop 4). `LNode.getPortSideView`'s proxy throws `IndexOutOfBoundsException` with the JDK message for any index outside the view on read or write, as `ArrayList.SubList.get/set` do (oracle row `site/lnode/portSideView`); a JS `push` is an index write at index = size and throws the same; `UnsupportedOperationException` stays for non-index writes. The two T3 cases in `LNode.test.ts` that encoded the TS-array behaviour (`view[2]` undefined; `push`/`view[5] =` as structural modification) are re-anchored to the row (6c D4: wrong original value, valid premise), comments citing `LNode.java:298` and the row id; nothing else in the file changes. Lands as `fix(T3)` |

