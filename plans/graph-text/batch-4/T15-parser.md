<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — `ElkGraphParser`: recursive descent, value conversion, positions, reference records

**Agent:** typescript-pro · **Commit:** `feat(T15): add hand-written elkt parser with positions and reference records`

## Context
D8: the parser is hand-written recursive descent, one method per grammar rule (`ElkGraph.xtext:20-114`); the
generated ANTLR parser (`src-gen/.../parser/antlr/internal/InternalElkGraphParser.java`) is read as the
edge-case spec only. T18 (`ElkGraphText.load`) composes lexer -> parser -> linker (T16/T17); T20/T22 use the
recorded positions for validator and diagnostic lines (G5: exact `line`). The parser creates the model the way
Xtext's `DefaultEcoreElementFactory` does — through the ElkGraph factory and feature setters/lists, in source
order — but leaves cross references **unset**, recording each as a node (the eager `Linker` sets them, T16).

## Task
Files: `ElkGraphParser.ts` (RootNode, ElkNode, ElkLabel, ElkPort, ShapeLayout, Property family, values, Number),
`ElkGraphParserEdges.ts` (ElkEdge, EdgeLayout, ElkSingleEdgeSection, ElkEdgeSection, ElkBendPoint, QualifiedId;
a helper class/functions taking the parser's token cursor, to keep each file < 500 lines),
`ParseRecords.ts` (diagnostics, positions, cross-reference nodes, converter-call policy).
1. **Entry:** `parse(text, services): ParseResult` with
   ```ts
   interface ParseResult { root: ElkNode | null; diagnostics: ParseDiagnostic[]; // kind 'syntax' | 'conversion'
     references: ICrossReferenceNode[]; nodeModel: INodeModel; positions: IssueLocator /* T11 */ }
   interface ParseDiagnostic { kind: 'syntax' | 'conversion'; message: string; line: number }
   ```
   `services` = the T13 `ElkGraphValueConverterService` plus the T9 lexer. `references` are the
   `{owner, feature, text, line, index, ruleName}` records of the Phase 5 contract, implemented as one class that is
   both T7's `ICrossReferenceNode` (`getText()` = token text **without hidden tokens**, so `a . b` is `a.b`,
   `NodeModelUtils.getTokenText`; `getStartLine()` = line of the first token; `getSemanticElement()` = owner) and the
   record. `nodeModel.getCrossReferenceNodes(obj)` returns an object's references in source order across its
   features (the order of the node's children), `null` never for a parsed object. `positions` answers T11's
   `IssueLocator`: `objectStartLine(obj)` = line of the first non-hidden token of the object's production
   (`NodeModelUtils.findActualNodeFor`, offset-based line `AbstractNode.java:180-187`; for the root: the first token of
   the file, or line 1 for an empty/comment-only file — check the T3 row) and `featureStartLines(obj, name)` = start
   line of each assigned value, in source order.
2. **One method per rule, with Xtext's LL decisions** (take each decision from `ElkGraph.xtext` and confirm on
   T3 rows; `la(k)` skips hidden tokens except inside `PropertyKey`):
   - `RootNode` (20-24): `{ElkNode}` action = always create; optional `'graph' identifier=ID`; `ShapeLayout?`;
     `properties+=Property*`; then `(labels | ports | children | containedEdges)*` chosen by `'label'`, `'port'`,
     `'node'`, `'edge'`; anything else before EOF is a syntax error. Strict order: a property after a child is an error.
   - `ElkNode` (26-31), `ElkLabel` (33-38: `(identifier=ID ':')?` decided by `ID` followed by `':'`; `text=STRING`),
     `ElkPort` (40-45): optional `'{' … '}'` body decided by `'{'`.
   - `ShapeLayout` fragment (47-51) **unordered group**: `'layout' '[' ( ('position' ':' x=Number ',' y=Number)? &
     ('size' ':' width=Number ',' height=Number)? ) ']'` — each member at most once, in either order; a repeated
     member is a syntax error (T3). Same mechanism for the four members of `ElkSingleEdgeSection` / `ElkEdgeSection`
     (70-73, 81-84; any subset, any order of `incoming`, `outgoing`, `start`, `end`, then `('bends' ':' point ('|'
     point)*)?`, then `properties+=Property*`). One shared helper `parseUnorderedGroup(members)`; no 24-way methods.
   - `ElkEdge` (54-61): `'edge' (identifier=ID ':')?` (2-token lookahead `ID ':'` — `a.b` also starts with ID),
     `sources+=QualifiedId (',' …)* '->' targets+=QualifiedId (',' …)*`, optional body with `EdgeLayout?` (63-66:
     `'layout' '[' ( ElkSingleEdgeSection | ElkEdgeSection+ ) ']'`: when the next token is `'section'` parse
     `ElkEdgeSection+`, **otherwise a single section — also when empty**, so `layout [ ]` yields one section without
     identifier; `{ElkEdgeSection}` is an action, the object exists even if nothing follows),
     `properties+=Property*`, `labels+=ElkLabel*`.
   - `ElkEdgeSection` (79-87): `'section' identifier=ID ('->' outgoingSections+=[ID] (',' …)*)? '[' … ']'`.
   - `Property` (98-99): `key=PropertyKey ':' (value=StringValue | QualifiedIdValue | NumberValue | BooleanValue |
     'null')` chosen by token type (`STRING`; `ID`; `SIGNED_INT`/`FLOAT`; `true`/`false`; `null`). The `'null'`
     alternative assigns nothing: the entry's value stays unset. **`PropertyKey hidden()`** (101-102): `ID ('.' ID)*`
     with *no hidden tokens*: a following `'.'` belongs to the key only if it starts exactly at the previous token's end
     (`offset + text.length`) and its ID exactly at the dot's end; whitespace or a comment ends the key (and the next
     token, e.g. `.`, then fails the `':'` expectation: syntax error). `QualifiedId` (92-93) and
     `QualifiedIdValue`/`NumberValue`/`BooleanValue`/`StringValue` allow hidden tokens between their tokens; their
     datatype text is the concatenation of the non-hidden token texts.
   - Tokens: use T9's `tokenize*`; a `lexError` is a `syntax` diagnostic (presence only, G5); a `RULE_ANY_OTHER` token is
     a syntax error at the first parser position that sees it.
