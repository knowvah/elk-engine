<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Xtext scoping: scopes, descriptions, `Scopes`, `ImportedNamespaceAwareLocalScopeProvider`

**Agent:** typescript-pro · **Commit:** `feat(T14): port xtext scoping and local namespace scope provider`

## Context
Cross references (`edge a.p -> b`, `section s -> t`) are resolved by the scope chain
`ElkGraphScopeProvider` (T17) -> delegate `ImportedNamespaceAwareLocalScopeProvider` -> global scope
(`AbstractElkGraphRuntimeModule.java:166-181`: `bindIScopeProvider` = ElkGraphScopeProvider, delegate named
`AbstractDeclarativeScopeProvider.NAMED_DELEGATE` = `ImportedNamespaceAwareLocalScopeProvider`,
`DefaultGlobalScopeProvider`, `IgnoreCaseLinking = false`). ELK has no `importedNamespace` feature and a single
resource, so the reached behaviour is: resource scope over all named objects, then per-container wildcard
`ImportScope`s (shadowing), and `Scopes.scopeFor` for the section scope. The writer (T19) also needs the
reverse lookup `getElements(EObject)` (cross-reference text, G1). File layout: [T7](../batch-2a/T7-xtext-converters.md)
rule; `XT` = Xtext source jar as there. Phase 4 budget: parse + link of the 253 KB model < 1 s; "scope lookups
cache per link pass (as `IResourceScopeCache`), never simplify the algorithm" (decisions.md).

## Task
Port with Guava's lazy `Iterables` as TS lazy iterables (generators or `src/guava/Iterables.ts`): the laziness
of `ParentIterable` (`AbstractScope.java:47-78`) and `getAllElements` must be preserved (no eager
materialisation of the whole scope chain).
1. **Reflection facade (new, because mission-2 D4 gives `EObject` no metamodel)** — `scoping/EReferenceInfo.ts`
   (+ `EClassRef`): what Xtext reads from `EReference`/`EClass`, supplied by T17 for the five ElkGraph
   cross-references:
   ```ts
   export interface EClassRef { readonly name: string; isAssignableFrom(eClassName: string): boolean } // EcoreUtil2.isAssignableFrom(type, eClass)
   export interface EReferenceInfo { readonly name: string; readonly referenceType: EClassRef;
     readonly upperBound: number; readonly unique: boolean; readonly containment: boolean; readonly container: boolean;
     readonly derived: boolean; readonly changeable: boolean; readonly transient: boolean } // T16 reads the flags
   ```
   `IScopeProvider.getScope(context: EObject, reference: EReferenceInfo): IScope` (`IScopeProvider.java`, 38 lines).
2. **Descriptions** (`org.eclipse.xtext.resource`, dir `src/xtext/resource/`): `IEObjectDescription.ts` (61),
   `AbstractEObjectDescription.ts` (37), `EObjectDescription.ts` (26-108: constructor null-name NPE -> `TypeError`
   by D10, `create` factories, `getEClass` from `eClass()`; `getEObjectURI`: see decision below),
   `ISelectable.ts` (54), `impl/AliasedEObjectDescription.ts` (22-71). **URI decision:** `getEObjectURI` and the
   `uri.equals(...)` branches (`AbstractScope.java:199-203,212`, `SimpleScope.java:64,79`, `ImportScope.java:112`,
   `MultimapBasedSelectable.java:67`) can only differ from the identity test `input.getEObjectOrProxy() == object`
   for two distinct Java objects with the same URI; within one resource tree URIs are unique, so identity is
   equivalent. Port the branch as `obj === other` with that invariant in a comment; `getEObjectURI()` returns a
   structural fragment path string (`/`-joined `eContainer` chain index path) *only if* a caller needs it
   (T19 does not) — otherwise omit the method and journal it.
