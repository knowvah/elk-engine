<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: graphviz-dot (planned 2026-11-24, unattended)

These decisions add to AD-1 to AD-17 (`plans/elk-engine-skeleton/decisions.md`) and do not rewrite them. They also follow the
graph-text decisions G1, G5 and G6 (`plans/graph-text/decisions.md`) and conformance-corpus D8 (known divergence #1). Every
decision below was auto-confirmed by an unattended planning run. The record is at the end.

| ID | Decision |
| -- | -------- |
| D0 | Scope is #95 step 2: the whole `alg.graphviz.dot` bundle. Steps 3-5 and the end-to-end suite stay out. Step 4 is #177 (`needs-ruling`) |
| D1 | Port map: every Java file is ported or omitted. The omissions are the Eclipse, Guice and generated-parser glue |
| D2 | Writer = graph-text G1: grammar-specific semantic and syntactic sequencers, `GraphvizDotFormatter` line by line, `GraphvizDotSerializer` |
| D3 | `src/xtext/formatting2` gains Xtext's autowrap, the subset `GraphvizDotFormatter` reaches. The `.elkt` writer refs stay byte-identical |
| D4 | Hand-written lexer and parser (G6). Syntax errors match by presence and line; value-conversion results match exactly |
| D5 | Internal entry point `GraphvizDot` (`load`, `serialize`) stands in for `DotResourceSetProvider` and `XtextResource`. Not exported |
| D6 | Evidence: six JVM recorders written before code; refs `graphviz-dot-*.json`; a local export sweep over elk-models |
| D7 | New recorders do not call `elkCommit()` while #173 is open (the `last-ulp` precedent) |
| D8 | `tools/oracle/build.sh` records the `alg.graphviz.dot` jar (`--record-only`). No patch, no `ELK_COMMIT` change |
| D9 | `XTEXT_CLIENT_BUNDLES` gains `src/alg/graphviz/dot`, from its `MANIFEST.MF` `Require-Bundle` |
| D10 | Java hazards: `StringTokenizer` shim (Javadoc plus vectors), `Double`/`Float` text through existing shims, AD-10 per map site |
| D11 | T13 files the remainder of #95 as a `follow-up` issue. Labels on #95 are the driver's |

## D0: source and scope

**Source:** issue #95 (`queue:ready`), the lowest-numbered ready issue. Its only "Blocked by" is the cross-repo
knowvah/dot-engine#220 (open). The issue body scopes that block to step 5 and the end-to-end suite: "Steps 1-4 and the exact
conformance do not need it." Step 1 is on `chore/issue-queue` (mission `deferred-bundles-acceptance`, #88; maintainer comment
of 2026-11-24 on #95).

**Decision:** this mission ports `alg.graphviz.dot` whole (#95 step 2), with its exact conformance (parser and serializer
against JVM vectors, the exporter's DOT text against the oracle's).

- **Step 4** (how the runner is injected) is reserved for the maintainer: "Plan it with the maintainer" (#95), and "How the
  runner is injected is new API, to settle with the maintainer under #95" (AD-17 point 2). The planning run filed it as **#177**
  (`needs-ruling`).
- **Step 3** (`alg.graphviz.layouter`) stays out. `GraphvizLayoutProvider` cannot be ported without the runner seam.
  `Graphviz.melk` names that provider as the factory of all five algorithms, so its generated metadata cannot land without it
  either. `LayoutDotExporter` alone would have no caller and no oracle path other than through the provider.
- **Step 5** and the end-to-end suite are blocked by knowvah/dot-engine#220.

Rejected: (a) the whole of #95 now: step 4 has no ruling, and step 5 is blocked. (b) Step 2 plus the runner-independent part of
step 3 (`LayoutDotExporter`, `GraphvizException`): this splits one bundle over two missions with no oracle path in this one,
and it makes a mission already sized like graph-text larger. (c) Parking #95: a question about part of the work is not a
reason to park (plan-mission, unattended mode).

## D1: port map

The `src/` → TS mapping follows AD-7: `org.eclipse.elk.alg.graphviz.dot.X` → `src/alg/graphviz/dot/X.ts`, one class per file.
No file goes directly into `src/alg/graphviz/` (the fitness test `leaves src/alg/graphviz itself unmapped` fails it).

| Java (bundle `org.eclipse.elk.alg.graphviz.dot`) | TS | Task |
| ------------------------------------------------ | -- | ---- |
| `src-gen/.../dot/*.java` (14 interfaces) and `dot/impl/*Impl.java` | `dot/<Name>.ts`: plain classes with Java accessor names (AD-11), lists as arrays, EMF defaults (null, false, the first enum literal) | T4 |
| `dot/EdgeOperator`, `GraphType`, `AttributeType` (EMF enums with `getLiteral`, `getName`, `getValue`, `get(String)`) | `dot/<Name>.ts` | T4 |
| `dot/DotFactory`, `dot/impl/DotFactoryImpl` | `dot/DotFactory.ts` (`eINSTANCE.createX()`) | T4 |
| `dot/util/DotSwitch` (used by `DotImporter`) | `dot/util/DotSwitch.ts` | T4 |
| `dot/DotPackage` | `dot/DotPackage.ts`: only the `Literals` feature constants the formatter and sequencers use (`GRAPH__TYPE`, `EDGE_TARGET__OPERATOR`, and others they need) as `FeatureRef`s | T4 |
| `dot/util/DotAdapterFactory` | omitted: no caller in `src/` of either bundle | — |
| `GraphvizDot.xtext`, `src-gen/.../parser/antlr/**` | `parser/GraphvizDotLexer.ts`, `parser/GraphvizDotParser.ts` (hand-written, D4) | T7 |
| `services/GraphvizDotGrammarAccess` | `services/GraphvizDotGrammarAccess.ts`: only the elements the formatter and sequencers name | T8 |
| `serializer/GraphvizDotSemanticSequencer` + generated abstract | `serializer/GraphvizDotSemanticSequencer.ts` | T8 |
| `serializer/GraphvizDotSyntacticSequencer` + generated abstract | `serializer/GraphvizDotSyntacticSequencer.ts` | T8 |
| `serializer/GraphvizDotSerializer` | `serializer/GraphvizDotSerializer.ts` (`MAX_LINE_LENGTH = 255`) | T8 |
| `formatting2/GraphvizDotFormatter.xtend` | `formatting2/GraphvizDotFormatter.ts` (line by line; `xtend-gen` settles semantics) | T8 |
| `transform/DotResourceSetProvider` | `GraphvizDot.ts` (D5) | T9 |
| `transform/DotExporter`, `Attributes`, `Command`, `NeatoModel`, `OverlapMode`, `IDotTransformationData`, `DotTransformationData` | `transform/<Name>.ts` | T10 |
| `transform/DotImporter` | `transform/DotImporter.ts` | T11 |
| `GraphvizDotActivator`, `GraphvizDotExecutableExtensionFactory`, `GraphvizDotStandaloneSetup`(`Generated`), `GraphvizDotRuntimeModule`, `AbstractGraphvizDotRuntimeModule`, `GenerateGraphvizDot.mwe2`, `GraphvizDot.properties`, `GraphvizDot.xtextbin`, `model/generated/*` | omitted: OSGi activation, Guice wiring and the generator. The `GraphvizDotRuntimeModule` binding (`ISerializer` → `GraphvizDotSerializer`) becomes plain construction in `GraphvizDot.ts`, as `ElkGraphSerializer.ts` does | — |

Each omission is journaled once (T13), with the `@see` comment at the replacing site where one exists.

## D2: writer architecture

**Facts:** `GraphvizDotRuntimeModule` binds only `ISerializer` to `GraphvizDotSerializer`. That class overrides
`serialize(obj, appendable, options)`: `serializeToRegions(obj)`, a `FormatterRequest` with `maxLineWidth = 255` and
`formatUndefinedHiddenRegionsOnly = !options.isFormatting()`, then `GraphvizDotFormatter`, then
`regionAccess.getRewriter().renderToAppendable`. `GraphvizDotSemanticSequencer` adds nothing to its generated parent.
`GraphvizDotSyntacticSequencer` overrides five ambiguity emitters: the optional `,` in three attribute lists, the optional
`;` after a statement, and the optional `subgraph` keyword. Each emits the keyword.

**Decision:** as G1 for `.elkt`. Write one semantic-sequencer method per grammar rule, emitting in the order fixed by the
generated sequencer's constraint comments (`src-gen/.../serializer/AbstractGraphvizDotSemanticSequencer.java`). Port the five
emitter overrides as written. Port `GraphvizDotFormatter` line by line on the `src/xtext/formatting2` subset (plus D3) and
`GraphvizDotSerializer` as the composition. Reuse `src/xtext` region access, the rewriter and the value converters. Do not port
Xtext's generic backtracking serializer.

**Oracle contract:** the reference for a model is the JVM `ISerializer.serialize(model, SaveOptions)` in a fresh
`XtextResource`, both formatted and unformatted (G2). The layouter's own call (`resource.save` with default options,
`GraphvizLayoutProvider.java:212-222`) is the unformatted form; record both.

Rejected: porting Xtext's generic serializer (about 9.2k lines; G1's evidence holds unchanged).