3. **Object creation = `DefaultEcoreElementFactory` semantics** (`parser/DefaultEcoreElementFactory.java:50-139`,
   Xtext source jar): create with `ElkGraphFactory.eINSTANCE.createElkNode()/…`; containment values with `addUnique`
   (`add` 104-119: the value is an EObject), single attributes through the setters (`setIdentifier`, `setX`, `setStartX`,
   …), `properties` entries appended with the **list add that keeps duplicates** (`getProperties()` `EcoreEMap` entry
   list: verify with the T3 "same key twice" scenario that both entries remain, in order). Cross references: nothing is set
   here. Defaults are the model's (zero/null), not `undefined`.
4. **Conversion call policy** (port of `set`/`add` 64-139 and `AbstractInternalAntlrParser.handleValueConverterException`
   487-501, with `getValueConverterExceptionMessage` 477-485): for every converted assignment call
   `services.toValue(text, ruleName, node)` (rule names `ID`, `STRING`, `Number`, `PropertyKey`, `StringValue`,
   `QualifiedIdValue`, `NumberValue`, `BooleanValue`; `node` = a minimal `INode` whose `getSemanticElement()` is the owner
   **already holding its key** — the key is converted and set before the value, ElkPropertyToValueMapEntryImpl is created
   before `set(.., "key", ..)` — and whose `getStartLine()` is the first token's line). On `ValueConverterException`:
   a `conversion` diagnostic with message = `cause != null ? cause.getMessage() : exception.getMessage()` (fallbacks as
   477-485), `line` = the node's start line (`AbstractDiagnostic.getLine` -> `node.getStartLine()`), **at most one
   message per node** (`appendError` only when the node has none), parsing continues; a
   `ValueConverterWithValueException` still sets its `getValue()` (73-77, 120-124); any other thrown exception becomes
   `ValueConverterException(null, node, e)` (83-84); `checkNullForPrimitiveFeatures` 135-139 (`Number` returning null for a
   primitive double -> `"ValueConverter returned null for primitive feature x"`). Conversion diagnostics are ordered with
   syntax diagnostics by node position (`XtextResource.addSyntaxErrors` walks the node tree), parse diagnostics precede
   linking ones.
5. **Error policy (D8, G5):** the first syntax error is recorded as `{kind:'syntax', message, line}` (message free text) and
   parsing stops; `root` is then returned as built so far or `null` — T3 rows with a `syntax` diagnostic are compared by
   presence only, never by graph or by later diagnostics (journal the list of such rows). All other rows must match
   `diagnostics` (kind, message, line) and the graph exactly.
6. **Tests:** replay every `test/golden/refs/java/graph-text-parse.json` case **without linking**: diagnostics of kind
   `conversion` exactly, graph structure (identifiers, geometry, labels, ports, nested nodes, contained edges, sections with
   bend points, `properties` rows `{path, key, keyClass, valueClass, value}`) exactly, references compared as text
   (`{owner path, feature, text, line}` against the recorded `connections`/`unresolved` link texts — resolution is T17/T18);
   unordered-group permutations; hidden-token cases of `PropertyKey`; plus the budget below.

## Write-set
`src/graph/text/parser/ElkGraphParser.ts`, `src/graph/text/parser/ElkGraphParserEdges.ts`,
`src/graph/text/parser/ParseRecords.ts` (colocated `*.test.ts` implicit).

## Read-set
- `ElkGraph.xtext:15-120`, `ElkGraphRuntimeModule.xtend:30-49`, `src-gen/.../parser/antlr/internal/InternalElkGraph.g` (edge cases only)
- Xtext: `parser/DefaultEcoreElementFactory.java:50-139`, `parser/antlr/AbstractInternalAntlrParser.java:300-420,477-520`, `conversion/ValueConverterException.java`, `diagnostics/AbstractDiagnostic.java:56-64`, `nodemodel/impl/AbstractNode.java:180-187`
- `test/golden/refs/java/graph-text-parse.json`, `plans/graph-text/batch-1/T3-parse-link-vectors.md`
- `src/graph/text/parser/{ElkGraphLexer,ElkGraphTokenType}.ts` (T9), `src/graph/text/conversion/*` (T13), `src/xtext/nodemodel/*` (T7), `src/xtext/validation/IssueLocator.ts` (T11)
- `src/graph/{ElkGraphFactory,ElkNode,ElkEdge,ElkEdgeSection,ElkShape,EMapPropertyHolder}.ts`, `src/graph/impl/ElkGraphFactoryImpl.ts`, `src/emf/ecore/util/EcoreEMap.ts`

## Decisions
- D8 (`plans/conformance-corpus/decisions.md`) · [G5](../decisions.md#g5--diagnostic-fidelity) · [G6](../decisions.md#g6--lexer) · [G4](../decisions.md#g4--entry-point)
- Budget: [decisions.md](../decisions.md#operational-readiness-phase-4) — parse + link of the 253 KB model < 1 s; this task's share: parser < 500 ms

## Interface contract
Consumed: T9 tokens, T13 `ElkGraphValueConverterService`, T7 `INode`/`ICrossReferenceNode`/`INodeModel`, T11 `IssueLocator`.
Produced for T16/T17/T18/T20: `ParseResult` above (`references` + `nodeModel` feed the linker; `positions` feeds the
validator; `diagnostics` become G4 `ElkTextDiagnostic`s with the linking ones appended by T18).

## Acceptance criteria
- Given every T3 case without a recorded `syntax` diagnostic, when parsed, then graph, properties and conversion
  diagnostics equal the recording and each reference's text and line equal the recorded link text/line.
- Given each recorded `syntax` case, then at least one `syntax` diagnostic is produced; given `a .b: 1` or `a. b: 1`
  as a property key, then a syntax error (hidden tokens end `PropertyKey`).
- Given `layout [ position: 1, 2 size: 3, 4 ]` and the reverse order, then equal geometry; given `position` twice, a syntax error.
- Given `layout [ ]` in an edge, then exactly one section with a null identifier; given `graph g` only, a root with identifier `g`.
- Given the 253 KB model, when parsed (tokens included) five times, then the median is under 500 ms.

## Quality bar
README gates; TDD from the T3 recordings; `npm run complexity` clean (one method per rule keeps CCN low;
extract `parseUnorderedGroup`, `parseValueAlternative`); no regex in the hot loop; recursion depth = nesting depth only.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No ANTLR runtime or generated-parser code in `src/` (stop 5). No linking, scoping or validation here. Do not edit T3
recordings or T9/T13 files. The agent does not commit; the orchestrator commits per task.
