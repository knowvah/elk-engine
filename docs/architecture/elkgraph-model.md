<!-- SPDX-License-Identifier: EPL-2.0 -->

# ElkGraph model and EMF runtime

How `org.eclipse.elk.graph` (EMF-generated in Java) became `src/graph/` and `src/emf/` (plain
classes, AD-11). This page holds the detail that the 500-line cap dropped from
[translation-rules.md §5](../translation-rules.md) when mission 2 closed; the decisions it cites
(D1–D10) are `plans/elkgraph-model/decisions.md`, and every deviation below is journaled in
`plans/elkgraph-model/decision-journal.md`. Package-level status is in the
[port map](port-map.md) (`graph`, `graph.impl`, `graph.properties`, `graph.util` rows).

| Section                                                | Answers                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| [1. Inventory](#inventory)                             | Which files exist and what EMF class each stands for            |
| [2. EMF runtime surface](#emf-runtime-surface)         | What of EMF is ported, folded, or left out                      |
| [3. List and map contract](#list-and-map-contract)     | Uniqueness, inverses, containment moves, recursion, `EcoreEMap` |
| [4. Exceptions and messages](#exceptions-and-messages) | The exact EMF and HotSpot texts the vectors pin                 |
| [5. Model classes](#model-classes)                     | Interface/impl split, type guards, package constants, factory   |
| [6. Property system](#property-system)                 | Id-keyed maps, defaults and cloning, `ElkReflect`, annotations  |
| [7. Utilities](#utilities)                             | `ElkGraphUtil` and `GraphIdentifierGenerator` deviations        |
| [8. JVM vectors](#jvm-vectors)                         | `graph.json`: what it records and how to regenerate it          |
| [9. EMF outside `graph`](#emf-outside-graph)           | The other ELK bundles that touch EMF, for later missions        |

## 1. Inventory {#inventory}

### `src/emf/` (D1, 14 files, 1,214 lines)

A minimal EMF runtime. EMF 2.37 is EPL-2.0 (`about.html` in the source jar), so unlike OpenJDK
(AD-9) its source **may be read and ported**; the p2 cache holds `org.eclipse.emf.common.source`
2.31.0 and `org.eclipse.emf.ecore.source` 2.37.0. Paths and class names mirror EMF; every file
carries `@see org.eclipse.emf.…`. Fitness (same pattern as `src/guava`): `src/emf` imports only
`src/java` and `src/guava`; bundle directories and `src/index.ts` may import `src/emf`; `src/java`
and `src/guava` never do.

| File                                               | Stands for                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `common/util/EList.ts`                             | `EList` interface, Java-List-shaped (D2)                                                        |
| `common/util/BasicEList.ts`                        | `BasicEList` with `AbstractEList` folded in; `grow`, `did*` hooks, `EListIterator`              |
| `common/util/BasicIndexOutOfBoundsException.ts`    | `AbstractEList.BasicIndexOutOfBoundsException` (`index=i, size=n`)                              |
| `common/util/ECollections.ts`                      | `indexOf`, `sort` (the `ECollections.sort` ELK calls; `move` keeps containment)                 |
| `ecore/EObject.ts`, `ecore/InternalEObject.ts`     | The D4 surface and its internal half                                                            |
| `ecore/EClass.ts`                                  | `{ getName() }` stand-in; what `eClass().getName()` returns                                     |
| `ecore/impl/BasicEObjectImpl.ts`                   | Container bookkeeping; `eInverseAdd`/`eInverseRemove` with EMF's negative-feature-id branch     |
| `ecore/util/EObjectEList.ts`                       | `EObjectEList` with `NotifyingListImpl` and `EcoreEList` folded in                              |
| `ecore/util/EObjectWithInverseEList.ts`            | Inverse lists; `ManyInverse` has an empty body (the `eGet` shortcut is not ported)              |
| `ecore/util/EObjectContainmentEList.ts`            | Containment without opposite (bend points, map entries)                                         |
| `ecore/util/EObjectContainmentWithInverseEList.ts` | Containment with opposite (`labels`, `ports`, `children`, `containedEdges`, `sections`)         |
| `ecore/util/EcoreEMap.ts`                          | Entry-list map over a `DelegateEObjectContainmentEList`; `newEntry(k, v)` supplied by the owner |
| `ecore/util/EcoreUtil.ts`                          | `isAncestor`, `getRootContainer` only                                                           |

### `src/graph/` (37 files, 4,559 lines)

| Directory     | Files                                                                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph/`      | Interfaces `ElkGraphElement`, `ElkShape`, `ElkConnectableShape`, `ElkNode`, `ElkPort`, `ElkLabel`, `ElkEdge`, `ElkEdgeSection`, `ElkBendPoint`, `EMapPropertyHolder`; `ElkGraphFactory`; `ElkGraphPackage` |
| `impl/`       | One `*Impl` per interface plus `ElkPropertyToValueMapEntryImpl` and `ElkGraphFactoryImpl`                                                                                                                  |
| `properties/` | `IProperty`, `Property`, `IPropertyHolder`, `IPropertyValueProxy`, `MapPropertyHolder`, `PropertyMap`, `PropertyHolderComparator`, `GraphFeature`, `AdvancedPropertyValue`, `ExperimentalPropertyValue`    |
| `util/`       | `ElkGraphUtil`, `ElkReflect`, `GraphIdentifierGenerator`                                                                                                                                                   |

Not ported: `ElkGraphPackageImpl` (metamodel registry), `ElkGraphAdapterFactory`, `ElkGraphSwitch`
(EMF adapter and visitor plumbing; the identifier generator uses a guard chain instead).

## 2. EMF runtime surface {#emf-runtime-surface}

- **Ported (D4):** `eContainer()`, `eContents()` (containment features in ecore declaration order:
  `properties`, `labels`, then `ports`, `children`, `containedEdges` / `sections` / `bendPoints`),
  `eAllContents()` (depth-first pre-order), `eClass().getName()`. Internal: `eInternalContainer`,
  `eContainerFeatureID`, `eBasicSetContainer`, `eInverseAdd`, `eInverseRemove`,
  `eBasicRemoveFromContainer`.
- **Not ported:** notifications (`eNotify`), adapters (`eAdapters`), `eGet/eSet/eUnset/eIsSet`,
  proxies (`ElkEdgeSectionImpl` drops its `eIsProxy` resolution), resources, the dynamic
  `eGet`-based delegate in `eInverseAdd/eInverseRemove`. `eIsSet` returns with the JSON exporter
  (mission 4b). In Java `eContainer()` reads at `core/src/.../util/ElkUtil.java:1154`; here it is the
  same accessor, next to the `getParent`/`getContainingNode` the generated code uses.
- **Folded classes:** `AbstractEList` into `BasicEList`; `NotifyingListImpl` and `EcoreEList` into
  `EObjectEList`; `MinimalEObjectImpl` not ported, so `eClass() = eStaticClass()` lives in the three
  roots (`ElkGraphElementImpl`, `ElkEdgeSectionImpl`, `ElkBendPointImpl`). `hasNavigableInverse`
  branches are split by override.
- `BasicEObjectImpl.eInverseAdd/eInverseRemove` port EMF's negative-feature-id branch
  (`eBasicRemoveFromContainer` then `eBasicSetContainer(otherEnd, id)` or `(null, id)`) and throw
  `UnsupportedOperationException` for an unhandled id ≥ 0, so generated impls end their `switch`
  with `default: super.eInverseAdd(...)` as in Java, and opposite-less containment needs no
  element-side code. `eBasicRemoveFromContainerFeature` throws the same in the three roots (the
  metamodel-driven base is not ported; unreachable for negative container ids).
- `eContents()` is a snapshot; `eDerived`/`eBaseStructuralFeatureID` are the identity; element
  equality in lists is `===` (ELK's elements use identity `equals`); `listIterator` is EMF's
  `EListIterator`, so mutations go through the list.
- `grow` is ported verbatim: `old + old/2 + 4`, so capacities run 4 → 10 → 19. It runs **before** a
  failing `arraycopy`, so a failed `addAt(-k, e)` still enlarges the backing array and later
  messages report the larger capacity. Byte-exact replays depend on this.

## 3. List and map contract {#list-and-map-contract}

Every clause is proven by `graph.json` (section 8); the vectors are the proof D2 names.

- `EList<E>`: `get`, `set`, `add(e)`, `add(i, e)`, `addAll`, `remove(e)`, `remove(i)`, `clear`,
  `size`, `isEmpty`, `contains`, `indexOf`, `iterator`, `listIterator(i?)`,
  `move(newIndex, oldIndex | element)`, `toArray`, `[Symbol.iterator]`.
- **Unique:** `add` of a present element returns `false` (`AbstractEList.add`); `set` or `add(int)`
  of a present element throws `IllegalArgumentException` with EMF's message (`set` to the same
  element at the same index is allowed). The lists are **live**: snapshot before mutating while
  iterating (`alg.radial/src/.../RadialUtil.java:56` does).
- **Inverse lists** keep both ends in sync: `sources` ↔ `outgoingEdges`, `targets` ↔
  `incomingEdges`, `outgoingSections` ↔ `incomingSections`. In Java `edge.getSources()` is an
  `EObjectWithInverseResolvingEList.ManyInverse` (`graph/src/.../impl/ElkEdgeImpl.java:197`).
- **Containment lists** (`labels`, `ports`, `children`, `containedEdges`, `sections`, `bendPoints`)
  additionally remove the element from its previous container, then set the container
  (`ElkNodeImpl.getChildren()` is an `EObjectContainmentWithInverseEList`,
  `graph/src/.../impl/ElkNodeImpl.java:136`; `setParent` first removes from the old container, then
  inverse-adds, `graph/src/.../impl/ElkPortImpl.java:97-99`). `move` keeps containment, which is what
  `ECollections.sort` relies on. Edge containment is separate from endpoints: `containedEdges`
  (`ElkNodeImpl.java:189`) is set through `ElkGraphUtil.updateContainment` /
  `findBestEdgeContainment` (`graph/src/.../util/ElkGraphUtil.java:316`, `:334`).
- **Recursive containment (D2 amendment).** Only the generated container setters check it:
  `ElkNodeImpl.setParent`, `ElkPortImpl.setParent`, `ElkLabelImpl.setParent`,
  `ElkEdgeImpl.setContainingNode`, `ElkEdgeSectionImpl.setParent`
  (`graph/src/.../impl/ElkPortImpl.java:93`, `ElkEdgeImpl.java:176`, `ElkLabelImpl.java:114`,
  `ElkEdgeSectionImpl.java:356`) throw `IllegalArgumentException("Recursive containment not allowed
for " + toString())` via `EcoreUtil.isAncestor`. A containment-list `add` of an ancestor returns
  `true` and builds a cycle; afterwards `eAllContents()` never terminates (the first generator run
  died with `OutOfMemoryError`) and `elementLabeledBy`, `containingGraph`, `isDescendant`,
  `findBestEdgeContainment` loop forever. A later `setParent(node, outside)` breaks the cycle without
  throwing. The port adds no check to the lists and no cycle guard to `eAllContents`; `graph.json`
  records such a walk as `allContents: null`. An edge can never be in a cycle (it cannot contain a
  node).
- `EcoreEMap`: entry list in insertion order; lookup by key equality (`IProperty` id); `put` on a
  present key is `entry.setValue` in place; `removeKey` then `put` appends. The entries are contained
  EObjects (`ElkPropertyToValueMapEntryImpl`) created by the owner's `newEntry(k, v)`
  (`ElkGraphFactoryImpl.createElkPropertyToValueMapEntry()` is `new ElkPropertyToValueMapEntryImpl()`),
  exposed through `entryList()` for `eContainmentFeatures()`.

## 4. Exceptions and messages {#exceptions-and-messages}

Pinned by the `list-index-errors` scenario (section 8). No failed index operation changes state.
`N` is the backing-array capacity after `grow`, not the size.

| Operation                                          | Java class, as thrown here       | Message                                                                                               |
| -------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `set`/`add(int)` of a present element              | `IllegalArgumentException`       | `The 'no duplicates' constraint is violated`                                                          |
| `add(null)`                                        | `IllegalArgumentException`       | `The 'no null' constraint is violated`                                                                |
| `remove(int)`/`add(int)` past the size             | `BasicIndexOutOfBoundsException` | `index=5, size=2`                                                                                     |
| `move(int, int)` out of range                      | `IndexOutOfBoundsException`      | `targetIndex=4, size=4` / `sourceIndex=4, size=4`                                                     |
| `add(-1, e)` (reaches the JVM)                     | `ArrayIndexOutOfBoundsException` | `arraycopy: source index -1 out of bounds for object array[N]`                                        |
| `remove(-1)`, `move(0, -1)`, `move(i, absent)`     | `ArrayIndexOutOfBoundsException` | `Index -1 out of bounds for length N`                                                                 |
| negative `arraycopy` length                        | `ArrayIndexOutOfBoundsException` | `arraycopy: length n is negative`                                                                     |
| `data == null` (HotSpot NPE)                       | `TypeError` (D10)                | `Cannot load from object array because "this.data" is null`                                           |
| iterator `remove()` without `next()`               | `IllegalStateException`          | (none)                                                                                                |
| recursive containment through a setter             | `IllegalArgumentException`       | `Recursive containment not allowed for <toString()>`                                                  |
| `EcoreUtil.getRootContainer` on a cycle            | `IllegalStateException`          | `There is a cycle in the containment hierarchy of <toString()>`                                       |
| `ElkGraphFactory.eINSTANCE` before load            | `IllegalStateException`          | `ElkGraphFactory.eINSTANCE is not set: load ElkGraphFactoryImpl first`                                |
| `Property.getDefault` of an unregistered cloneable | `IllegalStateException`          | `Couldn't clone property '<id>'. Make sure its type is registered with the ElkReflect utility class.` |
| `GraphFeature.valueOf` unknown name                | `IllegalArgumentException`       | `No enum constant org.eclipse.elk.graph.properties.GraphFeature.<name>`                               |

Only the two `arraycopy` failures EMF's call sites can reach are checked (negative source index,
negative length). `Objects.requireNonNull` and `new NullPointerException(msg)` become
`TypeError(msg)` throughout (D10; NPE is outside M5), e.g. `connectableShape cannot be null` in
`ElkGraphUtil`. A latent ELK bug to keep: `FixedLayoutProvider.java:174-177` calls
`sections.remove()` with no preceding `next()`, which throws `IllegalStateException` with EMF's
iterator whenever an edge has more than one section.

## 5. Model classes {#model-classes}

- **Interface/impl split (D3).** `src/graph/ElkNode.ts` is the interface, `src/graph/impl/ElkNodeImpl.ts`
  the class, with Java accessor names. Interfaces extend `InternalEObject` because the EMF lists need
  it and generated code casts unconditionally. Constructors are public (Java's `protected` plus
  same-package factory has no TS equivalent). `getText()`/`getIdentifier()` are `string | null`.
  `getLabels()` returns the concrete `EObjectContainmentWithInverseEList`, so generated
  `basicAdd/basicRemove` calls need no `InternalEList` cast.
- **Type guards.** Java's `instanceof <interface>` becomes an exported guard (`isElkNode(o)`, …),
  implemented through a constructor registry in `ElkGraphPackage.ts`: `registerImpl(name, ctor)` is
  called by each impl module, `isInstance(name, o)` runs `instanceof` against it, keyed by a
  string-literal union of interface names. Interfaces never import impls. Mission 8c extends the
  guards for `GridElkNode` (section 9).
- **`ElkGraphPackage`** is ported as constants only: 106 feature ids keeping Java's defining
  expressions, `eNAME`/`eNS_URI`/`eNS_PREFIX`, and `Literals` (`{ getName() }` EClass stand-ins that
  drive `eStaticClass`). The metamodel itself is not ported, so the generated `switch` bodies stay
  1:1. Feature ids collide across classes (`ELK_EDGE_SECTION_FEATURE_COUNT` = 12 =
  `ELK_NODE__CONTAINED_EDGES`); a "foreign" id in a test must exceed every class's feature count
  (the tests use 99).
- **`ElkGraphFactory.eINSTANCE`** is a getter on the exported `ElkGraphFactory` const reading a holder
  that `ElkGraphFactoryImpl` sets at module load (Java initializes it with the interface; the
  module-globals rule only flags top-level `let`). `ElkGraphUtil.ts` imports the impl module for that
  side effect. Not ported on the factory: `create(EClass)`, `createFromString`, `convertToString`,
  `getPackage()` (no classifier ids, D3/D4).
- **`toString` (D10, text only).** `ElkShapeImpl`, `ElkEdgeSectionImpl`, `ElkBendPointImpl`,
  `ElkGraphElementImpl` print the Java FQ class name without the `@identityHash`, then the EMF
  suffix; `graph.json` records `toString: null` for them, so the suffixes are checked against the
  generated `StringBuffer` bodies only. `ElkEdgeImpl.toString` joins the lazily created
  `sources`/`targets` fields directly and only the preceding `isHyperedge()` call initializes them,
  so statement order must stay. Map entries print `String(value)`, so a JS number prints `1` where
  Java prints `1.0`. **Proxies (D5 of text-follow-ups, amends D10):** the nine generated arms
  `if (eIsProxy()) return super.toString();` reach `BasicEObjectImpl.toString`, which prints the hashless class
  name plus EMF's ` (eProxyURI: <uri>)`; the `graph.json` scenarios `proxy-to-string` and
  `proxy-to-string-edge-with-proxy-source` record the JVM text with `@<hex>` stripped (T3).
- `ElkNodeImpl.isHierarchical` is `getChildren().size() > 0` in the Java (the brief had said it calls
  `ElkGraphUtil`).

## 6. Property system {#property-system}

- **Keys (D5).** `IProperty` equality is by id (`graph/src/.../properties/Property.java:102`, `:111`).
  `MapPropertyHolder.propertyMap` is a `JavaHashMap` with the `PROPERTY` strategy (`hash` =
  `String.hashCode(id)`, `equals` by id). `EMapPropertyHolderImpl.properties` is an `EcoreEMap`
  keyed the same way, iterated in entry-list (insertion) order. `PROPERTY` has no `compare`:
  `Property implements Comparable<IProperty<?>>`, not `Comparable<Property>`, and a JDK `HashMap`
  only orders tree bins by comparison when the key's `Comparable` type argument is its own class, so
  colliding `Property` keys fall back to the tie-break there as here (observable only with eight or
  more equal `String.hashCode` ids in one bin; not vector-backed, MEDIUM).
- **`getAllProperties()`** returns `PropertyMap` (`get`, `containsKey`, `isEmpty`, `size`, iterable
  `[IProperty, value]` entries), satisfied by both containers; `copyProperties` iterates it and inlines
  `BasicEMap.putAll`. It ports the Java exactly: `Collections.emptyMap()` when the map is null, a live
  view otherwise. The EMap holder resolves `IPropertyValueProxy` values on read first
  (`graph/src/.../impl/EMapPropertyHolderImpl.java:180-196`). `isPropertyValueProxy` (the
  `instanceof IPropertyValueProxy` test) is exported from `IPropertyValueProxy.ts`.
- **Defaults and cloning (D6).** `Property.getDefault` clones a `Cloneable` default through
  `ElkReflect.clone` (`Property.java:134`); `getProperty` memorizes that clone on the holder only when
  the default is `Cloneable`. `ElkReflect.isCloneable` is the port of `instanceof Cloneable`: an
  `Array`, `Set`, `Map`, `EnumSet`, or an object with a `clone()` method. Registration alone is not
  enough: Java registers `IndividualSpacings`, which is not `Cloneable`, and hands that shared default
  out uncloned and unstored. `LinkedList.clone()` exists for this reason (`KVectorChain` inherits it).
- **`ElkReflect`** (`graph/src/.../util/ElkReflect.java:43`) is a `Class`-keyed registry of
  constructors and cloners, keyed here by constructor function (`v.constructor`); `EnumSet` is matched
  by `instanceof` and seeded in the map initializer (its constructor is private). Java registers the
  built-in cloners in `LayoutMetaDataService.java:125-156` (mission 5); until then the ported
  `PropertyTest` registers them in `beforeAll`, mirroring those lines with `Array` for `ArrayList` and
  `Set` for the hash sets (AD-10). A temporary seam, journaled.
- **Annotations (D7).** `@AdvancedPropertyValue` / `@ExperimentalPropertyValue` become registries in
  the two annotation files (`markAdvanced(constant)`, `isAdvanced(constant)`, and the experimental
  pair), filled from the enum's static block; `ElkGraphUtil.isAdvancedPropertyValue` consults them.
- **`PropertyHolderComparator.with`** returns a comparator function: numbers via `Double.compare`,
  strings via `String.compareTo`, booleans false < true, else `compareTo`. `Property` declares its
  infinities before the instance fields (TS2729).
- **`GraphFeature.COMPOUND`** reads "levels and"; upstream concatenates without the space. Accepted
  divergence, listed in [conformance.md](../conformance.md) (upstream fix: eclipse-elk/elk#1202).

## 7. Utilities {#utilities}

`ElkGraphUtil.ts` (487 lines, Javadoc kept to one line per member to stay under the cap):

- `findBestEdgeContainment`'s general case is split into `findCommonAncestorOfIncidentShapes` (30
  NLOC); `createLabelWithText` exists because of an arity clash; `createBendPoint(section, x?, y?)`
  is one method; `allIncidentEdges` dispatches on guards at run time (Java overloads by static type;
  all five ELK call sites are statically typed).
- `PropertiesSkippingTreeIterator.getChildren` filters entry instances instead of an
  `EStructuralFeature` (flat `eContents`, D4). `AncestorIterator` adds `[Symbol.iterator]`; its
  `NoSuchElementException` arm and `includeNode=false` are unreached by any Java caller.
- `convertPropertyValueToString` prints JS numbers (`1` vs `1.0`, text only).
- Quirks kept: `isSelfloop` is `true` for an edge with no sources and no targets; `createHyperedge`
  with empty endpoint lists throws `IllegalArgumentException` from `updateContainment`
  (`The edge must have at least one source or target.`); a null cross-graph lookup returns `null`.

`GraphIdentifierGenerator.ts` (490 lines):

- Overloads are suffixed (`#validateElementIdentifier`, `#validateSectionIdentifier`,
  `#setSectionIdentifierIfMissing`); the anonymous `ElkGraphSwitch` becomes two guard chains
  (`#validateIdentifiers`, `#generateIdentifiers`) with one private method per Java `case*`;
  `isValidIdentifierChar` is the positive form of the Java's negated conditions.
- `isMissing` ports `trim().isEmpty()` with Java's `<= U+0020` rule; `toCharArray` is `split('')`,
  so a surrogate pair becomes `__` as in Java; `stream().forEach` is a snapshot `toArray().forEach`.
- Numbering (vector-backed): `'a b'` → `a_b`, `'1x'` → `_x`, `''` and `null` → `N<n>`; existing
  valid ids are kept even when duplicated; a preset `N2` is skipped by the counter; the root gets
  `G1` even when a child already carries `G1`; ports `P<n>`, edges `E<n>`, sections `ES<n>`; labels
  are numbered in visit order (edge labels before node labels, because a node visits labels, ports,
  containedEdges, then children); run on a non-root node that node gets an `N` id. `assertUnique`
  keeps the unseeded `new Random()` (D10): a duplicate becomes `<id>_g<4 digits>`, and a null-id
  duplicate `null_g<4 digits>` (Java's `null + "_g"`). The test pins only the `/_g\d{4}$/` shape.

## 8. JVM vectors {#jvm-vectors}

`test/golden/refs/java/graph.json` (D9): 40 scenarios, 654 steps, recorded from the oracle's
`org.eclipse.elk.graph` jar plus EMF and Guava from the p2 cache by `tools/vectors/GraphVectors.java`
over the scripted `tools/vectors/graph-scenarios.txt` (a separate data file: JDK 21's source
launcher takes one file and the complexity hook caps files at 500 lines). After every step it
records each element's lists by id, container id, `eAllContents` id order, property key order,
deterministic `toString()`s, thrown class and message, and `ElkGraphUtil` /
`GraphIdentifierGenerator` results; zero identity hashes. Regenerate with
`tools/vectors/graph-vectors.sh <outDir>`; the output must stay byte-identical (sha256
`91221739…fd82`), and any change is journaled with the reason.

Replay: `src/graph/impl/ElkGraph.replay.test.ts` over `test/helpers/graph-vectors.ts` (an
op-handler seam), all 654 steps including the two `generate-identifiers*` scenarios. Scenario
families: `elk-graph-util-test-*` (the ported `ElkGraphUtilTest`), containment and `setParent` moves,
`list-*` (duplicates, moves, clears, index errors), `recursive-containment-*`, property-map ordering
and copying, `e-all-contents-declaration-order`, `first-edge-section-*`, `generate-identifiers*`,
edge predicates, sections and bend points, setters and `toString`, label overloads.
`connectableShapeToNode/Port` JUnit cases are ported directly, not as vectors.

## 9. EMF outside `graph` {#emf-outside-graph}

Kept from the pre-mission-2 survey for the missions that meet them. 41 files import
`org.eclipse.emf`, 27 of them in `graph`; the 14 outside are:

- XMI persistence, 4 files in `core/src/.../util/persistence` (out of scope with resources).
- `LoggedGraph` and `NGraph` (importers that read `ElkNode`).
- `ECollections.sort`, 2 call sites (ported in `src/emf/common/util/ECollections.ts`).
- `GridElkNode` (`alg.topdownpacking/src/.../GridElkNode.java:44`), a 523-line class that
  **implements the whole EMF `ElkNode` interface by delegation**: it needs a narrower interface or an
  explicit adapter under AD-11, and the type guards must admit it (mission 8c).
- `EcoreUtil.copy` is used only for debug logging (`core/src/.../util/BasicProgressMonitor.java:433`).
- `eAllContents()` drives generated ids (`graph/src/.../util/GraphIdentifierGenerator.java:348`) and
  `core/src/.../util/ElkUtil.java:989`; both consume the single `eAllContents` implementation above.