## D3: Xtext autowrap

**Facts:** `GraphvizDotFormatter.format(GraphvizModel)` walks every hidden region and calls `document.set(region,
[autowrap])`, and the serializer sets `maxLineWidth` to 255. `src/xtext/formatting2` was ported for `ElkGraphFormatter`, which
never autowraps, so the autowrap members are left out on purpose. The comments in `IHiddenRegionFormatter.ts`,
`IHiddenRegionFormatting.ts`, `ITextReplacerContext.ts`, `internal/TextReplacerContext.ts`, `internal/FormattableDocument.ts`,
`internal/WhitespaceReplacer.ts`, `internal/HiddenRegionFormatting.ts` and `internal/TextSegmentSet.ts` name what is missing.
`DotExporter` writes long quoted values (`pos`, label strings), so lines over 255 characters are reachable.

**Decision:** port the autowrap path from Xtext 2.36's EPL source into those files: the `autowrap()` command and the
formatting's autowrap properties, their merge, the context's autowrap state and line-length queries, the
`FormattableDocument.createReplacements` wrap bookkeeping, and the `WhitespaceReplacer` autowrap arm. Port only what
`GraphvizDotFormatter` reaches: `autowrap()` with no arguments, with no `IAutowrapFormatter` and no `onAutowrap` unless the
Xtext path calls them unconditionally. Update each file's "not ported" comment. Regression proof: the `.elkt` writer refs and
the elkt vectors are byte-identical after the change.

