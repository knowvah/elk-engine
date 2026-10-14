<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Serializer: sequencer, transient values, cross-reference text

**Agent:** typescript-pro · **Commit:** `feat(T19): port the elkgraph semantic sequencer and serializer`

## Context
G1: no port of Xtext's generic serializer. One sequencer method per grammar rule produces the T12
stream `{kind:'keyword'|'assignment'|'crossref', grammarElement, assignment, text, owner}` (`assignment` = id of the
enclosing Assignment or `null`, per T12 as landed) plus hidden regions;
rendering is Xtext's default (no formatter) here, T21 adds the formatter, T22 the entry point. Evidence:
T5 `unformatted` rows, byte-exact.

## Task
1. `serializer/ElkGraphSemanticSequencer.ts`: one method per rule, order of assignments from the
   constraint comments of `src-gen/.../serializer/AbstractElkGraphSemanticSequencer.java:95-246` and
   `ElkGraph.xtext:1-120`: `sequence_RootNode_ShapeLayout` (`:241`), `sequence_ElkNode_ShapeLayout` (`:180`),
   `sequence_ElkPort_ShapeLayout` (`:192`), `sequence_ElkLabel_ShapeLayout` (`:163`),
   `sequence_EdgeLayout_ElkEdge` (`:108`), `sequence_ElkEdgeSection` (`:151`), `sequence_ElkSingleEdgeSection`
   (`:212`), `sequence_ElkBendPoint` (`:120`), `sequence_Property` (`:224`). Document per method which
   optional groups the constraint admits (`?`, `*`) and which are transient. A rule dispatch by `eClass().getName()`
   + the context (RootNode vs ElkNode = `eContainer` null or not; single vs multi section = identifier
   null or not) mirrors Xtext's context finder; read `serializer/sequencer/ContextFinder.java` only for
   how the context is chosen.
