<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Parse and link JVM vectors (`graph-text-parse.json`)

**Agent:** java-architect · **Commit:** `test(T3): record elkt parse and link behaviour from the jvm`

## Context
The parser (T15), linker/scoping (T14, T16, T17) and `ElkGraphText.load` (T18) are verified against these
recordings (AD-13, G5, G7). They pin, per scenario, the Xtext diagnostics (syntax: presence only; linking and
value conversion: exact message, severity, line), the resulting ElkGraph including property key/value classes
and the opposite references the linker keeps (`incomingEdges`, `outgoingEdges`, `incomingSections`), and the
JSON export. Runs inside T2's `elkt-vectors.sh`; all under the CoreOptions-only registry (G3).

## Task
1. **Scenarios** under `tools/vectors/elkt-parse-scenarios/`: one `.elkt` per scenario, named
   `<family>-<what>.elkt`, ≤ 40 lines each, ~80–120 files. Every file is loaded exactly as the oracle does
   (`ElkModelReader.java:44-64`): `ElkGraphStandaloneSetup.doSetup()`, `ResourceSetImpl.getResource(fileURI, true)`.
   Families (cover each; write the family list in the Java header):
   - **Every grammar rule** (`ElkGraph.xtext:20-120`): `RootNode` with/without `graph <id>`, empty file,
     comment-only file; `ElkNode` with/without `{}` and nested; `ElkLabel` with/without `id :`, nested labels;
     `ElkPort` with/without body; `ElkEdge` with/without id, multiple sources/targets, with/without body, with
     `labels`; `ShapeLayout` (position only, size only, both, both orders `position`→`size` and `size`→`position`,
     a repeated element); `ElkSingleEdgeSection` with every subset of `incoming/outgoing/start/end` and ≥ 6 of
     the 24 orders (incl. the reverse), `bends` with 1 and many points, section properties; `ElkEdgeSection` with
     identifier, `-> a, b` outgoing sections, `[]` empty, all groups, any order; `Number` as `SIGNED_INT` and
     `FLOAT` (signs, exponents); `QualifiedId`; every `Property` value alternative (string, qualified id, signed
     int, float, `true`, `false`, `null`, single-quoted string, `^`-escaped id, keyword-like text).
   - **Scoping** (`ElkGraphScopeProvider.xtend:31-45`, `ElkGraphQualifiedNameProvider.xtend:25-42`, delegate
     `ImportedNamespaceAwareLocalScopeProvider` per `AbstractElkGraphRuntimeModule.java:171-173`): edge endpoint
     by short name from inside the owning node, by qualified name from outside, via ancestors, shadowing (same
     short name at two levels), node vs port of the same name, sibling nodes, deep `a.b.c`, ports of nested
     nodes, `^`-escaped segments, case sensitivity, a label id (not a `ElkConnectableShape`), forward references,
     duplicate sibling ids (which one wins), edge in a non-root container referencing outside. `outgoingSections`:
     references to sibling sections, to a section of another edge (error), self-reference, forward reference,
     unknown id, `section` ids duplicated across edges.
   - **Properties** (`PropertyKeyValueConverter.xtend:60-74`, `PropertyValueValueConverter.xtend:67-89`):
     fully qualified, suffix-only and ambiguous-suffix keys; unknown keys (`Property<Object>` with the verbatim
     string key) with each value kind; known keys with typed values (double, int, boolean, enum, string,
     `ElkPadding`, `EnumSet`, `KVector`) and unparseable values (stay `LayoutOptionProxy`); `null` values; keys
     with `^`; the same key twice; properties on node/port/label/edge/section/root.
   - **Errors, one scenario each:** every linking site (source, target, `incoming`, `outgoing`,
     `outgoingSections`; unresolved and wrong-type targets), every reachable value-converter error (find them:
     `ID`, `STRING`, `Number`, `PropertyKey` paths of T2's list; document converters with no reachable error in
     the header), and syntax errors (missing `}`, unknown keyword, property after a child, missing `:`, bad
     number, EOF in a string, `graph` without id, duplicated unordered element, stray token, each lexer
     `ANY_OTHER`).