3. **Scopes:** `scoping/IScope.ts` (`NULLSCOPE`, `IScope.java:56-135`), `IScopeProvider.ts`, `Scopes.ts`
   (`XT scoping/Scopes.java`: `scopeFor(elements, outer)` 62-64 and `scopeFor(elements, nameComputation, outer)`
   69-72 — the ELK section scope calls the latter; `scopedElementsFor(elements, nameComputation)` 88-100, null
   names skipped; `scopedElementsFor(elements)` with `QualifiedName.wrapper(SimpleAttributeResolver.NAME_RESOLVER)`
   79-81 reduces to "no `name` feature" -> empty, see T8; `selectCompatible` 42-49 and `index`/`filterDuplicates`
   106-137 are not reached, skip), `impl/AbstractScope.ts` (41-251, **whole**: `getSingleElement` 104-110,
   `getAllElements` 120-131, `getElements(name)` 133-148 incl. the `Collection`-empty shortcut,
   `getElements(EObject)` 161-173 and `getLocalElementsByEObject` 192-219 incl. `canBeFoundByName`,
   `getParentElements` 221-225, `isShadowed` 233-237, `ParentIterable`), `impl/SimpleScope.ts` (26-111: the
   `shadowingIndex` hash set and `canBeFoundByNameAndShadowingKey` 70-85), `impl/SelectableBasedScope.ts`
   (23-73), `impl/MultimapBasedSelectable.ts` (31-113: `LinkedHashMultimap` keyed by `name.toLowerCase()`,
   insertion order = document order decides which duplicate wins; use `src/guava/LinkedHashMultimap.ts`;
   `getExportedObjects(type, name, ignoreCase)` 76-98 filters by `name.equals` when not ignoring case),
   `impl/ImportNormalizer.ts` (17-132), `impl/ImportScope.ts` (39-186: `getAliasedElements` 116-141 with its
   `LinkedHashMultimap` + `HashMultimap<QualifiedName, ImportNormalizer>` removal of ambiguous aliases,
   `getLocalElementsByName` 148-176 incl. the `result.get(0)` conflict return and the "Couldn't deresolve"
   `IllegalStateException`), `impl/ScopeBasedSelectable.ts` (21-62; used for `importFrom == null`).
4. **Providers:** `scoping/IGlobalScopeProvider.ts` (41), `ICaseInsensitivityHelper.ts` +
   `impl/CaseInsensitivityHelper.ts` (`isIgnoreCase` -> the `@IgnoreCaseLinking` constant, **false**),
   `impl/AbstractScopeProvider.ts`, `impl/AbstractGlobalScopeDelegatingScopeProvider.ts` (34-62: `getGlobalScope`,
   `wrap` with the optional `IScopeWrapper` — `ImportedNamesAdapter` tracking is not reached for results, skip
   and journal), `impl/DelegatingScopeProvider.ts` (28-52: `getScope` -> `delegateGetScope` -> `getDelegate()`;
   `AbstractElkGraphScopeProvider` is an empty subclass, `src-gen/.../scoping/AbstractElkGraphScopeProvider.java`),
   `impl/ImportedNamespaceAwareLocalScopeProvider.ts` (56-250): `getScope` 91-101 (recursive container walk:
   `eContainer() != null` -> parent scope, else `getResourceScope(resource, ref)`; then `getLocalElementsScope(result,
   context, ref)`), `getResourceScope(res, ref)` 103-111 (global scope, `getImplicitImports` -> empty so no import
   scope), `getResourceScope(parent, context, ref)` 117-123 (`SelectableBasedScope.createScope` over all
   descriptions; returns `outer` when empty), `getLocalElementsScope` 194-213 (`name = fqn(context)`; the
   `namespaceResolvers` branch is empty for ELK but port it; `if (name != null)` -> an `ImportScope` with a
   wildcard `ImportNormalizer(name, true, ignoreCase)` over `allDescriptions`), `getImportedNamespaceResolvers`
   129-151 / `getImportedNamespace` 153-166 (the `importedNamespace` EAttribute lookup returns `null` for the
   ElkGraph metamodel: `grep importedNamespace ../elk/plugins/org.eclipse.elk.graph/model/elkgraph.ecore` is empty;
   comment says so), `createImportedNamespaceResolver` 168-188, `getAllDescriptions` 227-234 and
   `internalGetAllDescriptions` 236-245 (all objects of the resource in `EcoreUtil.getAllContents(resource,
   false)` pre-order = root first, then `eAllContents()`; `Scopes.scopedElementsFor(.., qualifiedNameProvider)`;
   cached per resource through T8's `IResourceScopeCache` under the key `"internalGetAllDescriptions"`).
   The Java `Resource` is the root object (T8 rule). `SingleResourceGlobalScopeProvider` (T14-local name, not an
   Xtext class): `getScope(...)` returns `IScope.NULLSCOPE`. **Equivalence claim to prove, not assume:** Xtext binds
   `DefaultGlobalScopeProvider`, whose scope for a lone resource would only re-expose this resource's own exported
   objects, which the resource-level `SelectableBasedScope` already holds first (it is the inner scope) — the global
   scope can neither add a candidate nor change which duplicate wins. T3's scoping scenarios (qualified,
   shadowing, duplicates, forward references) are the proof; a divergence there is a stop-7 diagnosis, and this
   assumption is the first suspect.
