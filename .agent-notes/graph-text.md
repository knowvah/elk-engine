<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — graph-text (mission 4b)

## Observation: the elk-models `.elkt` corpus lacks several grammar features

- **Context**: T1 scan of all 898 `.elkt` to pick curated refs
- **Finding**: no single-quoted strings (the "53" are apostrophes in comments/strings), no
  multi-source/target edges, no `incoming`/`outgoing` section keys, no `section a -> b`, no
  single-section `layout [start …]` form, no `null` values, no exponent floats. String escapes (`\'`)
  occur in 3 models. All 6 edge-layout models use `section <id> [start/end/bends]`.
- **Impact**: these features are proven only by the JVM vectors (T2/T3), never by the sweep.
- **Confidence**: High

## Observation: the core registry changes 182 of 898 `.elkt` exports

- **Context**: T1, every model parsed in default and core mode
- **Finding**: all parse in both modes; 182 exports differ (layered/spline/interactive keys).
- **Impact**: the T23 sweep must run with `ORACLE_REGISTRY=core`.
- **Confidence**: High

## Observation: Xtext lexer errors emit a hidden `<invalid>` token

- **Context**: T2 lexer vectors
- **Finding**: Xtext's `Lexer.nextToken` catches `RecognitionException`, reports it, and returns a
  type-0 token on the HIDDEN channel covering the failed rule's text (`1.` → `<invalid>['1']` + `'.'`;
  `1e`, `1e+`, `"abc`, `/* x`, `// x\r` at EOF → one `<invalid>`). Lone `"`/`'`/`^` are
  `RULE_ANY_OTHER`. Bare digits are `RULE_SIGNED_INT`, never `RULE_INT`; `.5` = `'.'` + `SIGNED_INT`;
  `1-2` = `SIGNED_INT 1`, `SIGNED_INT -2`.
- **Impact**: T9's lexer reproduces these spans; `INT.toString` always fails its lexer re-check.
- **Confidence**: High

## Observation: converter facts recorded in T2

- **Context**: T2 converter rows
- **Finding**: `Number.toString` saturates via `intValue()` (`1e10`, `Infinity` → `2147483647`,
  `-0.0` → `0`); `Number.toValue` follows `Double.valueOf` leniency (`" 1"`, `1f`, `1d`, `0x1p3`, `NaN`
  accepted; `0x10` rejected). `PropertyKey.toValue("size")` → `font.size`; `padding`, `placement`,
  `spacing` are ambiguous suffixes → unknown `Property` + `LayoutOptionProxy`. `Strings.split` drops
  trailing empties only; `convertFromJavaString` throws `StringIndexOutOfBoundsException` on a trailing
  backslash; unknown converter rule names fall back to identity. JDK-originated messages are
  JDK-version text: compare the class only.
- **Impact**: T7/T8/T13 tests read these rows, not intuition.
- **Confidence**: High

## Observation: unresolved `.elkt` links leave no proxy; linking diagnostics follow containment order

- **Context**: T3 `err-link-*` and `scope-*` scenarios
- **Finding**: a failed reference is simply absent (`sources`/`targets`/`outgoingSections`) or null
  (`incomingShape`/`outgoingShape`); only the `XtextLinkingDiagnostic` remains. Diagnostics of a nested
  node's edges come before root-level edges (mechanism in `Linker` not traced). First duplicate sibling
  id wins silently; `graph g` makes `g` the root's name prefix and the root a valid endpoint; lookups
  are case-sensitive; `a . b` does not resolve.
- **Impact**: T14/T16/T17 drop failed references; T18 must keep the recorded diagnostic order.
- **Confidence**: High (order mechanism: Medium)

## Observation: duplicate property keys also raise an EMF map-key collision error

