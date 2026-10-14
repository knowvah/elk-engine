<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — `ElkGraphText.load` and runtime wiring

**Agent:** typescript-pro · **Commit:** `feat(T18): add elkgraphtext load with xtext-ordered diagnostics`

## Context
`load(text)` is the port of "read an `.elkt` through `ElkGraphStandaloneSetup` + `ResourceSetImpl`"
(`tools/oracle/harness/ElkModelReader.java`): parse, link, collect `resource.getErrors()`, never validate.
Consumers: T20/T22 (`validate`, `serialize` are added to this file by T22), the T22 round trip, the T23
sweep, mission 5+ text input. Evidence: T3 vectors and the curated oracle refs.

## Task
1. `src/graph/text/ElkGraphText.ts`, G4 shape (`load` only in this task):
   `load(text: string): { root: ElkNode | null; errors: readonly ElkTextDiagnostic[] }`; never throws on
   bad input. Export the two types as `ElkTextDiagnostic = { kind: 'syntax'|'linking'|'conversion'; severity; message; line }`
   and `ElkTextIssue` (declared now for T20/T22; T18 does not produce issues). Not exported from
   `src/index.ts` (AD-14).
2. Wiring as plain construction, no DI framework: mirror `ElkGraphRuntimeModule.xtend:27-49`
   (binds `ElkGraphValueConverterService` `:30-32`, `ElkGraphQualifiedNameProvider` `:34-36`,
   `ElkGraphQualifiedNameConverter` `:38-40`, `ElkGraphTransientValueService` `:42-44` — T19's, not
   constructed by `load`, `ElkGraphLinker` `:46-48`) and `ElkGraphStandaloneSetup.xtend:22-26`
   (`doSetup` = injector + EMF registration; here: construct the services once per `load` call, or a
   module-level factory function `createServices()`; no module-level mutable `let`, AD-8). The generated
   chain `AbstractElkGraphRuntimeModule.java` (src-gen) lists the remaining defaults (parser, lexer,
   linking service, scope provider -> `ElkGraphScopeProvider`, global scope provider, cache): read it so
   no binding is missed, port only the ones the subset needs, note each skipped binding in a comment.
3. Pipeline: `tokenize` (T9) -> parser (T15) -> value conversion (T13, conversion diagnostics) -> link
   (T16 `Linker` + T17 services) -> collect diagnostics. **Order of `errors`** = Xtext's
   `resource.getErrors()`: derive it from the Xtext source (`XtextResource`/`LazyLinkingResource`
   `doLoad`, `updateInternalState`, `doLinking`: scratchpad `xtext-src/org/eclipse/xtext/resource/XtextResource.java`,
   `linking/lazy/LazyLinkingResource.java:111-130`, `linking/impl/Linker.java`) and confirm against the
   multi-error T3 rows (a row with both conversion and linking errors); the first entry is what the
   oracle's `ElkTextException` carries. Record the confirmed order in a comment. If syntax errors exist,
   `root` is whatever Xtext's partial parse tree gives only when a T3 row shows it; otherwise `null`
   (presence only, D8/G5).
4. Line numbers: `line` is 1-based, from the offending node/token (T15 `positions`); match T3 per kind.
   Messages: the converter/linking text from T13/T16 verbatim.
5. Tests (first): (a) every T3 row: error kinds/severities/messages/lines exact for linking and
   conversion, syntax rows presence-only (an error of kind `syntax` exists; no message compare);
   `values` rows compare resolved property values through the T3 canonical tree; (b) every curated ref
   `test/golden/refs/elkt-parse/*.json` (list `test/corpus/elkt-curated.json`): `load` the model from
   `$ELK_MODELS_DIR` (skip with a message when absent, pattern `test/corpus/corpus.ts` `resolveModelsDir`)
   and compare `exportLikeOracle(root)` (`test/helpers/graph-json-oracle.ts`, same settings as
   `CaseRunner.export`, `CaseRunner.java:71-78`) with the ref through `compareLayout`
   (`test/golden/compare-json.ts`) at 1e-6 — as `test/golden/json-roundtrip.test.ts` does for JSON;
   the curated set must run in CI without elk-models if T1 committed the inputs, else gate like
   `json-roundtrip.test.ts` (read how it obtains inputs: `refs/elk-parse/_meta.json`); (c) a timing
   test: the largest model (`realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`, 253 KB)
   loads in < 1 s (local-only, gated on the models dir; assert `< 1000` ms measured around `load`).

## Write-set
`src/graph/text/ElkGraphText.ts` (colocated `ElkGraphText.test.ts` implicit); if a curated-ref helper
is needed and absent, add `test/helpers/elkt-oracle.ts` (declared here so the write-set check passes).

## Read-set
- `ElkGraphRuntimeModule.xtend:27-49`, `ElkGraphStandaloneSetup.xtend:22-26`, `src-gen/.../AbstractElkGraphRuntimeModule.java`
  (graph.text `src/` and `src-gen/org/eclipse/elk/graph/text/`)
- `tools/oracle/harness/{ElkModelReader,CaseRunner}.java` (`CaseRunner.java:44-78`)
- Xtext: `linking/lazy/LazyLinkingResource.java:111-130,230-240,395-420`, `linking/impl/Linker.java`, `resource/XtextResource.java`
- `src/graph/text/{parser,conversion,naming,scoping,linking}/**`, `src/xtext/{linking,scoping}/**`
- `test/helpers/{graph-json-oracle,graph-json-canon}.ts`, `test/golden/{compare-json,json-roundtrip.test}.ts`, `test/corpus/corpus.ts`
- `test/golden/refs/java/graph-text-parse.json`, `test/golden/refs/elkt-parse/{_meta.json,*.json}`, `test/corpus/elkt-curated.json`

## Decisions
- [G3](../decisions.md#g3--option-registry-for-refs) refs use the CoreOptions-only registry (`LayoutMetaDataService.getInstance()` in TS).
- [G4](../decisions.md#g4--entry-point) shape; [G5](../decisions.md#g5--diagnostic-fidelity) fidelity;
  D8 (presence only for syntax); D3 later in T22; AD-14 not exported.

## Interface contract
Produces `load` per G4 for T20 (loading scenarios), T22 (adds `validate`/`serialize`, round trip), T23.
Consumes T15 `{root, syntaxErrors, references, positions}`, T13 converters, T16 `Linker`, T17 services.

## Acceptance criteria
- Given each T3 row, when `load` runs, then diagnostics equal the vector (kind, severity, message, line; syntax presence-only) in Xtext's order.
- Given each curated model, when loaded and exported with the oracle settings, then the JSON equals the ref within 1e-6 and structure exactly.
- Given the 253 KB model, then parse + link finishes in under 1 s; given invalid input, then `load` returns errors and does not throw.

## Quality bar
README gates; TDD from T3 and the refs; `npm run complexity` clean; no module-level mutable state; browser-safe (`src/` has no Node built-ins, no `process.env`).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not run validation in `load` (the Java does not). No edits to T13–T17 files, refs or vectors; a test that
can only pass by changing an expectation is STOP 4. No OpenJDK/Guava/ANTLR-runtime source. Do not commit.
