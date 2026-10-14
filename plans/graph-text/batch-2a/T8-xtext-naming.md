<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Xtext `QualifiedName`, qualified-name provider core, resource scope cache

**Agent:** typescript-pro · **Commit:** `feat(T8): port xtext qualified names and declarative name provider`

## Context
Cross references in `.elkt` (`edge a -> b.p`) are resolved by qualified name. T13 builds
`ElkGraphQualifiedNameConverter` on `QualifiedName`; T14's scoping (`ImportedNamespaceAwareLocalScopeProvider`,
`Scopes`) and T17's `ElkGraphQualifiedNameProvider` build on `IQualifiedNameProvider` /
`DefaultDeclarativeQualifiedNameProvider`; the writer (T19) asks the same provider for the text of a
reference. File layout: the mapping rule fixed in [T7](T7-xtext-converters.md) (`org.eclipse.xtext.naming.X`
-> `src/xtext/naming/X.ts`, nested `Outer.Inner` -> `Outer.Inner.ts`). Sources: `XT` as in T7; `XU` =
`org.eclipse.xtext.util.source` jar (T7).

## Task
1. `naming/QualifiedName.ts` (XT `naming/QualifiedName.java`): `EMPTY` 44-80 (overrides of `append`,
   `toLowerCase`, `toUpperCase`, `toString(String)` at 46-70), `create(String...)` 112-126,
   `create(List)` 208-224, `create(String)` 235-238 (null segment -> `IllegalArgumentException("Segment
   cannot be null")` — this error is load-bearing, see step 4), constructor 257-263 (`hash =
   Arrays.hashCode(segments)`: element hash `JavaString.hashCode`, combine `31*h + e` with `Int32`
   ops), `isEmpty`, `getSegments`, `getSegmentCount`, `getSegment`, `getLastSegment`, `getFirstSegment`
   265-287, `append(String)` 289-297, `append(QualifiedName)` 299-306, `skipFirst` 308-322, `skipLast`
   324-338, `toLowerCase` 340-357 + the lower-case subclass 359-376 (reached: the scope's
   `MultimapBasedSelectable` keys by `name.toLowerCase()`, T14), `toUpperCase` 389-397, `equals`/`hashCode`
   399-424 (hash compared first; value equality for map keys: translation-rules 6.1, implement
   `equals(obj: unknown)` + `hashCode()` and use `JavaHashMap`/`JavaObjects` where used as keys),
   `equalsIgnoreCase` 426-451, `compareTo`/`compareToIgnoreCase` 453-478, `startsWith` 480-512,
   `toString()` 514-516 and `toString(delimiter)` 524-538 (switch on 0/1/n segments), `wrapper` 245-255
   (`Scopes.scopeFor` in T14 uses it). Not ported (no caller): `Builder` 82-110, interning
   (`USE_INTERNING`, `intern`: behaviourally the identity), stream (de)serialisation 147-206.
2. `naming/IQualifiedNameConverter.ts` (XT 14-73): the interface only (`toString`, `toQualifiedName`).
   `IQualifiedNameConverter.DefaultImpl` is **not reached**: `ElkGraphRuntimeModule.xtend:38-40` binds
   `ElkGraphQualifiedNameConverter` (T13); the default is only the field initialiser of
   `DefaultDeclarativeQualifiedNameProvider` that Guice overrides. Journal this.
3. `naming/IQualifiedNameProvider.ts` (XT 36 lines: `getFullyQualifiedName(EObject)`;
   `IQualifiedNameProvider.AbstractImpl` is the base `DefaultDeclarativeQualifiedNameProvider` extends —
   read the file for its members and port what the subclass uses).
4. `naming/DefaultDeclarativeQualifiedNameProvider.ts` (XT 131 lines): `getFullyQualifiedName` ->
   `getOrComputeFullyQualifiedName` (cache key `(obj, "fqn")`, resource = `obj.eResource()`),
   `computeFullyQualifiedName` (dispatcher result first; `null` -> name attribute),
   `computeFullyQualifiedNameFromNameAttribute` (the `while (obj.eContainer() != null)` loop with the
   `parentsQualifiedName != null` test). **Replacement of `PolymorphicDispatcher`** (XU
   `PolymorphicDispatcher.java:30-340`): the dispatcher selects, among methods named `qualifiedName`
   with one parameter on the provider instance, the most specific one for the runtime class
   (`compare` 220-248: parameter assignability, then declaring class) and **swallows every exception of the
   invoked method** (`NullErrorHandler.handle` 53-56 returns `null`; `invoke` 285-312 routes
   `InvocationTargetException` of non-`Error` throwables to it). In TS the provider exposes an overridable
   `protected qualifiedName(obj: EObject): QualifiedName | null` whose default returns `null` (Java's
   `qualifiedName(Object)` at the end of the class), and `computeFullyQualifiedName` wraps the call as
   `try { ... } catch (e) { result = null }` for `Error`s that are not JS engine faults — i.e. exactly
   the Java behaviour. This is a **type-guard dispatch**, the TS form of Xtend's `dispatch`/Xtext's
   reflective dispatch; `docs/translation-rules.md` section 8 has no `dispatch` row (it covers
   `graph.json` only) — add the row `qualifiedName(ElkGraphElement)` / `qualifiedName(ElkEdgeSection)` ->
   guarded `instanceof` chain, most specific first, in T24. The observable consequence T17 must keep:
   `QualifiedName.create(null)` throws, the dispatcher swallows it, so an element **without an
   identifier has no qualified name** and the name-attribute fallback applies.
   The name-attribute resolver (`SimpleAttributeResolver.newResolver(String.class, "name")`, XU
   `SimpleAttributeResolver.java:40-75`) looks up the EClass feature `name`; ElkGraph has none
   (`../elk/plugins/org.eclipse.elk.graph/model/elkgraph.ecore`: `grep 'name="name"'` is empty; the
   naming attribute is `identifier`), so the TS resolver is `(obj) => null`, stated in a comment with that
   grep as the evidence. The injected `converter` field is a constructor parameter.