2. `serializer/ElkGraphSemanticSequencer.sequence_Property` from `serializer/ElkGraphSemanticSequencer.xtend:34-65`:
   - map entry (`ElkPropertyToValueMapEntryImpl`): key/value; if `value` is an `IPropertyValueProxy` and
     key non-null, `resolveValue(key)`, non-null result **replaces** `entry.value` (`:38-42`, mutates the
     semantic object — T22's `serialize` therefore copies first, G2);
   - key null -> error via `errorAcceptor` "feature value missing" (`:43-45`); Xtext text from
     `serializer/diagnostic/` (read it); serialization of that object then throws (G2 presence);
   - feeder: key via `PropertyKey` rule (`:48`), then `Boolean` -> `BooleanValue` (`:49-50`), `Number` ->
     `NumberValue` (`:51-52`), other non-null -> `value.toString` and
     `isQuotingNecessary(string)` ? `StringValue` : `QualifiedIdValue` (`:53-58`); null value -> nothing.
   - **Quirk (G1), `:67-74`:** `isQuotingNecessary` calls `idValueConverter.toString` on a field that is
     never injected (`:32`); the `map` result is unused, so the Xtend compiler drops the call
     (`xtend-gen/.../ElkGraphSemanticSequencer.java:80-94`) and the method returns `false` for every input. Port the behaviour: always `false`; comment cites `:32,67-74` and
     `../decisions.md#g1--writer-architecture`; T5 rows confirm it (a string value with spaces is written
     unquoted via `QualifiedIdValue`, then T13's converter decides the text). Note the non-`ElkPropertyToValueMapEntryImpl`
     branch (`:62-64`, `super.sequence_Property`) has no TS counterpart; assert unreachable in a comment.
   - value-type dispatch uses TS `typeof`/class checks over the TS value domain (boolean, number, others
     through `toString` = `String(...)`/`JavaDouble` etc. via T13 converters; check
     `src/graph/text/conversion/PropertyValueValueConverter.ts` for how `Number` vs `Double`/`Integer` are
     distinguished (mission-3 option value types) and reuse that, do not re-decide).
3. `serializer/ElkGraphSyntacticSequencer.ts` (`ElkGraphSyntacticSequencer.xtend:18-19` is empty) plus the single
   ambiguity from `AbstractElkGraphSyntacticSequencer.java:48-72`:
   `emit_ElkEdge___LeftCurlyBracketKeyword_7_0_RightCurlyBracketKeyword_7_4__q` — the optional
   `{ ... }` of an edge. Port exactly what the generated code does (it delegates to the default
   `acceptNodes`/emits both keywords when any node exists); the T5 rows (edge with and without
   sections/properties/labels) decide the observable behaviour.
4. `serializer/ElkGraphTransientValueService.ts` from `ElkGraphTransientValueService.xtend:23-35` plus
   the `LegacyTransientValueService` base (scratchpad `xtext-src/.../serializer/sequencer/LegacyTransientValueService.java:1-52`,
   `TransientValueService.java`): `isListTransient` is `YES` for `incomingEdges`, `outgoingEdges`,
   `incomingSections` (`:25-33`), otherwise `super`; `isValueTransient`/`isTransient` per Legacy: a
   single-valued feature is transient when not `eIsSet` (and for derived/transient/container features);
   port the branches that apply to ElkGraph features (identifier, x/y/width/height, startX..., `parent`
   containment features).
5. Cross-reference text (Xtext `serializer/tokens/CrossReferenceSerializer.java:1-163`): for an edge's
   `sources`/`targets` and a section's `incomingShape`/`outgoingShape`/`outgoingSections`, the text is the
   name the scope maps to the target: ask T14's scope (`ElkGraphScopeProvider` from T17, serializer scope
   binding: `SerializerScopeProviderBinding`, in Xtext the same scope provider) for `getScope(context, ref)`,
   `getElements(target)`, take the first description's name, convert with `ElkGraphQualifiedNameConverter`
   (`toString`) then `LinkingHelper`/`ILinkingService.getCrossRefNodeAsString` escaping via the converter; read
   `CrossReferenceSerializer.getCrossReferenceNameFromScope` for the exact choice among several names and for the
   error when the target is not in scope (-> serialization error; throws, G2). Document in a comment
   which names the ElkGraph scope offers (qualified, container-relative).
6. Unformatted rendering: T12 gives the stream and hidden regions; Xtext's default with no formatter is
   `serializer/sequencer/HiddenTokenSequencer.java` + `WhitespaceAddingSequenceAcceptor.java` (one space between
   tokens that would otherwise merge, none otherwise — read them for the exact rule) and
   `serializer/impl/Serializer.java` (`serialize(obj)` w/o `SaveOptions.format()`). Port that rendering
   into `serializer/ElkGraphSerializer.ts` (`serializeUnformatted(root): string`) — T22/T21 add the formatter.
7. Tests (first): for each T5 row with `unformatted`: build the source graph (`source: 'elkt'` through
   T18 `load`; `'json'` through `ElkGraphJson.forGraph`), `serializeUnformatted` equals the text byte
   for byte; rows with `error` throw (presence only). Unit tests for transient rules (`eIsSet` false ->
   omitted; `incomingEdges` never emitted), the key-null error, proxy resolution (`LayoutOptionProxy`, T10), and
   the always-false quoting quirk.

## Write-set
`src/graph/text/serializer/{ElkGraphSemanticSequencer,ElkGraphSyntacticSequencer,ElkGraphTransientValueService,ElkGraphSerializer}.ts`
(colocated tests implicit). Further files under `src/graph/text/serializer/` only if a Java-named class needs one.

## Read-set
- graph.text `src/.../serializer/{ElkGraphSemanticSequencer:15-76,ElkGraphTransientValueService:15-35,ElkGraphSyntacticSequencer}.xtend`
- `src-gen/.../serializer/AbstractElkGraphSemanticSequencer.java:95-246`, `AbstractElkGraphSyntacticSequencer.java:30-72`, `ElkGraph.xtext:1-120`
- Xtext `serializer/{impl/Serializer,tokens/CrossReferenceSerializer,sequencer/{LegacyTransientValueService,TransientValueService,HiddenTokenSequencer,ContextFinder},acceptor/WhitespaceAddingSequenceAcceptor}.java`
- `src/xtext/formatting2/**` (T12 contract), `src/graph/text/conversion/**` (T13), `src/graph/text/{naming,scoping}/**` (T17), `src/xtext/scoping/**`
- `src/graph/properties/IPropertyValueProxy.ts`, `src/core/util/internal/LayoutOptionProxy.ts` (T10), `src/graph/impl/ElkPropertyToValueMapEntryImpl.ts`
- `test/golden/refs/java/graph-text-write.json` (T5)

## Decisions
- [G1](../decisions.md#g1--writer-architecture) architecture and the quirk; [G2](../decisions.md#g2--writer-input-and-oracle-contract) errors presence-only;
  D10 (formatter + serializer byte-exact vs oracle); AD-9 (no OpenJDK).

## Interface contract
Consumes T12's sequence stream and render API (`FormatterRequest`-style entry from T12 as landed),
T13 converters (`toString` per rule), T17 scope. Produces for T21/T22:
`class ElkGraphSemanticSequencer { sequence(root: ElkNode): SequenceStream }`,
`serializeUnformatted(root: ElkNode): string` (throws `Error` subclass on serialization error).

## Acceptance criteria
- Given each T5 row with `unformatted`, then `serializeUnformatted` returns exactly that text.
- Given each T5 row with `error`, then serialization throws.
- Given a property whose value needs quotes, then the output still uses the unquoted `QualifiedIdValue` form exactly as the vector (quirk preserved).
- Given an edge with `incomingEdges` populated on its endpoints, then they never appear in the output.

## Quality bar
README gates; TDD from T5; `npm run complexity` clean (one method per rule keeps functions small; split only at Java method boundaries); `@see` on every symbol; SPDX headers.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Stop 8 if a vector needs the generic NFA sequencer. Do not fix `isQuotingNecessary`. No edits to
T12/T13/T17 files or to refs. Mutating `entry.value` is the Java's behaviour: keep it, T22 copies. No
OpenJDK/Guava/ANTLR source. Do not commit.
