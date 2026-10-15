<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — elkgraph-model (locked 2026-10-12)

All approved by the user during planning. They amend, never rewrite,
`plans/elk-engine-skeleton/decisions.md` (AD-1…AD-15), `plans/conformance-corpus/decisions.md`
and `plans/java-foundations/decisions.md` (M1–M8).

| ID | Decision |
|----|----------|
| D1 | Minimal EMF runtime under `src/emf/`; EMF source (EPL-2.0) may be read |
| D2 | EList/EMap contract: unique, live, inverse-syncing, containment-moving, in-place `put` |
| D3 | Keep Java's interface/impl split; type guards for interface `instanceof` |
| D4 | EObject surface: `eContainer`, `eContents`, `eAllContents`, `eClass().getName()` only |
| D5 | Id-keyed property maps; `getAllProperties()` returns `PropertyMap` |
| D6 | `isCloneable` + constructor-keyed `ElkReflect`; `PropertyTest` registers cloners itself |
| D7 | Enums per translation-rules §6.3; `EnumSet` shim; annotations become registries |
| D8 | `src/java/util/LinkedList.ts`; `KVectorChain` extends it |
| D9 | `tools/vectors/GraphVectors.java` → `graph.json`, written before the implementation |
| D10 | Identity-hash `toString`s drop the hash; NPE → `TypeError`; `IllegalStateException` joins M5 |

## D1 — EMF runtime

`src/emf/<emf package>/<JavaClass>.ts` mirrors the EMF class names (`@see org.eclipse.emf.…`).
Surface: only what D2/D4 list. EMF 2.37 is EPL-2.0 (`about.html` in the source jar), so its
source under `~/.m2/repository/p2/osgi/bundle/org.eclipse.emf.*.source/` **may be read and
ported** — unlike OpenJDK (AD-9). Boundary (fitness test, same pattern as M6 for `src/guava`):
`src/emf` imports only `src/java` and `src/guava`; every bundle directory and `src/index.ts` may
import `src/emf`; `src/java` and `src/guava` never import `src/emf`.

## D2 — EList and EMap contract

`EList<E>` is Java-List-shaped: `get`, `set`, `add(e)`, `add(i, e)`, `addAll`, `remove(e)`,
`remove(i)`, `clear`, `size`, `isEmpty`, `contains`, `indexOf`, `iterator`, `listIterator(i?)`,
`move(newIndex, oldIndex | element)`, `toArray`, `[Symbol.iterator]`. Unique: `add` of a present
element returns `false` (`AbstractEList.add`); `set` to a present element throws
`IllegalArgumentException` with EMF's message. Inverse lists (`sources`↔`outgoingEdges`,
`targets`↔`incomingEdges`, `outgoingSections`↔`incomingSections`) append to / remove from the
opposite list. Containment lists (`labels`, `ports`, `children`, `containedEdges`, `sections`,
`bendPoints`) additionally remove the element from its previous container, then set the
container; a recursive containment throws `IllegalArgumentException("Recursive containment not
allowed for " + toString())` (`EcoreUtil.isAncestor`). `move` keeps containment (what
`ECollections.sort` uses). `EcoreEMap`: entry list in insertion order, lookup by key equality
(`IProperty` id), `put` on an existing key replaces the value in place, `removeKey` then `put`
appends. Every clause is proven by `graph.json` (D9).

## D3 — Interfaces and implementations

`src/graph/ElkNode.ts` is the interface, `src/graph/impl/ElkNodeImpl.ts` the class (same for every
element, `EMapPropertyHolder`, `ElkGraphFactory`/`ElkGraphFactoryImpl` with `eINSTANCE`). Java's
`instanceof <interface>` becomes exported type guards (`isElkNode(o)`, …) implemented as
`instanceof` on the impl classes (translation-rules §6.6); mission 8c extends them for
`GridElkNode`. Constructors are public in TS (Java's `protected` + same-package factory has no
equivalent) — journaled, not a contract. `ElkGraphPackage` is ported as **constants only**
(feature ids and class names) so the impl `switch` bodies stay 1:1; the metamodel is not.

## D4 — EObject surface

`eContainer()`, `eContents()` (containment features in ecore declaration order: `properties`,
`labels`, then `ports`, `children`, `containedEdges` / `sections` / `bendPoints`),
`eAllContents()` (depth-first pre-order), `eClass().getName()`. Internal: `eInternalContainer`,
`eContainerFeatureID`, `eBasicSetContainer`, `eInverseAdd`, `eInverseRemove`,
`eBasicRemoveFromContainer`. Not ported: notifications, adapters, `eGet/eSet/eUnset/eIsSet`,
proxies, resources (`eIsSet` returns with mission 4b).