5. Tests from the Java source: `QualifiedName`-level cases for `ImportNormalizer.resolve/deresolve`
   (wildcard/exact, ignore-case arms), `ImportScope` aliasing and ambiguous-alias removal, `SimpleScope`
   shadowing, `AbstractScope.getElements` ordering and laziness (a counting iterable proves the parent is not
   pulled), and a toy tree (`root{a{p},b}`) with a test-local `IQualifiedNameProvider` checking: a name relative
   to the owning container, a qualified name from outside, an ancestor's name, shadowing by an inner element of
   the same name, the first duplicate winning, and `getElements(object)` returning the shortest-visible alias.
   ELK-specific lookups (`ElkGraphScopeProvider`, edges, sections) are T17's tests.

## Write-set
`src/xtext/scoping/**`, `src/xtext/resource/**` (colocated `*.test.ts` implicit).

## Read-set
- XT `scoping/{Scopes.java,IScope.java,IScopeProvider.java,IGlobalScopeProvider.java,ICaseInsensitivityHelper.java}` and `scoping/impl/*` as ranged above
- XT `resource/{IEObjectDescription,AbstractEObjectDescription,EObjectDescription,ISelectable}.java`, `resource/impl/AliasedEObjectDescription.java`
- `../elk/plugins/org.eclipse.elk.graph.text/src/.../scoping/ElkGraphScopeProvider.xtend:31-45`, `src-gen/.../AbstractElkGraphRuntimeModule.java:166-181`, `src-gen/.../scoping/AbstractElkGraphScopeProvider.java`
- `src/xtext/naming/**`, `src/xtext/util/{IResourceScopeCache,ResourceScopeCache}.ts` (T8), `src/guava/{Iterables,LinkedHashMultimap,HashMultimap,Multimap}.ts`, `src/emf/ecore/util/EcoreUtil.ts`
- `test/golden/refs/java/graph-text-parse.json` (scoping families: for the cases in step 5 only; full replay is T17/T18)

## Decisions
- [G1](../decisions.md#g1--writer-architecture) (reverse lookup for cross-reference text) · [G5](../decisions.md#g5--diagnostic-fidelity)
- Operational readiness / Phase 4 budget in [decisions.md](../decisions.md#operational-readiness-phase-4) · AD-10 (Linked/Hash order)

## Interface contract
Produced for T16 (linking service calls `scopeProvider.getScope(context, reference).getSingleElement(qualifiedName)`),
T17 (`ElkGraphScopeProvider extends DelegatingScopeProvider`, constructed with the delegate;
`Scopes.scopeFor(sections, nameFn, IScope.NULLSCOPE)`), T19 (`scope.getElements(object)` / `getSingleElement(object)`),
T18 (wiring). `EReferenceInfo`/`EClassRef` are implemented by T17 for `sources`, `targets`, `incomingShape`,
`outgoingShape`, `outgoingSections`.

## Acceptance criteria
- Given the toy tree above, then every lookup in step 5 returns the element and name the Java algorithm yields,
  and `getAllElements` on a chain of three scopes consumes only the first scope's iterable until iteration
  continues.
- Given duplicate sibling names, then `getSingleElement` returns the first in document order.
- Given an ambiguous alias reachable through two normalizers, then `ImportScope` removes it (source 116-141).
- Given a 20,000-object synthetic tree, when 5,000 qualified lookups run, then the total time is under 300 ms
  (budget guard; scope construction per lookup is O(depth), the description index is built once per resource).

## Quality bar
README gates; TDD from the Java source; `npm run complexity` clean (split at Java method boundaries;
`getAliasedElements`/`getLocalElementsByName` are the CCN risks — keep the Java helpers `removeDuplicates`,
`getIgnoreCaseAwareQualifiedName`); no module-level mutable state (AD-8).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/graph/**` import (T6 rule: the ELK-specific provider is T17). Do not port `DefaultGlobalScopeProvider`,
resource-descriptions/container managers, `ImportUriGlobalScopeProvider`, load-on-demand, `FilteringScope`,
`MapBasedScope`, `MultimapBasedScope`, `SingletonScope`, `SimpleLocalScopeProvider`, `AbstractDeclarativeScopeProvider`
(not reached). No Guava source. The agent does not commit; the orchestrator commits per task.