2. **`tools/vectors/ElktParseVectors.java`** (self-contained, schema in the header, style of
   `GraphJsonVectors.java:1-40`). First statement `LayoutMetaDataService.getInstance(new ClassLoader(null) { })`.
   Per scenario record:
   - `diagnostics`: every entry of `resource.getErrors()` and `getWarnings()` in order as `{kind, severity, message,
     line, javaClass}`. `javaClass` = simple class name (`XtextSyntaxDiagnostic` / `XtextLinkingDiagnostic`
     / other). Mechanism to verify in the Xtext source before coding: value-converter failures are raised by
     `DefaultEcoreElementFactory.set/add` (`parser/DefaultEcoreElementFactory.java:64-84,104-131`) and reported by
     `AbstractInternalAntlrParser.handleValueConverterException` (`parser/antlr/AbstractInternalAntlrParser.java:487-500`),
     i.e. they surface as `XtextSyntaxDiagnostic`, **not** a distinct class. Derive `kind` as: `linking` for
     `XtextLinkingDiagnostic`; `conversion` for a syntax diagnostic produced by `handleValueConverterException`;
     `syntax` otherwise. The sanctioned way to tell the last two apart: bind a subclass of
     `ISyntaxErrorMessageProvider` (`parser/antlr/SyntaxErrorMessageProvider.java:24-45`) in the recorder's
     injector whose `IValueConverterErrorContext` overload returns the default message with a distinct issue
     code; the message text and line must stay unchanged. Journal what you chose. Linking is eager here:
     `ElkGraphLinker extends Linker` (not `LazyLinker`; `ElkGraphLinker.xtend:26`), so diagnostics exist right
     after load; verify this, do not call `EcoreUtil.resolveAll`.
   - `graph`: the tree `G` of `GraphJsonVectors.java:1-40` (identifiers, geometry as `Double.toString`,
     labels, ports, children, contained edges, sections) with `properties` replaced by the list below; `null`
     when the root is not an `ElkNode`.
   - `properties`: `[{path, key, keyClass, valueClass, value}]` for every `ElkPropertyToValueMapEntryImpl` in
     document order over `getProperties()` (the EMap order, never `getAllProperties()`). `path` = containment
     path from the root as `feature[index]` segments (`children[1]/containedEdges[0]/sections[0]`), empty string
     for the root. `key` = `IProperty.getId()`; `keyClass` / `valueClass` = `getClass().getSimpleName()` (`Property`
     vs `LayoutOptionData`; `LayoutOptionProxy`, `Double`, `Integer`, `Boolean`, `String`, enum class, …); `value`
     = `String.valueOf` (proxy: its `toString()`); `null` value recorded as JSON `null` with `valueClass` `null`.
   - `connections`: for every shape and section, in document order, `{path, incomingEdges:[edgePath],
     outgoingEdges:[edgePath], incomingSections:[sectionPath]}` **in list order, not sorted** (the order is the
     one `ElkGraphLinker.clearReference` preserves, `ElkGraphLinker.xtend:29-38`, ELK #170); unresolved
     references appear as `{"unresolved": "<linkText>"}` in the owner's reference list.
   - `json`: `ElkGraphJson.forGraph(root)` with exactly `CaseRunner.export` flags (`omitLayout(false)`,
     `omitZeroDimension(false)`, `omitZeroPositions(false)`, `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`,
     `CaseRunner.java:70-78`) under system property `org.eclipse.elk.graph.json.exportSeed=1`, or
     `{throws:{cls,msg}}` when export fails (e.g. unresolved references).
3. Anything iterated from an identity-hashed container is sorted by a stable key before recording
   (`.agent-notes/elk-json-adapter.md`: HotSpot identity hashes); everything else keeps its list order. Two runs
   must be identical; if they are not, locate the hash-iterating source, sort only there, and journal it.
4. Output `<outDir>/graph-text-parse.json`: `{ elkCommit, xtextVersion, registry: "core", cases: [ { id, input,
   diagnostics, graph, properties, connections, json } ] }`, one compact case per line, trailing newline, cases
   sorted by id.

## Write-set
`tools/vectors/ElktParseVectors.java`, `tools/vectors/elkt-parse-scenarios/*`,
`test/golden/refs/java/graph-text-parse.json`. (`.elkt` files are not Prettier-checked; nothing is added to
`.prettierignore`.)

## Read-set
- `tools/oracle/harness/ElkModelReader.java:44-64`, `CaseRunner.java:70-78`, `tools/vectors/GraphJsonVectors.java:1-40`, `.agent-notes/elk-json-adapter.md`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`: `ElkGraph.xtext:20-120`, `ElkGraphRuntimeModule.xtend:30-49`, `linking/ElkGraphLinker.xtend`, `scoping/ElkGraphScopeProvider.xtend`, `naming/ElkGraphQualifiedNameProvider.xtend`, `conversion/*.xtend`
- `src-gen/…/AbstractElkGraphRuntimeModule.java:160-190` (scope delegate, global scope, ignore-case)
- Xtext 2.36.0 EPL source: `linking/impl/{Linker,LinkingDiagnosticMessageProvider,XtextLinkingDiagnostic}.java`, `resource/XtextSyntaxDiagnostic.java`, `parser/DefaultEcoreElementFactory.java`, `parser/antlr/{AbstractInternalAntlrParser,SyntaxErrorMessageProvider}.java`, `scoping/impl/ImportedNamespaceAwareLocalScopeProvider.java`, `diagnostics/AbstractDiagnostic.java`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/` `ElkGraphUtil` (opposite refs) as needed

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity), [G3](../decisions.md#g3--option-registry-for-refs), [G7](../decisions.md#g7--evidence-layout), [G4](../decisions.md#g4--entry-point)
- D3/D8 (`plans/conformance-corpus/decisions.md`: syntax errors presence-only), AD-13

## Interface contract (consumed by T14–T18, T22)
`graph-text-parse.json` as in step 4. `diagnostics[].kind` maps 1:1 to G4's `ElkTextDiagnostic.kind`; `severity`
is `error|warning`; `line` is 1-based. `properties[].path` / `connections[].path` are the TS test's addressing
scheme for the loaded graph.

## Acceptance criteria
- Given each family above, then at least one scenario exists and the header lists which converter errors were
  reachable; every linking error site and every converter error has an exact `{message, severity, line}` row.
- Given unordered-group scenarios, then both orders of `ShapeLayout` and ≥ 6 single-section orders parse to the
  same graph; the repeated-element scenario records a syntax diagnostic.
- Given the qualified/relative reference scenarios, then each row records which element the endpoint resolved
  to (via `connections`) or an `{unresolved}` entry plus the linking diagnostic.
- Given two runs of `elkt-vectors.sh`, then `graph-text-parse.json` is byte-identical; existing refs unchanged.

## Quality bar
README gates; `shellcheck` unaffected; lizard clean on the Java (helper classes inside the single file, or
data in scenario files, to stay ≤ 500 lines and CCN ≤ 10).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK/Guava/ANTLR-runtime source. Do not edit `elkt-vectors.sh`, other tasks' programs, existing refs
or scenario directories. Agents never commit; the orchestrator commits per task.