## D5 — Property maps

`IProperty` equality is by id. `MapPropertyHolder.propertyMap` (collections V1) is a
`JavaHashMap` with `PROPERTY: HashStrategy<IProperty<unknown>>` (`hash` =
`JavaString.hashCode(id)`, `equals` by id, `compare` by id — `Property implements
Comparable<IProperty>`). `EMapPropertyHolderImpl.properties` is an `EcoreEMap` keyed the same way.
`getAllProperties()` returns `PropertyMap` (`get`, `containsKey`, `isEmpty`, `size`, iterable
`[IProperty<unknown>, unknown]` entries), satisfied by both containers; `copyProperties` iterates it.

## D6 — Cloneable and ElkReflect

`isCloneable(v)`: `Array`, `Set`, `Map`, `EnumSet`, or a non-null object with a `clone()` method.
`ElkReflect` registries are keyed by constructor function (`v.constructor`); `EnumSet` is matched
by `instanceof` as in Java; unknown → `null` → `Property.getDefault` throws
`IllegalStateException` (message as in `Property.java:134-139`). Java registers the built-in
cloners in `LayoutMetaDataService.java:125-156` (mission 5); until then the ported `PropertyTest`
registers them in `beforeAll`, mirroring those lines — a temporary seam, journaled.

## D7 — Enums, EnumSet, annotations

Enums per translation-rules §6.3: class with `static readonly` instances in declaration order,
`ordinal()`, `name()`, `values()`, `valueOf`, `compareTo`, `toString()` = name. `EnumSet` shim
from the Javadoc only (ordinal iteration order; `allOf(enumClass)`, `noneOf`, `of(...)`, `copyOf`,
`clone`, `add/remove/contains/size/isEmpty/equals`) — no vector (deterministic by spec).
`@AdvancedPropertyValue` / `@ExperimentalPropertyValue` become registries in the two annotation
files (`markAdvanced(constant)`, `isAdvanced(constant)` …), called from the enum's static block;
`ElkGraphUtil.isAdvancedPropertyValue` consults them.

## D8 — LinkedList

`src/java/util/LinkedList.ts` (array-backed, Java names, bidirectional `ListIterator` in
`src/java/util/ListIterator.ts`) from the Javadoc; `KVectorChain extends LinkedList<KVector>`.
ELK calls `addFirst` (14 sites), `getLast` (23), `getFirst` (11), `listIterator` (6),
`removeFirst/Last`.

## D9 — JVM vectors for the model

`tools/vectors/GraphVectors.java` (separate file; never `JavaVectors.java`, M4) plus the wrapper
`tools/vectors/graph-vectors.sh` run scripted scenarios against the oracle's
`org.eclipse.elk.graph` jar + EMF + Guava from the p2 cache, writing
`test/golden/refs/java/graph.json`: after every step, each element's lists by id, container id,
`eAllContents` id order, property key order, deterministic `toString()`s, thrown class + message,
and `ElkGraphUtil` / `GraphIdentifierGenerator` results. Byte-identical on rerun. Batch 1, before
any model code; append-only afterwards.

## D10 — Divergences accepted up front

- `ElkShapeImpl`, `ElkEdgeSectionImpl`, `ElkBendPointImpl`, `ElkGraphElementImpl` `toString()` =
  Java FQ class name without the `@identityHash`, then the EMF suffix. Text only; known divergence.
- `Objects.requireNonNull` / `new NullPointerException(msg)` → `TypeError(msg)` (M5: NPE out of
  scope); `ElkGraphUtil.test.ts` asserts `TypeError`.
- **M5 amendment:** `src/java/lang/IllegalStateException.ts` (`extends Error`, name
  `IllegalStateException`).
- `GraphIdentifierGenerator.assertUnique` keeps the unseeded `new Random()`; its test checks the
  `/_g\d{4}$/` shape and uniqueness only.

## Baseline note

`main` at `be4ddbd` (docs-site merged). Gates green at planning time are recorded in
`decision-journal.md` by the Phase 8 pre-flight.

**Amendment (2026-10-15, user decision):** D10's NPE → `TypeError` stands and is the model for JVM-raised
exceptions nothing catches (AD-16b, `plans/elk-engine-skeleton/decisions.md`); the M5 classes it amends now
sit under `RuntimeException` (AD-16a).