- **Context**: T4 `uniqueProperties-*`
- **Finding**: besides `Property is already assigned.`, `EObjectValidator` emits `The feature
'properties' has a map entry at index N with a key that collides with that of the map entry at index
M` (code `org.eclipse.emf.ecore.14`, holder's first line), twice per collision. The line-150 NPE of
  `ElkGraphValidator` is swallowed by `handleExceptionDuringValidation` (rest of the entry skipped).
- **Impact**: T11/T20 must reproduce the EMF diagnostic and the NPE swallowing.
- **Confidence**: High

## Observation: the generic serializer's unordered-group output depends on half-set state

- **Context**: T5 `shape-matrix`, `section-single-matrix`
- **Finding**: with `eIsSet` false for 0.0, `position: 0, 0 size: 0, 5` is written, `size` precedes
  `position` when position is `(0,5)` and size is set, and `end` precedes `start` analogously; a set
  position with `(0,0)` size omits size. Needs-quoting strings travel `quoteIfNecessary` unescaped.
- **Impact**: T19 reproduces the 16×16 tables; stop 8 if a grammar-specific rule cannot.
- **Confidence**: High

## Observation: `text=auto eol=lf` rewrites CRLF vector inputs

- **Context**: Batch 1 commit of `grammar-whitespace-variants.elkt`
- **Finding**: the repo's `.gitattributes` normalised the CRLF scenario to LF in the blob, so a fresh
  checkout would regenerate a different ref. Fixed with `tools/vectors/elkt-*-scenarios/*.elkt -text`.
- **Impact**: any new byte-meaningful fixture directory needs a `-text` rule before its first commit.
- **Confidence**: High

## Observation: Xtext lexer recovery boundaries

- **Context**: T9 differential fuzz (~300k inputs) of the TS lexer against `InternalElkGraphLexer`
- **Finding**: `match`/`matchRange`/set mismatches call `recover`, which consumes one char, so the
  `<invalid>` token includes it (`// x\ry` is one token). `EarlyExitException` does not consume
  (`1ex` → `<invalid>` `1e` + `ID` `x`). The FLOAT `dfa5` no-viable-alt on digits + `.` + non-digit
  consumes only the first digit (`10.` → `<invalid>` `1`, `<invalid>` `0`, `'.'`). The raw lexer leaves
  WS/comments on the default channel; the hidden set belongs to the token stream.
- **Impact**: T15 error spans and T13's converter re-lex checks see these exact boundaries.
- **Confidence**: High

## Observation: Java `^` binds looser than `<`

- **Context**: T7 `AbstractDeclarativeValueConverterService` lines 132-165
- **Finding**: `onlyExplicitConverters ^ ruleName.indexOf('.') < 0` is `only ^ (idx < 0)`: qualified
  rule names register before simple ones.
- **Impact**: read precedence, not prose, when a brief paraphrases a boolean expression.
- **Confidence**: High

## Observation: the ELK validator composite runs EMF constraints twice

- **Context**: T11 probe of `EValidator.Registry.INSTANCE` after `ElkGraphStandaloneSetup.doSetup()`
- **Finding**: delegates are `CompositeEValidator$1`, `EObjectValidator`, `ElkGraphValidator`;
  `EValidatorEqualitySupport` compares classes, so both EObjectValidators stay. Only
  `validate_EveryMapEntryUnique` can fire for ElkGraph. `CancelableDiagnostician` validates
  non-recursively (pre-order over `eAllContents`, each object once).
- **Impact**: T20/T22 build the composite through `EValidatorRegistrar`.
- **Confidence**: High

## Observation: both serializer outputs run the full formatter

- **Context**: T12 reading `Serializer.java:149-157` against T5 rows
- **Finding**: the unformatted request sets `formatUndefinedHiddenRegionsOnly`, but every hidden region
  of a string-built region access is undefined, so `ElkGraphFormatter` formats all of them;
  `unformatted == formatted` in the recorded non-error rows. With the default `LOGGING` handler a
  formatting conflict is swallowed (first formatting wins).
- **Impact**: T21/T22 tests should use a `THROWING` handler to prove there are no accidental conflicts.
- **Confidence**: High

## Observation: Xtext's ID escape set includes punctuation keywords

- **Context**: T13 replay of `ID.toString("->" | "{" | ".")`
- **Finding**: `IDValueConverter.valuesToEscape` is `GrammarUtil.getAllKeywords`, punctuation included;
  the escaped `^->` re-lexes to `^` as `ANY_OTHER`, giving "ID '->' contains invalid characters".
- **Impact**: ID converter tests must use the full `ELK_GRAPH_KEYWORDS` set.
- **Confidence**: High

## Observation: timing assertions fail under coverage instrumentation

- **Context**: T14 scope-lookup budget (149 ms plain, 577 ms under `npm run coverage`)
- **Finding**: V8 coverage slows tight loops 3–4×. `test/helpers/coverage-run.ts` (`isCoverageRun`)
  selects an instrumented budget; the plain-run budget stays as specified.
- **Impact**: every new performance test uses the helper from the start.
- **Confidence**: High

## Observation: Xtext reference text keeps one blank per hidden gap

- **Context**: T15 against `scope-qualifiedid-whitespace`
- **Finding**: `NodeModelUtils.getTokenText` joins non-hidden leaves with one `' '` where hidden tokens
  separated them, so the link text of `a . b` is `'a . b'` (no resolution); datatype-rule converters
  receive the plain concatenation `a.b`.
- **Impact**: linking and diagnostics use `ICrossReferenceNode.getText()` verbatim.
- **Confidence**: High

## Observation: Xtext linking clears opposite ends before linking each object (ELK #170)

- **Context**: T16 `Linker.ensureModelLinked`
- **Finding**: per object in pre-order, `clearReferences` runs before `ensureLinked`; the base
  `clearReference` unsets opposite ends too, erasing links set from earlier-visited objects. Diagnostics
  are emitted in object pre-order, then node source order — not line order.
- **Impact**: T17's override must skip the three opposite references; T18 keeps consumer order.
- **Confidence**: High

## Observation: the `.elkt` link pipeline wiring

- **Context**: T17 `ElkGraphLinker.test.ts` `link()`
- **Finding**: `ResourceScopeCache` → `ElkGraphQualifiedNameProvider(converter, cache)` →
  `ImportedNamespaceAwareLocalScopeProvider(SingleResourceGlobalScopeProvider, names, converter,
CaseInsensitivityHelper, cache)` → `ElkGraphScopeProvider(local)` → `DefaultLinkingService(scope,
LinkingHelper(services), converter)` → `ElkGraphLinker(service, LinkingDiagnosticMessageProvider, helper,
new ElkGraphReferences(), parseResult.nodeModel)`, then `linkModel(root, consumer)`. Tests that build
  ElkGraph objects without the parser must import `src/graph/impl/ElkGraphFactoryImpl.js` (side effect sets
  `ElkGraphFactory.eINSTANCE`).
- **Impact**: T18 assembles `ElkGraphText.load` from this chain.
- **Confidence**: High
