<!-- SPDX-License-Identifier: EPL-2.0 -->

# Translation rules, section 2: collections and iteration order

Pre-approved split of section 2 of [translation-rules.md](translation-rules.md) (main doc would
exceed 500 lines). Policy source: AD-10 (decisions.md). Java semantics: Javadoc only (AD-9).
Citation format and the `cite` helper are defined in the main doc ("Conventions").

## 2.0 How the inventory was built

Setup (bash or zsh; `$ELK_SOURCE_DIR` is the ELK checkout at `8aaa3c145c2a...`):

```bash
cd "$ELK_SOURCE_DIR"; P=plugins/org.eclipse.elk; SRC=()
for b in core graph graph.json alg.common alg.layered alg.mrtree alg.radial alg.force alg.disco \
         alg.rectpacking alg.spore alg.topdownpacking alg.vertiflex; do SRC+=("$P.$b/src"); done
G() { grep -rnE --include='*.java' --include='*.xtend' "$@" "${SRC[@]}"; }
```

| Count | Command (append `\| wc -l`) |
|-------|-----------------------------|
| 105 HashMap creations | `G 'new (java\.util\.)?HashMap\b\|Maps\.newHashMap'` |
| 74 HashSet creations | `G 'new (java\.util\.)?HashSet\b\|Sets\.newHashSet'` |
| 33 LinkedHash* (10 map, 23 set) | `G 'new LinkedHash(Map\|Set)\b\|Maps\.newLinkedHashMap\|Sets\.newLinkedHashSet'` |
| 6 EnumMap; 83 EnumSet + 15 `immutableEnumSet` | `G 'new EnumMap\b\|Maps\.newEnumMap'`; `G 'EnumSet\.(of\|noneOf\|allOf)\('`; `G 'Sets\.immutableEnumSet\('` |
| 12 TreeSet, 0 TreeMap, 1 TreeMultimap | `G 'new TreeSet\b\|Sets\.newTreeSet'`, `G 'TreeMultimap\.create'` |
| 4 PriorityQueue | `G 'new PriorityQueue\b'` |
| 46 `Collections.sort` (2 are EMF `ECollections.sort`); 111 `.sort(` (includes those 46) | `G 'Collections\.sort\('`, `G '\.sort\('` |
| 8 Arrays.sort | `G 'Arrays\.sort\('` |
| 70 listIterator, 41 `.remove()` | `G '\.listIterator\('`, `G '\.remove\(\)'` (iterator + queue) |
| 95 LinkedList, 9 ArrayDeque, 4 Stack | `G 'new LinkedList\b\|Lists\.newLinkedList'`, `G 'new ArrayDeque\b'`, `G 'new Stack\b'` |

HashMap/HashSet method (static triage, lower bound; no execution):

1. The 179 creation sites split into 154 bound to a named variable/field and 25 anonymous (values
   inside maps/lists, returns, arguments). The 154 collapse to **142 distinct containers** by
   (file, identifier): **95 maps, 47 sets**.
2. Per container, candidate iteration found with
   `G 'for \(.*: [^)]*\bVAR\b\|\bVAR\.(keySet\|values\|entrySet\|forEach\|iterator\|stream)\('`,
   then every `return VAR`, getter, constructor argument and `addAll(VAR)` was followed by hand.
3. Key kind from the declared generic type and the key class's `hashCode` (21 overrides in
   scope: `G 'int hashCode\('`).

Headline: **42 containers are iterated** (40 named + 2 anonymous value-sets):

| Key kind | Iterated | Port policy |
|----------|---------:|-------------|
| value-hashed, order can matter (String, IProperty, KVector-derived) | 8 | `JavaHashMap` shim (AD-10) |
| value-hashed Integer, keys fed to a sorted TreeSet (order-insensitive) | 2 | plain `Map` |
| enum (`Enum.hashCode` is identity-based) | 2 | insertion order, journal |
| identity-hashed (LNode, LEdge, LPort, ElkNode, ...) | 30 | insertion order, journal |

Correction to the task brief: enum keys are **not** value-hashed. `Enum.hashCode()` is final and
its Javadoc points at `System.identityHashCode`, so `HashSet<Direction>` order is JVM-run
dependent (HIGH; Javadoc `java.lang.Enum#hashCode`).

