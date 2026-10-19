<!-- SPDX-License-Identifier: EPL-2.0 -->

# D13 plan record — lazy linking and EMF proxies (2026-10-16)

Produced by a read-only Plan agent after the user chose D11 option A; approved by the user with Q1–Q4 answered as
recommended (journal 2026-10-16). Sources were read from Xtext 2.36.0 and EMF 2.37.0 EPL source jars (extracted to the
session scratch dir; re-extract from `~/.m2/repository/.cache/tycho/.../org.eclipse.xtext.source_2.36.0…jar` and the
`org.eclipse.emf.ecore.source`/`org.eclipse.emf.common.source` bundles). Java paths below are relative to those jars or
to `$ELK_SOURCE_DIR/plugins/`.

## 1. Mechanism inventory

**(a) Load with `LazyLinker`.** `DefaultRuntimeModule.java:174-175` binds `ILinker` → `LazyLinker`; `:198-199`
`XtextResource` → `LazyLinkingResource`; `:247-248` `USE_INDEXED_FRAGMENTS_BINDING` → `true` (hence `|n`). The `.elkj`
runtime module overrides none of these. `AbstractCleaningLinker.linkModel` → `LazyLinker.doLinkModel`
(`LazyLinker.java:90-107`): clears references on every linkable object, then `installProxies` in pre-order over
`eContents` (`getAllLinkableContents`, `:106-112`). `installProxies` (`:118-153`) walks the node model; per
`CrossReference` node with leaves (`:126`) it takes the `EReference` (`:129`); `isResolveProxies()` (`:135`) →
`createAndSetProxy` (`:139-140`; the eager `installQueuedLinks` branch `:137`/`:170-187` is unreachable for ElkGraph).
`createAndSetProxy` (`:190-197`) uses `addUnique` for many-valued features, `eSet` otherwise. `createProxy`
(`:199-209`) sets `resource.getURI().appendFragment(encoder.encode(obj, eRef, node))`; class from `getProxyType`
(`:214-218`) → `findInstantiableCompatible` (`:220-229`) = `ElkNode` for `ElkConnectableShape`. `LazyURIEncoder.encode`
(`LazyURIEncoder.java:74-80`) in index mode → `lazyResource.addLazyProxyInformation(obj, ref, node)`
(`LazyLinkingResource.java:522`) → `"|" + idx`: the call order of `installProxies` (pre-order objects, text order within
an object) — matches T3 `proxiesAtLoad` (T11: nested children's edges first). No diagnostic at load.

Proxy identity: created once at load. A successful resolution replaces the slot (`EcoreEList.resolve`,
`EcoreEList.java:158-194`, assign `:165`); a failed one leaves the same proxy and records the fragment as unresolvable
(`LazyLinkingResource.getEObject(fragment, triple)`, from `:250`); repeated access returns the same proxy, no new
diagnostic.

**(b) `edge.getSources().get(i)`.** `ElkEdgeImpl.java:195-197` → `EObjectWithInverseResolvingEList.ManyInverse`
(`hasProxies()` true, `EObjectWithInverseResolvingEList.java:84-87`; `resolve` → `EcoreEList.resolve`, `:91-93`) →
`resolveProxy` (`EcoreEList.java:203-205`) → `owner.eResolveProxy` (`BasicEObjectImpl.java:1514-1516`) →
`EcoreUtil.resolve(proxy, owner)` (`EcoreUtil.java:266-270`, body `:196-240`: `resourceSet.getEObject(uri, true)`
`:209`, on `RuntimeException` retry with `false` `:211-214`, else return the proxy `:239`) →
`LazyLinkingResource.getEObject(String)` (`:230-248`: `isCrossLinkFragment` = `startsWith("|")`
`LazyURIEncoder.java:267-269`, decode, `getEObject(fragment, triple)`): unresolvable set → null; else
`getLinkingService().getLinkedObjects(...)`; empty → `createAndAddDiagnostic` (`:369`) + null; > 1 →
`IllegalStateException`; else assignability check, `removeDiagnostic` (`:397`), return target. The diagnostic is an
`XtextLinkingDiagnostic` (`getUnresolvedProxyMessage`) added to `getErrors()`; duplicates suppressed by the
unresolvable set and by `list.contains` (`XtextLinkingDiagnostic.equals` = message + node, `XtextLinkingDiagnostic.java:65-90`,
ported at `src/xtext/linking/impl/XtextLinkingDiagnostic.ts:50`). MEDIUM: `EcoreEList.resolve` adds no inverse on the
target (`:169-180` handles containment only) → T12h records it.

**(c) `EcoreUtil2.resolveLazyCrossReferences`** (`EcoreUtil2.java:503-509`) → `LazyLinkingResource.resolveLazyCrossReferences`
(`:135-150`): `EcoreUtil.getAllContents(this, true)` pre-order (`EcoreUtil.java:1183-1196`); per potential lazy
cross-reference feature (`:224`) `doResolveLazyCrossReference` (`:170`) reads `basicGet(i)`; a proxy whose URI trims to
this resource with a cross-link fragment → `getEObject(fragment)`; success → `setUnique(i, target)` with delivery off.
MEDIUM: `setUnique` runs the inverse add → inverse state may differ from (b) (T12h).

**(d) Validation.** `ResourceValidatorImpl.validate` resolves first (`ResourceValidatorImpl.java:75`, body `:161-162` =
`resolveLazyCrossReferences`) and then collects `getErrors()`/`getWarnings()`. TS `src/xtext/validation/ResourceValidatorImpl.ts`
has `resolveProxies` as a no-op (header line 15); `collectResourceDiagnostics` at `:68`.

**(e) JSON export of an unresolved reference.** `JsonExporter.xtend:177-186` iterates `edge.sources` through `get`
(resolving); the unresolved proxy is in neither id map → null → `formatError` (`JsonAdapter.xtend:63-65`) returns, not
throws → `toJson(null)` → Gson 2.11 `JsonPrimitive(null)` message-less NPE. The resolution already added the
diagnostic; the loop stops at the first unresolved element in exporter order → `diagnosticsAfterExport` holds one. TS
`src/graph/json/JsonExporterSections.ts:111-119,124-137` iterates `getSources`/`getTargets`; unknown endpoints throw
`unknownEndpoint()` (`:103-105`), the documented message-less `IllegalArgumentException` (`docs/conformance.md`,
2026-10-14) — extended to these rows (D13).

## 2. Port surface

| Area | File (new unless noted) | Java |
|------|------|------|
| EMF | `src/emf/common/util/URI.ts` (`trimFragment`, `fragment`, `appendFragment`, `equals`, `toString`; string ops only) | `URI` |
| EMF | `src/emf/ecore/resource/{Resource,ResourceSet}.ts`, `src/emf/ecore/resource/impl/{ResourceImpl,ResourceSetImpl}.ts` (`getURI`, `getContents`, `getErrors`, `getWarnings`, `getResourceSet`, `getEObject(fragment)` base null; set `getEObject(uri, loadOnDemand)`) | `ResourceImpl.java:780`, `ResourceSetImpl.java:218` |
| EMF (existing) | `src/emf/ecore/impl/BasicEObjectImpl.ts`, `EObject.ts`, `InternalEObject.ts`: `eProxyURI`, `eSetProxyURI`, `eIsProxy`, `eResolveProxy`, `eResource()` (container walk; the `eContainer` proxy arm `:807` unreachable — say so) | `BasicEObjectImpl.java:1504-1522` |
| EMF (existing) | `src/emf/ecore/util/EcoreUtil.ts`: `resolve(proxy, resourceSet)`, `resolve(proxy, eObject)` | `EcoreUtil.java:196-270` |
| EMF (existing/new) | `src/emf/common/util/BasicEList.ts` (`basicGet`, `hasProxies`/`resolve` hooks; line 21 says proxies unported), `src/emf/ecore/util/EObjectEList.ts` (`resolveProxy`, `resolve(index, object)`), `src/emf/ecore/util/EObjectWithInverseEList.ts` (resolving `ManyInverse`, as the existing `ManyInverse` export at `:42-48`), new `src/emf/ecore/util/EObjectResolvingEList.ts` | `EcoreEList.java:158-205`, `EObjectWithInverseResolvingEList.java:61-95` |
| Xtext | `src/xtext/linking/lazy/{LazyURIEncoder,LazyLinker,LazyLinkingResource}.ts`; `OnChangeEvictingCache` → a plain field (no change notifications; documented) | `LazyURIEncoder.java:74-270`, `LazyLinker.java:90-312`, `LazyLinkingResource.java` (~560 lines; split `getEObject(fragment, triple)` for CCN) |
| Graph (existing) | `src/graph/impl/ElkEdgeImpl.ts:80-92` (`getSources`/`getTargets` resolving), `ElkConnectableShapeImpl.ts` (`outgoingEdges`/`incomingEdges` resolving) | `ElkEdgeImpl.java:195-209`, `elkgraph.ecore` |
| graph.json.text | `src/graph/json/text/linking/{ElkGraphJsonLazyLinker,ElkGraphJsonReferences}.ts`: `getProxyType` → `ElkNode`, `createProxy` builds an `ElkNodeImpl` with the proxy URI; local reference table (AD-8) | — |

Bundle check: `src/emf` imports only emf/java/guava; `src/xtext/linking/lazy` imports xtext/emf; ElkGraph classes stay
in `src/graph/json/text`; no `bundle-deps.json` change.

## 3. Risks (each checked by the named task)

1. Proxy identity stable across failed accesses (T12b/T12d tests: `get(0) === get(0)`).
2. Inverse state depends on access path (MEDIUM) — T12h records it; T12e/T13 match it.
3. `link-repeated-reference` (`sources: ["a","a"]`) resolves without error: the resolve assign path must not run a
   no-duplicates check (T12b, T13).
4. Load contract changes: load-time `errors` carry no linking diagnostics; later access appends to the live resource's
   errors; T13/T14/T17 read live errors after resolution. `.elkt` contract unchanged.
5. `eResource()` is a new surface: resolving access needs the root attached to a resource; API-built graphs have no
   proxies.
6. `installProxies` walks the node model (`CrossReference` grammar elements, leaf nodes): the T7/T11 node model is a
   port-local substitute — T12c drives proxy installation from it (or from `ParseResult.references` reordered to
   `installProxies` call order) and documents the equivalence; `proxiesAtLoad` rows enforce it.
7. Proxy class `ElkNode`: keep proxies out of identifier maps; `instanceof ElkNode` holds for them as in Java.
8. Performance: `hasProxies()` adds an `eIsProxy()` check per endpoint access on hot layout paths — benchmark before and
   after T12b/T12e.
9. Shared EMF list and `BasicEObjectImpl` changes reach all graph and layout code: full suite + 4b vectors gate them.
10. `EcoreUtil.resolve` catches `RuntimeException` twice; `LazyLinkingResource.getEObject` turns an exception into an
    `ExceptionDiagnostic` — no recorded row exercises it; unit-test from the source.
11. Browser safety: `URI` uses string operations only.
12. `ResourceValidatorImpl.validate` must resolve before collecting diagnostics (T14).
