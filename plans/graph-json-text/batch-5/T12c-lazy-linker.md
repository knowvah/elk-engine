<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12c — `LazyURIEncoder`, `LazyLinker`

**Agent:** typescript-pro · **Commit:** `feat(T12c): port xtext's lazy uri encoder and lazy linker`

## Context
D13, `batch-5/d13-plan.md` §1(a), §2: `LazyLinker.doLinkModel` clears references, then `installProxies` in pre-order
over linkable contents; per cross-reference node a proxy (class from `getProxyType` → `findInstantiableCompatible`) with
URI `resource.getURI().appendFragment(encoder.encode(obj, eRef, node))`, set with `addUnique`/`eSet`.
`LazyURIEncoder` index mode (`USE_INDEXED_FRAGMENTS_BINDING` = true): `encode` →
`lazyResource.addLazyProxyInformation(obj, ref, node)` → `"|" + idx`; `decode`, `getIndex`, `isCrossLinkFragment`
(`startsWith("|")`), plus the long-form `encode`/`decode`/`getRelativePath`/`getNode`/`resolveShortFragment` (ported per
the omission rule: every branch except `OPTION_RESOLVE_ALL` and the eager-linking flag).

## Task
1. `src/xtext/linking/lazy/LazyURIEncoder.ts` (`LazyURIEncoder.java:74-270`).
2. `src/xtext/linking/lazy/LazyLinker.ts` (`LazyLinker.java:90-312`) on the existing `AbstractCleaningLinker`
   (`src/xtext/linking/impl/`): `doLinkModel`, `clearReferences`, `installProxies` (both branches; `installQueuedLinks`
   kept), `createAndSetProxy`, `createProxy`, `getProxyType`, `findInstantiableCompatible`,
   `globalFindInstantiableCompatible` (EPackage-registry fallback: throw as Java does when nothing is found; the
   graph.json.text subclass in T12f overrides `getProxyType`/`createProxy`, so `src/xtext` never imports `src/graph`).
   The resource it needs is an interface (`addLazyProxyInformation`, `getURI`, `getEncoder`…) that T12d's
   `LazyLinkingResource` implements — define it here (`src/xtext/linking/lazy/`), named as Xtext names the role, or as a
   port-local interface if Xtext has none (document).
3. Node-model walk (d13-plan risk 6): Xtext walks `INode` children for `CrossReference` grammar elements; the port's
   node model (`src/xtext/parser/ParseRecords.ts`, `ReferenceNode`, T7/T11) is a port-local substitute. Drive
   `installProxies` from it so the call order equals Xtext's (pre-order objects, then text order within an object) and
   document the equivalence; `proxiesAtLoad` of `graph-json-text-parse.json` is the proof (T12f/T13 replay; here unit
   tests with a hand-built record set).
4. Tests from the Xtext source: fragment encoding/decoding round trip, index order, `isCrossLinkFragment`,
   `findInstantiableCompatible` choice (first instantiable subtype in declaration order), `addUnique` vs `eSet`.

## Write-set
`src/xtext/linking/lazy/{LazyURIEncoder,LazyLinker}.ts` (+ any port-local interface file under
`src/xtext/linking/lazy/`, + colocated tests).

## Interface contracts (outputs)
`LazyLinker` (subclassable: `getProxyType`, `createProxy`), `LazyURIEncoder`, the resource-side interface. Consumed by
T12d, T12f.

## Acceptance criteria
- Given objects with cross-reference nodes, when `linkModel` runs, then proxies are installed in pre-order/text order
  with fragments `|0…|n` and no diagnostic is produced.
- Given a fragment, when decoded, then the triple (object, reference, node) recorded at encode time is returned.
- Given the fitness tests, when run, then `src/xtext/linking/lazy` imports only `src/xtext`, `src/emf`, `src/java`,
  `src/guava`.