Rejected: (a) wrapping lines inside the DOT package. It duplicates Xtext logic outside `src/xtext`, so it would not be a port.
(b) Skipping autowrap. Any line over 255 characters would then differ from the oracle. (c) Porting all of Xtext's
`formatting2` autowrap (the `IAutowrapFormatter` hooks): YAGNI, no caller.

## D4: lexer, parser and diagnostics

As G6: the hand-written `GraphvizDotLexer` reproduces the token decisions of the generated `InternalGraphvizDotLexer`. That
covers keywords against `RULE_ID`, which are case sensitive in the generated lexer; check it against the vectors. It also
covers `RULE_INT` against `RULE_FLOAT` (the leading `-`, `.5`), `RULE_STRING` with `\"`, the hidden `WS`, `ML_COMMENT`,
`SL_COMMENT` and `PREC_LINE` (`#` lines), and `RULE_ANY_OTHER`. The parser is recursive descent, one method per rule. The
generated parser and lexer are the edge-case spec and are never ported line by line (conformance-corpus D8).

What the model holds is set by the value converters bound for the grammar (Xtext `Terminals` defaults plus the `DotID`
datatype rule). The T2 parse vectors decide each converter. A `STRING` value inside `DotID` versus a `STRING` terminal, and
`ID` with `^`, are the cases to check first.