Specified hash functions available to a `JavaHashMap` (Javadoc): `String.hashCode`
(`s[0]*31^(n-1)+...`, int arithmetic), `Integer`, `Boolean`, `Long`, `Double.hashCode`
(`(int)(v ^ (v >>> 32))` of `doubleToLongBits`), `List`/`Set`/`Objects.hash`. The **iteration order
of `HashMap` itself is not specified** (Javadoc: "makes no guarantees as to the order of the
map"); only capacity/load-factor (0.75, rehash on growth) are described. The shim therefore
cannot be derived from the Javadoc alone: write failing tests first from JVM-generated vectors
(insert/remove/resize sequences recorded from `java.util.HashMap` on a JVM, never from the JDK's own
implementation source, AD-9).

## 2.1 Iterated value-hashed containers (port with `JavaHashMap`)

- V1 `MapPropertyHolder.propertyMap`, IProperty keys (`Property.hashCode` = `id.hashCode()`,
  `graph/src/.../properties/Property.java:111`). Declared
  `graph/src/.../properties/MapPropertyHolder.java:115`.
  Iterated: `core/src/.../LayoutConfigurator.java:228`, `core/src/.../util/IndividualSpacings.java:122`
  (output text order!), `alg.mrtree/src/.../ComponentsProcessor.java:246` (last-writer-wins merge).
- V2 `ElkSpacings.factorMap`, IProperty keys: `core/src/.../util/ElkSpacings.java:148`;
  iterated `:209` (`ImmutableMap.copyOf`), `:288` (`keySet().stream()`).
- V3 `LayoutAlgorithmData.knownOptions`, String keys: `core/src/.../data/LayoutAlgorithmData.java:59`;
  exposed by `getKnownOptionIds` (`:116`), iterated `core/src/.../util/PropertyConstantsDelegator.java:90`.
- V4 `FanProcessor.locFanMap`, String keys: `alg.mrtree/src/.../intermediate/FanProcessor.java:123`,
  iterated `:135`.
- V5 `GraphValidator.algorithmSpecificValidators`, `LayoutAlgorithmData` keys (`hashCode` = id,
  `core/src/.../data/LayoutAlgorithmData.java:90`): `core/src/.../validation/GraphValidator.java:43`,
  `values()` iterated `:154`.
- V6 `BowyerWatsonTriangulation.triangulation`, `TTriangle` keys (hash = sum of KVector hashes,
  `alg.common/src/.../TTriangle.java:119`): `alg.common/src/.../BowyerWatsonTriangulation.java:85`,
  iterated `:98`, `:136`, `:156`.
- V7 `BowyerWatsonTriangulation.tEdges`, `TEdge` keys (hash `alg.common/src/.../TEdge.java:56`): declared
  `alg.common/src/.../BowyerWatsonTriangulation.java:155`, iterated `:159`, `:167`, returned `:171`
  into spore `graph.tEdges`.
- V8 `OverlapRemovalLayoutProvider.overlapEdges` (`alg.spore/src/.../OverlapRemovalLayoutProvider.java:86`)
  and V6/V7 output reach `alg.common/src/.../NaiveMinST.java:53`, `:58`, `:59`, where the HashSet order is
  copied to a list and sorted by weight: **tie order = HashSet iteration order**, the clearest
  AD-10 case in scope. `KVector.hashCode` is `Double.valueOf(x).hashCode() +
  Integer.reverse(Double.valueOf(y).hashCode())` (`core/src/.../math/KVector.java:155`, int overflow wraps).
- V9, V10 `modelOrderMap` (Integer keys) in `alg.layered/src/.../p1cycles/BFSNodeOrderCycleBreaker.java:181`
  and `.../p1cycles/DFSNodeOrderCycleBreaker.java:155`: keys go through `new TreeSet<>(map.keySet())`
  (`.../p1cycles/BFSNodeOrderCycleBreaker.java:215`, `.../p1cycles/DFSNodeOrderCycleBreaker.java:190`),
  so order is irrelevant. The **values** are identity-hashed (I4, I5).

Not iterated, lookups only (no order risk): the 14 Json importer/exporter hash maps
(`graph.json/src/.../JsonExporter.xtend:48-51`, `JsonImporter.xtend:59-74`), `ElkReflect`
registries (`graph/src/.../util/ElkReflect.java:43`), `FanProcessor.gloFanMap`, `LevelProcessor`,
`EdgeRouter.nodeGaps` (Long keys).

## 2.2 Iterated enum-keyed and identity-hashed containers (insertion order, journal each site)

AD-10: iteration over identity-hashed keys is non-deterministic in Java itself. Each port task
that touches one of these sites writes a journal entry and keeps insertion order (JS `Map`/`Set`).
`Object.hashCode` identity has no Javadoc-specified order, so there is nothing to reproduce.
Notation: `L:` = `alg.layered/src/...`; a bare `:N` is a line in the same file; `decl -> iteration`.

Enum-keyed (identity hash):
- E1, E2 `LEFT_RIGHT/UP_DOWN`
  `L:.../compaction/components/OneDimensionalComponentsCompaction.java:65-66` -> `:326`, `:336`,
  `:346` (order of `cNodes.add` for placeholders).

Identity-hashed:
- I1 `SweepCopy.updatePortOrder` `L:.../p3order/SweepCopy.java:99` -> `:138`
- I2 `graphsWhoseNodeOrderChanged` `L:.../p3order/LayerSweepCrossingMinimizer.java:627` -> `:546`, `:552`
- I3 `BFSNodeOrderCycleBreaker.sources` `L:.../p1cycles/BFSNodeOrderCycleBreaker.java:100` -> `:121`
- I4 BFS `modelOrderMap` value sets `L:.../p1cycles/BFSNodeOrderCycleBreaker.java:189`, `:209`:
  **picks the first element** with `.iterator().next()` `:219`, then `addAll` `:228`
- I5 DFS `modelOrderMap` value sets `L:.../p1cycles/DFSNodeOrderCycleBreaker.java:164`, `:184` ->
  `:192`, `:203`
- I6 `Tarjan.sCC` `L:.../graph/Tarjan.java:87` -> `:97`
- I7 `flexibleWhereSpacePermitsEdges` `L:.../p4nodes/NetworkSimplexPlacer.java:190` -> `:273`
- I8 `BKCompactor.sinkNodes` `L:.../p4nodes/bk/BKCompactor.java:55` -> `:341`, `:378`
- I9 `IUEE.edges` `L:.../components/ComponentsCompactor.java:670` (filled `:296` from a
  `HashMultimap`) -> `:659`
- I10 `ComponentsToCGraphTransformer.externalExtensions`
  `L:.../compaction/components/ComponentsToCGraphTransformer.java:78` ->
  `L:.../compaction/components/OneDimensionalComponentsCompaction.java:110`, `:384`
- I11, I12 `upEdges/downEdges` (`Pair<SideToProcess,LEdge>`: enum + identity hash)
  `L:.../p5edges/splines/SplineEdgeRouter.java:588-589` -> `:633`, `:635`, `:641`, `:643`
- I13, I14 `SplineSegment.leftPorts/rightPorts` `L:.../p5edges/splines/SplineSegment.java:64`, `:66` ->
  `L:.../p5edges/splines/SplineEdgeRouter.java:664`, `:670`, `:676`, `:682`
- I15 `CompoundGraphPreprocessor.dummyNodeMap` `L:.../compound/CompoundGraphPreprocessor.java:96` -> `:129`
- I16 `CompoundGraphPostprocessor.dummyEdges` `L:.../compound/CompoundGraphPostprocessor.java:86` -> `:191`
- I17-I19 `commentOffsets/nodesMap/verticalSegmentsMap`
  `L:.../intermediate/compaction/LGraphToCGraphTransformer.java:67`, `:70`, `:71` -> `:628`,
  `:467`, `:488`, `:209`
- I20 `EndLabelSorter.edgeToGroupMap` `L:.../intermediate/EndLabelSorter.java:161` -> `:176` (into a list)
- I21 `EndLabelPreprocessor.portToLabelCellMap` `L:.../intermediate/EndLabelPreprocessor.java:110` ->
  `L:.../intermediate/EndLabelPostprocessor.java:74`
- I22 `DCComponent.shapes` `alg.disco/src/.../graph/DCComponent.java:55` -> `:122`, `:171`
- I23 `adjacentNodes` `alg.disco/src/.../transform/ElkGraphComponentsProcessor.java:104` -> `:212`;
  `getInnerNeighborsOfPort` also collects with `parallelStream()...Collectors.toSet()` `:180`
- I24-I27 `elementMapping/incomingExtensionsMapping/outgoingExtensionsMapping/edgeSet`
  `alg.disco/src/.../transform/ElkGraphTransformer.java:68`, `:70`, `:71`, `:113` -> `:207`, `:212`,
  `:226`, `:496`
- I28, I29 `LayoutConfigurator.elementOptionMap/classOptionMap` (`Class` keys hash by identity)
  `core/src/.../LayoutConfigurator.java:60-61` -> `:302`, `:310` (copy into another map: the sink is
  order-insensitive)
- I30 `RadialUtil.getNextLevelNodeSet` `alg.radial/src/.../RadialUtil.java:225` ->
  `alg.radial/src/.../intermediate/overlaps/RadiusExtensionOverlapRemoval.java:83`, `:91`, `:93`
  (the order feeds the sorter)

Guava `HashMultimap` (12 `create()` calls; counted separately from the 142/42 above) adds
identity-ordered iteration at:
- `L:.../compound/CompoundGraphPreprocessor.java:107` -> `:252` (`keySet`), `crossHierarchyMap`
- `graph.json/src/.../JsonImporter.xtend:313` -> `:360`, `:372` (`ElkEdgeSection` keys)
- `L:.../intermediate/compaction/NetworkSimplexCompaction.java:208` -> `:256`, `:275` (`lEdgeMap`)
- `L:.../compaction/components/ComponentsToCGraphTransformer.java:79` (`externalPlaceholder`) ->
  `L:.../compaction/components/OneDimensionalComponentsCompaction.java:326`, `:336`, `:346`
  (`Pair` hash is identity-derived)

Keys of type `Set<PortSide>` (`L:.../components/ComponentGroup.java:96`) need value equality
(`Set.equals`), see 6.1 in the main doc.

## 2.3 One row per container kind

| Kind | Rule | TS | ELK citation |
|------|------|----|--------------|
| `LinkedHashMap/Set` (33) | insertion-ordered; re-insert keeps position | `Map`/`Set` | `core/src/.../data/LayoutMetaDataService.java:162` |
| `HashBiMap` (8) | Guava: insertion-ordered keys (Guava Javadoc) | local BiMap | `graph.json/src/.../JsonExporter.xtend:43` |
| `EnumMap` (6) | iterates in ordinal order (Javadoc `EnumMap`) | array indexed by `ordinal` | `alg.layered/src/.../graph/LNode.java:518` |
| `EnumSet` (98) | ordinal order, no nulls | bitset or sorted array by ordinal | `core/src/.../options/PortSide.java:52` |
| `TreeSet/TreeMultimap` (13) | comparator decides equality: `compare == 0` means duplicate, `add` returns false | sorted array + binary search; `lower/higher/first/pollFirst` | `alg.common/src/.../compaction/oned/ScanlineConstraintCalculator.java:145`, `alg.layered/src/.../p3order/counting/CrossingsCounter.java:337`, `alg.common/src/.../nodespacing/internal/NodeContext.java:102` |
| `PriorityQueue` (4) | head is *one of* the tied minimums; iterator order unspecified (Javadoc) | binary-heap class, sift-up on offer, sift-down on poll, tested on tie-heavy JVM vectors | `core/src/.../util/BoxLayoutProvider.java:551` (area ties), `alg.force/src/.../stress/StressMajorization.java:143` (dist ties), `alg.layered/src/.../p2layers/CoffmanGrahamLayerer.java:110` |
| `Collections.sort`, `List.sort` | stable (Javadoc: "guaranteed to be stable") | `Array.prototype.sort` (stable since ES2019) | `alg.layered/src/.../p3order/MedianHeuristic.java:72` (ELK comment `:71` relies on it) |
| comparator contract violations | Java TimSort may throw `IllegalArgumentException` (>= 32 elements) or give implementation-defined order; JS never throws | keep comparator verbatim; journal non-transitive ones | `alg.layered/src/.../InteractiveLayeredGraphVisitor.java:849` (`(int)(a.getY()-b.getY())` truncates, non-transitive), `:433` (int subtraction overflows) |
| `Arrays.sort(double[])` | total order: `-0.0 < 0.0`, NaN last (Javadoc) | `Float64Array.prototype.sort()` without comparator | `alg.layered/src/.../p4nodes/bk/BKNodePlacer.java:452` |
| `Iterator.remove` (41 `.remove()`) | removes last returned element; legal only once per `next()` | explicit index loop or filter-in-place | `core/src/.../util/ElkUtil.java:579`, `alg.layered/src/.../graph/LPort.java:312` |
| `ListIterator` (70) | cursor between elements: `add` inserts at cursor, `remove`/`set` hit last returned, `previous` moves back | `ListIterator<T>` class over an array | `core/src/.../util/ElkUtil.java:956` (`add`) and `:965` (`remove`), `alg.layered/src/.../p5edges/orthogonal/HyperEdgeSegment.java:158` (`previous` + `add`) |
| `LinkedList`/`ArrayDeque`/`Stack` | Stack iterates bottom to top, `ArrayDeque.push` adds at the head and iterates head first; deques reject null | array or Deque class | `alg.layered/src/.../graph/Tarjan.java:42`, `alg.common/src/.../networksimplex/NetworkSimplex.java:332` |
| fail-fast iterators | mutation during iteration throws `ConcurrentModificationException`; JS `Map`/`Array` iterators tolerate it | no emulation; port code that avoids it | Javadoc `HashMap` (no ELK site depends on the exception) |

`Sets.newHashSet(x)` / `new HashSet<>(coll)` copy semantics: element order of the copy is the
copy's own hash order, not the source order (relevant for I9, `ComponentsCompactor.java:296`).

## 2.4 Vector gaps to close before the first collection port

`test/golden/refs/java/` covers int32 ops, `d2i/d2l`, `round`, `floorDiv/Mod`, `Double.compare`,
`Random`. Missing and needed for this section: `HashMap/HashSet` iteration order (String, Integer,
Double, KVector-style keys; with removals and resizes), `PriorityQueue` tie order, `String.hashCode`,
`Double.hashCode`. Extend `tools/vectors/JavaVectors.java` (JDK-generated) before writing the shims.
