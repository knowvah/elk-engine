<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Xtext linking core: `Linker`, `DefaultLinkingService`, diagnostics

**Agent:** typescript-pro · **Commit:** `feat(T16): port xtext eager linker and default linking service`

## Context
`ElkGraphRuntimeModule.xtend:46-48` binds `ILinker` to `ElkGraphLinker extends Linker` — the **eager** linker,
not `LazyLinker` — so right after load every cross reference is resolved or reported
(`Linker.linkModel` -> `ensureModelLinked`). T17 subclasses it (`clearReference` skips `incomingEdges`,
`outgoingEdges`, `incomingSections`, fix for ELK #170) and wires scope provider, naming and converter service; T18
runs it after the parser. Instead of Xtext's node model the linker walks T7's `INodeModel` (T15 supplies the
recorded cross-reference nodes in source order). Mapping rule and sources: [T7](../batch-2a/T7-xtext-converters.md);
file layout `src/xtext/linking/{,impl/}`, `src/xtext/diagnostics/`.

## Task
1. **Reflection facade for references** (D4 gives `EObject` no `eGet/eSet/eUnset`/metamodel): `linking/impl/ReferenceAccess.ts`
   (an interface; T17 implements it for ElkGraph) with exactly what `Linker`/`AbstractCleaningLinker` use:
   ```ts
   export interface ReferenceAccess {
     getEAllReferences(obj: EObject): readonly EReferenceInfo[];              // T14's EReferenceInfo
     getReference(obj: EObject, featureName: string): EReferenceInfo | null;  // GrammarUtil.getReference(ref, eClass)
     eUnset(obj: EObject, ref: EReferenceInfo): void;                         // clears single value / empties list incl. inverses
     eSet(obj: EObject, ref: EReferenceInfo, value: EObject): void;           // single-valued, sets opposite where EMF does
     eGetList(obj: EObject, ref: EReferenceInfo): { addAll(values: readonly EObject[]): boolean }; // EList.addAll (unique: false when nothing new)
   }
   ```
2. **`AbstractCleaningLinker.ts`** (XT `linking/impl/AbstractCleaningLinker.java:38-175`): `linkModel` 43-67 (hooks
   `beforeModelLinked` 75-83 — the lazy-proxy and `ImportedNamesAdapter` clearing are no-ops for this resource type,
   journal — `doLinkModel`, `afterModelLinked` 69-71), `isClearAllReferencesRequired` 88-90 (`true`),
   `getAllLinkableContents` 106-113 (pre-order tree walk from the model through `eContents()`; the model itself
   first), `clearReferences` 115-118 over `getEAllReferences`, **`clearReference` 120-123 as a `protected` overridable
   method** with its five-flag condition (`!containment && !container && !derived && changeable && !transient` -> `eUnset`)
   — T17's override depends on this signature; `createDiagnosticProducer` 160-173 (the `XtextResource.wrap` step is a
   pass-through here). `shouldCheckParentNode` 128-155 and `isContainedInFragmentRule` 152-155 are node-model/grammar
   walkers: not reached because T15 hands over each object's own cross-reference nodes (fragments included) —
   state that mapping in a comment ("the node-children walk of `Linker.ensureLinked` 65-84 is T15's source-order
   grouping").
3. **`Linker.ts`** (XT `linking/impl/Linker.java:42-274`): `doLinkModel` 241-244, `ensureModelLinked` 246-256
   (per object: `clearReferences(next)` **then** `ensureLinked(next)`, in tree order — this order is why #170 existed),
   `ensureLinked(obj, producer)` 55-63 (nodes for `obj` from `INodeModel`; `null` -> return; `producer.setNode(node)`),
   `ensureIsLinked` 117-186 per cross-reference node in source order:
   - Per node `producer.setNode(node)` first (`Linker.java:71`): a diagnostic's line is that node's start line.
   - `getReference` null -> illegal-cross-reference diagnostic (121-126): unreachable for ElkGraph (every recorded
     feature exists); port the branch via `getIllegalCrossReferenceMessage` for fidelity or drop it with that proof.
   - `beforeEnsureIsLinked` hook 112-114 (no-op, overridable); `producer.setTarget`.
   - `getLinkedObject` 223-226 -> `linkingService.getLinkedObjects(obj, ref, node)`; empty -> unless `isNullValidResult`
     (228-230, `false`) the diagnostic `getUnresolvedProxyMessage` (133-139) and return.
   - `upperBound >= 0 && links.size() > upperBound` -> `getViolatedBoundsConstraintMessage` (142-149).
   - `upperBound == 1` -> `eSet(ref, links[0])` (151-152); else the list path 153-176: the `addAllUnique` arm (157-168) needs
     `links.size() > 1`, impossible because `DefaultLinkingService` returns at most one object — omit it with that proof;
     the `else if (!list.addAll(links))` arm (169-175) **is reachable**: adding an element already in a unique list
     (`edge a, a -> b`) returns false and yields `Too many matches for reference to 'a'. Feature sources can only hold -1
     references but found 1 candidate` — keep exactly (message text `LinkingDiagnosticMessageProvider.java:50-56`, singular/plural
     rules included).
   - `IllegalNodeException` catch 177-185 -> `getIllegalNodeMessage` (message = `ex.getMessage()`).
   - `setDefaultValues`/`canSetDefaultValues`/`setDefaultValueImpl` 91-110: `setDefaultValueImpl` is an empty hook that
     `ElkGraphLinker` does not override, so the loop has no observable effect: omit, journal.
4. **`impl/DefaultLinkingService.ts`** (XT `linking/impl/DefaultLinkingService.java:37-142`) and
   `AbstractLinkingService.ts`, `ILinkingService.ts`: `getLinkedObjects` 95-124: `requiredType == null` -> `[]`;
   `crossRefString = getCrossRefNodeAsString(node)` empty/null -> `[]`; scope = `scopeProvider.getScope(context, ref)`
   (the `ImportedNamesAdapter` register/unregister 58-61, 73-89 only records looked-up names for the builder: skip,
   journal); null scope -> `AssertionError` text (110-112, unreachable but keep as a thrown `Error`);
   `qualifiedNameConverter.toQualifiedName(crossRefString)` (T13's converter, which may throw
   `IllegalArgumentException`/`ValueConverterException` — they propagate exactly as in Java); `scope.getSingleElement(qn)`;
   `eObjectDescription == null` -> `[]` else `[getEObjectOrProxy()]`. Constructor parameters replace injection:
   `scopeProvider` (T14 `IScopeProvider`), `linkingHelper`, `qualifiedNameConverter`.
5. **`impl/LinkingHelper.ts`** (XT `linking/impl/LinkingHelper.java:27-76`): `getCrossRefNodeAsString(node, convert)` 59-75 with
   the node's token text (T7 `ICrossReferenceNode.getText()`), rule name from the node (`ruleName`; `getRuleNameFrom`/
   `getRuleFrom` 40-57 reduce to that field), `valueConverter.toValue(text, ruleName, node)` (`ID` strips `^`; `QualifiedId` is the
   identity), `ValueConverterWithValueException` -> its value (69-71), `ValueConverterException` -> `IllegalNodeException(node, ex)`
   whose message is the Java `Throwable(cause)` message `"<cause class>: <message>"` (`IllegalNodeException.java:30-45`; the
   class-name prefix is the Java binary name `org.eclipse.xtext.conversion.ValueConverterException` — unreachable from `.elkt`
   today because `ID`/`QualifiedId` converters do not throw; keep the string construction and a unit test).
   `impl/IllegalNodeException.ts` (46 lines).
6. **Messages and diagnostics:** `impl/LinkingDiagnosticMessageProvider.ts` (XT 22-63, all five methods; unresolved:
   `Couldn't resolve reference to <referenceType.name> '<linkText>'.`; `getLinkText` falls back to `e.getNode().getText()`
   on `IllegalNodeException` 28-32), `ILinkingDiagnosticMessageProvider.ts` (+ `Extended`), `impl/LinkingDiagnosticProducer.ts` (19-30)
   and `impl/XtextLinkingDiagnostic.ts` (18-97: constructor null checks, `getLine` = `node.getStartLine()`), plus the
   minimal `diagnostics/{DiagnosticMessage,IDiagnosticProducer,IDiagnosticConsumer,AbstractDiagnosticProducer,AbstractDiagnostic,Diagnostic}.ts`
   (XT `diagnostics/*`: `DiagnosticMessage` 12-60 including the `Severity.INFO` rejection; `Diagnostic.LINKING_DIAGNOSTIC`
   constant text read from `diagnostics/Diagnostic.java`; `Severity` comes from T11). **G4 mapping:** each consumed linking
   diagnostic becomes `{kind: 'linking', severity, message, line}` (T18 converts; this task exposes `message`, `severity`,
   `code`, `data`, `getLine()`, `getOffset()`, `getLength()`).
7. Tests: unit from the Java source with a test-local scope provider and `ReferenceAccess` over a toy tree: unresolved text,
   duplicate in a unique multi-valued list (the "Too many matches" arm), single-valued set, `clearReference` flag matrix, tree order
   of clear-then-link (an object cleared *after* a later object linked into it loses the link — pin it with a toy opposite pair,
   this is the #170 mechanism T17 neutralises), empty link text, converter-propagated exceptions, diagnostic order. The T3
   linking rows run in T17/T18 (they need the ELK scope provider and naming).

## Write-set
`src/xtext/linking/**`, `src/xtext/diagnostics/**` except `Severity.ts` (T11) (colocated `*.test.ts` implicit).

## Read-set
- XT `linking/impl/{Linker,AbstractCleaningLinker,AbstractLinker,AbstractLinkingService,DefaultLinkingService,LinkingHelper,LinkingDiagnosticMessageProvider,LinkingDiagnosticProducer,XtextLinkingDiagnostic,IllegalNodeException}.java` as ranged, `linking/{ILinker,ILinkingService,ILinkingDiagnosticMessageProvider}.java`
- XT `diagnostics/{Diagnostic,DiagnosticMessage,IDiagnosticProducer,IDiagnosticConsumer,AbstractDiagnosticProducer,AbstractDiagnostic}.java`
- `../elk/plugins/org.eclipse.elk.graph.text/src/.../linking/ElkGraphLinker.xtend:26-40`, `ElkGraphRuntimeModule.xtend:30-49`
- `src/xtext/{scoping,naming,nodemodel,conversion}/**` (T14, T8, T7), `src/xtext/diagnostics/Severity.ts` (T11), `src/emf/common/util/EList.ts`
- `test/golden/refs/java/graph-text-parse.json` (`diagnostics` with `kind: linking`, for message shape only), `plans/graph-text/batch-1/T3-parse-link-vectors.md`

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity) (linking diagnostics exact: message, severity, line) · [G4](../decisions.md#g4--entry-point)
- Phase 4: lookups cached per link pass (T8/T14); AD-13

## Interface contract
Produced for T17/T18: `class Linker` (constructor `(linkingService, diagnosticMessageProvider, linkingHelper, referenceAccess,
nodeModel)`; `linkModel(model, consumer)`; `protected clearReference(obj, ref)`), `IDiagnosticConsumer.consume(diagnostic,
severity)`, `XtextLinkingDiagnostic`. Consumed: T14 `IScopeProvider`/`EReferenceInfo`, T13 converter service +
qualified-name converter, T7 node interfaces, T15 `INodeModel`.

## Acceptance criteria
- Given a toy tree and `a, a -> b`, when linked, then the second `a` yields the "Too many matches" error with the
  Java text and the list holds one element.
- Given an unresolved name `x` for reference type `ElkConnectableShape`, then the error reads
  `Couldn't resolve reference to ElkConnectableShape 'x'.` with the node's start line.
- Given objects visited in tree order with a clearing subclass that does not override `clearReference`, then a link
  set by an earlier object into a later one is erased when the later one is cleared; with a subclass overriding
  `clearReference` for the opposite reference, the link survives (the #170 mechanism).

## Quality bar
README gates; TDD from the Java source; `npm run complexity` clean (split `ensureIsLinked` at its Java sub-steps:
bounds check, single-value set, list add); no module-level mutable state.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/graph/**` import (the ELK linker is T17). Do not port `LazyLinker`, `LazyLinkingResource`, `ImportedNamesAdapter`,
`LinkingScopeProviderBinding`, or Xtext resource classes. Do not edit T11's `Severity.ts` beyond importing it. The agent
does not commit; the orchestrator commits per task.
