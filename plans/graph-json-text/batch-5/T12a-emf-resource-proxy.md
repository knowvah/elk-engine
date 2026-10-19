<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12a — EMF `URI`, `Resource`/`ResourceSet`, EObject proxy surface, `EcoreUtil.resolve`

**Agent:** typescript-pro · **Commit:** `feat(T12a): port the emf uri, resource and proxy subset`

## Context
D13 (`decisions.md#d13`, `batch-5/d13-plan.md` §1(b), §2): `.elkj` links lazily; proxies resolve through
`eResolveProxy` → `EcoreUtil.resolve` → `ResourceSet.getEObject(uri, true)` → the resource's `getEObject(fragment)`.
The port has none of these (mission-2 D4, now amended by D13 for exactly these surfaces).

## Task
1. `src/emf/common/util/URI.ts`: the subset `LazyLinker`/`EcoreUtil`/`LazyLinkingResource` call (`createURI`,
   `appendFragment`, `trimFragment`, `fragment`, `hasFragment`, `equals`, `hashCode` if a map needs it, `toString`),
   string operations only (browser-safe), from EMF's `URI` Javadoc/source (EPL).
2. `src/emf/ecore/resource/{Resource,ResourceSet}.ts` (interfaces) and `src/emf/ecore/resource/impl/{ResourceImpl,
   ResourceSetImpl}.ts`: `getURI`/`setURI`, `getContents` (containment list whose elements report `eResource()`),
   `getErrors`, `getWarnings`, `getResourceSet`, `getEObject(fragment)` (base behaviour per `ResourceImpl.java`),
   `ResourceSetImpl.getResources`, `createResource`/add, `getResource(uri, loadOnDemand)` for loaded resources only (no
   loading), `getEObject(uri, loadOnDemand)` (`ResourceSetImpl.java:218`). Port only what the call chain in d13-plan §1
   reaches; list omitted members in each class doc.
3. `EObject`/`InternalEObject`/`BasicEObjectImpl`: `eResource()` (container walk to the resource holding the root),
   `eProxyURI`, `eSetProxyURI`, `eIsProxy`, `eResolveProxy` (`BasicEObjectImpl.java:1504-1522`); the `eContainer` proxy
   arm (`:807`) is unreachable for ElkGraph (containment is never proxied) — say so in the doc.
4. `EcoreUtil.resolve(proxy, resourceSet)` and `resolve(proxy, eObject)` (`EcoreUtil.java:196-270`), both
   `RuntimeException` catches included.
5. Tests from the EMF source (AD-13): URI round trips, `getEObject` on a set with/without the resource, `resolve`
   returning the target / the proxy itself, `eResource()` through containers, exception paths.

## Write-set
`src/emf/common/util/URI.ts`, `src/emf/ecore/resource/**`, `src/emf/ecore/{EObject,InternalEObject}.ts`,
`src/emf/ecore/impl/BasicEObjectImpl.ts`, `src/emf/ecore/util/EcoreUtil.ts` (+ colocated tests).

## Interface contracts (outputs)
`InternalEObject.eSetProxyURI(uri)`, `eProxyURI()`, `eIsProxy()`, `eResolveProxy(proxy)`, `EObject.eResource()`;
`Resource`/`ResourceImpl` (subclassable: `getEObject(fragment)` is the override point for `LazyLinkingResource`);
`EcoreUtil.resolve`. Consumed by T12b, T12c, T12d, T12f, T13.

## Acceptance criteria
- Given a proxy whose URI names a fragment the resource resolves, when `EcoreUtil.resolve` runs, then the target is
  returned; given an unresolvable one, then the proxy itself.
- Given an object nested in a root held by a resource, when `eResource()` runs, then that resource.
- Given the full suite and the 4b vectors, when run, then unchanged (no proxies exist outside `.elkj`).