5. `util/IResourceScopeCache.ts` (XU 40 lines) and `util/ResourceScopeCache.ts`: the Java default is
   `OnChangeEvictingCache` (XU 384 lines, evicts on any model change). The port is a per-resource
   `Map` keyed by `(key)`; eviction is dropped because no mutation in the `.elkt` flow changes
   identifiers, containment or descriptions (validator check `checkPropertyValue` rewrites
   `entry.value` only) — state this as the invariant in the class comment. API: `get(key, resource,
   provider)`, `clear(resource)`; keys compare by `JavaObjects.equals`/`Tuples.pair` equivalent (a
   two-element array joined by identity of the EObject plus string tag). Phase 4 budget: lookups are
   O(1) amortised.

## Write-set
`src/xtext/naming/**`, `src/xtext/util/IResourceScopeCache.ts`, `src/xtext/util/ResourceScopeCache.ts`
(`src/xtext/util/**` other than T7's two files belongs to T8; colocated `*.test.ts` implicit).

## Read-set
- XT `naming/{QualifiedName.java:31-539,IQualifiedNameConverter.java,IQualifiedNameProvider.java,DefaultDeclarativeQualifiedNameProvider.java:30-131}`
- XU `PolymorphicDispatcher.java:30-340`, `SimpleAttributeResolver.java:28-133`, `IResourceScopeCache.java`,
  `OnChangeEvictingCache.java` (to state the dropped eviction)
- `../elk/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/naming/ElkGraphQualifiedNameProvider.xtend:25-44`
- `../elk/plugins/org.eclipse.elk.graph/model/elkgraph.ecore` (no `name` feature)
- `src/java/lang/JavaString.ts`, `src/java/util/JavaObjects.ts`, `src/emf/ecore/EObject.ts`, `docs/translation-rules.md` 6.1, 6.5, 6.6

## Decisions
- [G1](../decisions.md#g1--writer-architecture) (cross-reference text comes from the scope/provider)
- [G5](../decisions.md#g5--diagnostic-fidelity) · AD-10 · mission-2 D4 (`eClass().getName()` only)

## Interface contract
Produced for T13/T14/T16/T17/T19: `QualifiedName` (value type with `equals/hashCode`), `IQualifiedNameConverter`,
`IQualifiedNameProvider.getFullyQualifiedName(obj): QualifiedName | null`,
`DefaultDeclarativeQualifiedNameProvider` (T17 subclasses it and overrides `qualifiedName`),
`IResourceScopeCache`. `EObject` is the `src/emf/ecore/EObject.ts` surface (D4: no `eResource()`).
**Resource handle rule (locked here, reused by T14/T16/T19):** the Java `obj.eResource()` is
`EcoreUtil.getRootContainer(obj)` (`src/emf/ecore/util/EcoreUtil.ts`), because every `.elkt` resource has
exactly one root content object (G2: the writer's `EcoreUtil.copy` root is likewise its own resource).

## Acceptance criteria
- Given `QualifiedName` operations, when unit-tested from the Java source, then `create(["a","b"]).append("c")
  .toString(".")` is `a.b.c`, `skipFirst`/`skipLast` throw `IllegalArgumentException` with the source message
  for out-of-range counts, `create(["A","b"]).toLowerCase()` equals `create(["a","b"])` with equal hash,
  `startsWith` with a longer prefix is `false`.
- Given a subclass whose `qualifiedName(obj)` throws for an object, when `getFullyQualifiedName` runs, then
  the result is the name-attribute fallback (`null` here) and nothing propagates.
- Given a three-level container chain where the middle object's name is `null`, then the result is the
  parent-qualified name skipping the unnamed level (the `while` loop).

## Quality bar
README gates; TDD from the Java source; `npm run complexity` clean; `QualifiedName` instances immutable.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No Guava/OpenJDK source. Do not port `QualifiedNameInterning`, `SimpleNameProvider`, copy-name services.
Do not edit T7 files. The agent does not commit; the orchestrator commits per task.