Diagnostics: syntax errors match by **presence and line** (D8 known divergence #1, as G5). Value-conversion diagnostics match
exactly. There is no linking and no validator in this grammar. Journal for step 3: `GraphvizLayoutProvider.readDotGraph`
embeds `diagnostic.getLine()` and `getMessage()` in its `GraphvizException` text, so step 3 has to decide how that message
conforms.

## D5: entry point

`src/alg/graphviz/dot/GraphvizDot.ts`, internal (AD-14, the frozen public API), mirroring what `DotResourceSetProvider` and an
`XtextResource` give `GraphvizLayoutProvider` and the recorders:

```ts
load(text: string): { model: GraphvizModel | null; errors: readonly DotDiagnostic[] } // never throws on bad input
serialize(model: GraphvizModel, options?: { format: boolean }): string               // throws like ISerializer
```

`DotDiagnostic = { kind: 'syntax' | 'conversion'; message: string; line: number }`. `docs/architecture/graphviz-dot.md`
documents it as a port-local entry point, like `ElkGraphText` (`docs/architecture/elk-text.md`). Step 3 will consume it.

## D6: evidence

Recorders are written and run **before** the code they prove (AD-13). One script, `tools/vectors/dot-vectors.sh`, runs every
`tools/vectors/Dot*Vectors.java` (sorted) on the oracle jars plus the Xtext standalone classpath. Its shape is
`tools/vectors/elkt-vectors.sh`: the same `THIRD_PARTY` list, `vector-cache.sh`, and `DOT_VECTORS_LIST=1`. Each program
writes one ref:

| Program | Ref (`test/golden/refs/java/`) | Proves |
| ------- | ------------------------------ | ------ |
| `DotJdkVectors` | `graphviz-dot-jdk.json` | `StringTokenizer` with the delimiters the transforms use (`"\", \t\n\r"`, `"\";"`, `" \t"`, and others found), plus any `Double`/`Float` parse or print shape not already proven by existing refs (D10) |
| `DotLexerVectors` | `graphviz-dot-lexer.json` | token type and text of every case in `dot-lexer-cases.txt` |
| `DotParseVectors` | `graphviz-dot-parse.json` | model dump (every feature, null against unset) and diagnostics (presence and line for syntax) of every `dot-parse-scenarios/` file and every `dot-graphviz-output/` fixture |
| `DotWriteVectors` | `graphviz-dot-write.json` | `serialize` formatted and unformatted of every parsed scenario, plus built models that need autowrap (lines over 255 characters) |
| `DotExportVectors` | `graphviz-dot-export.json` | `DotExporter.transform` over `dot-export-scenarios/*.elkt` under each property set in use, serialized as unformatted text, plus the source graph after transform (`resizeNode` side effects); `transferLayout` fed fixture output, as an ElkGraph dump |
| `DotImportVectors` | `graphviz-dot-import.json` | `DotImporter.transform` of DOT scenarios (an ElkGraph dump with properties) and `transferLayout` |

**Inputs.** Hand-written DOT scenarios. Real Graphviz output fixtures (`dot-graphviz-output/`): T2 runs the local Graphviz
once (16.1.2 at planning; record `dot -V` in a fixture README) as `dot -q -y -K<alg>` over the exporter's text for a few
scenarios and commits the output. The fixtures are **inputs**: the JVM records what ELK does with them, so the Graphviz version
does not enter any comparison. No elk-models file is DOT.

**Local sweep** (`tools/oracle/dot-export-sweep.sh`, T3; run in T12): for every elk-models `.elkt`, the oracle's exporter text
(unformatted) and the parse-back. The TS side compares byte-exact text and model equality. Per-model verdicts go under
`$ELK_ORACLE_DIR/sweep/dot-export/` (AD-5), and the counts go in the journal and `docs/conformance.md`. The sweep is not run
in CI.

## D7: no pin stamp in new recorders

`test/architecture/elk-pin.fitness.test.ts:44` freezes `EXPECTED_STAMPING_RECORDERS = 41`. #173 (`needs-ruling`) asks whether
that count may rise. Until it is ruled, the six new programs do not call `elkCommit()`. Their refs carry no `oracle` field.
`dot-vectors.sh` refuses to run unless `oracle-build.json` names `tools/oracle/ELK_COMMIT`, and starts programs through
`vc_run` (it passes `-Delk.commit=`). This is the precedent of `LastUlpVectors.java`. Each header comment names #173. T13
comments on #173 with the six programs.

## D8: oracle jar

`tools/oracle/build.sh` `BUNDLES` lacks `alg.graphviz.dot`. The jar exists in the oracle worktree from the 2026-11-21 reactor
build (`plugins/org.eclipse.elk.alg.graphviz.dot/target/org.eclipse.elk.alg.graphviz.dot-0.13.0-SNAPSHOT.jar`). T1 adds the
bundle to `BUNDLES` and runs `build.sh --record-only`. That rewrites `oracle-build.json` with the extra jar and the same commit
and patches. Before trusting the jar, T1 checks that its mtime is within the same build as the others. If it is not, T1 runs a
full `build.sh` (stop 9). No oracle patch is needed. `alg.graphviz.layouter` is not added (step 3).

## D9: Xtext client fitness

`module-boundaries.fitness.test.ts` limits imports of `src/xtext` to `XTEXT_CLIENT_BUNDLES` (`src/graph/text`,
`src/graph/json/text`, `src/core/debug/grandom`), derived from each bundle's `Require-Bundle`. `alg.graphviz.dot` requires
`org.eclipse.xtext` and `org.eclipse.xtext.util` (`MANIFEST.MF` `Require-Bundle`). T1 adds `src/alg/graphviz/dot` with a
comment citing the manifest, and adds one test that a file in `src/alg/graphviz/layouter` may still not import `src/xtext`
(the layouter's manifest has no Xtext require). No existing expected value changes. If any existing assertion has to change,
that is stop 8.

## D10: Java hazards

- `java.util.StringTokenizer` (`DotExporter`, `DotImporter`): a new shim, `src/java/util/StringTokenizer.ts`, written from the
  Javadoc only (AD-9) and proven by `graphviz-dot-jdk.json`. Port only the members the transforms call.
- `Double.toString`, `Double.parseDouble`, `Float.parseFloat`, `Float.valueOf`, `Integer.toString` and the `float` constant `DPI`
  (`72.0f`) widened to double: use the existing shims (`src/java/lang/DoubleToString.ts`, `JavaDouble.ts`, `Float32.ts`). Add
  vectors only for input shapes the existing refs do not cover.
- Maps: `HashBiMap` (`src/guava/HashBiMap.ts`) for `GRAPH_ELEMS`. The `HashMap` of `getAttributes` and the `Maps.newHashMap`
  maps of `DotImporter` (one keyed by `Pair<ElkNode, String>`) follow AD-10 per site. Journal for each whether iteration
  order is observable.
- `ElkUtil.resizeNode`, `toAbsolute`, `toRelative` and `createVectorChain` are already ported (`src/core/util/ElkUtilSizing.ts:225-233`, `ElkUtilCoordinates.ts:153, 170, 210`; imported through
  `ElkUtil.ts`).

## D11: the remainder of #95

T13 files one `follow-up` issue: "graphviz: port alg.graphviz.layouter (#95 step 3) and the end-to-end suite". Its body has
the scope left (step 3, `Graphviz.melk` in `sync-sources.sh` and the manifest, the end-to-end suite and the Graphviz pin), what
this mission landed for it (`GraphvizDot`, the D4 note on error text), and `Blocked by #177` and
knowvah/dot-engine#220 for step 5. T13 comments on #95 with the brief path and the new issue. The driver handles the labels on
#95.

## Operational readiness (Phase 4)

- **Observability:** N/A. This is a library port with no runtime service, metrics or traces. The evidence is the JVM refs and
  the sweep counts in `docs/conformance.md`.
- **Rollback:** Reversible. The code is new and internal (`src/alg/graphviz/dot/`), and nothing imports it outside its tests.
  The autowrap extension in `src/xtext` is the only change to existing code, and the `.elkt` refs guard it. Reverting the
  squashed commit restores the base.
- **Scalability:** the export sweep over 898 models is the heaviest run, and it is local and detached. The CI suite grows by
  the six refs (keep each under about 2 MB, as earlier refs do).
- **On-call story:** N/A (no deployment). The failure modes for later missions: an Xtext autowrap regression, which the `.elkt`
  refs catch; a ref the oracle cannot reproduce on a new pin, which `elk-upgrade.md` triage covers.
- **Backwards compatibility:** no API, schema or option change. `src/index.ts` and the 72-export surface are unchanged.

## Auto-confirmed (unattended)

The unattended plan-mission run of 2026-11-24 took each recommendation above with no user present. Evidence for each is cited
inline.

| Decision | Taken | Rejected | Evidence |
| -------- | ----- | -------- | -------- |
| Issue selection | #95 | skip #95 as blocked | #95's only "Blocked by" is the cross-repo dot-engine#220, which the body scopes to step 5 and the end-to-end suite |
| D0 scope | step 2 only | all of #95; step 2 plus part of step 3; park | step 4 is reserved for the maintainer (#95 text, AD-17 point 2); `Graphviz.melk` names `GraphvizLayoutProvider` for every algorithm |
| D2 writer | G1 sequencers | Xtext's generic serializer | the bundle overrides only the serializer and five emitters; G1's sizing |
| D3 autowrap | port the reached subset into `src/xtext` | local wrapping; skip; full port | `GraphvizDotFormatter.xtend:38-43`, `GraphvizDotSerializer.java` (`MAX_LINE_LENGTH = 255`); the "not ported" comments in `src/xtext/formatting2` |
| D5 entry point | internal `GraphvizDot` | export it | AD-14; `docs/architecture/public-api.md` (frozen at 1.0.0) |
| D7 stamp | no `elkCommit()` | raise 41 → 47 | #173 is open; `last-ulp` precedent |
| D8 jar | `--record-only` | full rebuild | the jar is present from the 2026-11-21 reactor build; `build.sh:4-6` |
