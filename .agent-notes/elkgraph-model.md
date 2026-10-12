<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — elkgraph-model (2026-10-12)

Planning-time notes are in `elkgraph-model-planning.md`.

## Observation: EMF containment lists do not check recursive containment

- **Context**: T2 recording `graph.json` from the oracle's `org.eclipse.elk.graph` jar.
- **Finding**: `EList.add`/`add(int)` on `children`/`labels` accepts an ancestor and silently
  builds a cycle; afterwards `eAllContents()` never terminates (the generator run died with
  `OutOfMemoryError`), and `elementLabeledBy`, `containingGraph`, `isDescendant`,
  `findBestEdgeContainment` loop forever. Only the generated setters (`setParent`,
  `setContainingNode`) throw `IllegalArgumentException("Recursive containment not allowed for "
  - element.toString())`via`EcoreUtil.isAncestor`. A later `setParent(node, outside)` breaks
    the cycle without throwing. An edge can never be in a cycle (it cannot contain a node).
- **Impact**: the TS port must not add a check to the lists (faithful); callers that build
  graphs through the lists can create unbounded walks exactly as in Java.
- **Confidence**: High

## Observation: EMF list exception classes and JVM-generated messages

- **Context**: T2 `list-index-errors` scenario.
- **Finding**: `set`/`add(int)` of a present element throw `IllegalArgumentException` "The 'no
  duplicates' constraint is violated" (`set` to the same element at the same index is allowed);
  `remove(int)`/`add(int)` past the size throw EMF's `BasicIndexOutOfBoundsException` "index=5,
  size=2"; `move(int,int)` out of range throws `IndexOutOfBoundsException` "targetIndex=4,
  size=4" / "sourceIndex=4, size=4"; negative indices reach the JVM: `add(-1, e)` →
  `ArrayIndexOutOfBoundsException` "arraycopy: source index -1 out of bounds for object
  array[N]" (N = backing-array capacity after EMF's `grow`), `remove(-1)` / `move(0,-1)` /
  `move(i, absentElement)` → "Index -1 out of bounds for length N". No failed index op changed
  state.
- **Impact**: a byte-exact replay needs EMF's capacity growth policy (`BasicEList.grow`) and the
  HotSpot message formats; EMF's own exception subclass names appear in the vectors.
- **Confidence**: High

## Observation: `GraphIdentifierGenerator` numbering and non-uniqueness

- **Context**: T2 `generate-identifiers*` scenarios (`assertValid().assertExists()` only).
- **Finding**: `'a b'`→`a_b`, `'1x'`→`_x`, `''`→`N<n>`, `null`→`N<n>`; existing valid ids are
  kept even when duplicated; a preset `N2` is skipped by the counter; root → `G1` even when a
  child already carries `G1`; ports `P<n>`, edges `E<n>`, sections `ES<n>`; labels are numbered
  in visit order (edge labels before node labels because a node visits labels, ports,
  containedEdges, then children). Run on a non-root node the node gets an `N` id.
- **Impact**: identifier generation is order-dependent and does not deduplicate without
  `assertUnique` (unseeded `Random`, D10).
- **Confidence**: High

## Observation: `isSelfloop` on an edge without endpoints is `true`

- **Context**: T2 `edge-predicates`.
- **Finding**: `ElkGraphUtil.isSelfloop` returns `true` for an edge with no sources and no
  targets; `createHyperedge` with empty endpoint lists throws `IllegalArgumentException` from
  `updateContainment`.
- **Impact**: port as is; do not "fix".
- **Confidence**: High

## Observation: JDK 21 source launcher takes one file; the complexity hook caps files at 500 lines

- **Context**: T2 generator with ≥ 30 scenarios inline reached 752 lines.
- **Finding**: `java File.java` (JDK 21) cannot load a second source file, and the
  `check-complexity.py` hook blocks any new file over 500 lines. The scenarios moved to a text
  file (`tools/vectors/graph-scenarios.txt`) read by the generator.
- **Impact**: future vector generators with large scripted inputs should plan a data file from
  the start.
- **Confidence**: High

## Observation: subagents could not WebFetch the JDK Javadoc

- **Context**: T1 and T4 (`LinkedList`, `ListIterator`, `EnumSet` shims).
- **Finding**: `WebFetch` was not available inside the typescript-pro subagents even though the
  prompt asked for it; the shims were written from the brief's contract and standard JDK
  semantics, with the Javadoc URL cited.
- **Impact**: when a shim must be checked against the Javadoc, fetch it in the orchestrator and
  paste the relevant text into the agent prompt.
- **Confidence**: High

## Observation: `KVectorChain.pointOnLine`/`angleOnLine` never measure the last segment backwards

- **Context**: T5 porting `KVectorChain` with hand-derived expectations.
- **Finding**: for a negative distance the Java starts at `listIterator(size() - 1).previous()`,
  i.e. index `size - 2`, so the last segment is skipped; on a 2-point chain a negative distance
  throws `NoSuchElementException`, and past the end `pointOnLine` returns the first point.
  `KVector.parse("5,a")` sets `x = 5` before throwing; `Spacing`/`KVectorChain.parse` likewise
  keep the fields/vectors completed before the failing token.
- **Impact**: ported as is and pinned by tests; do not "fix" when a later caller looks odd.
- **Confidence**: High

## Observation: `hash.json` `kvectorHash` is a bit-pattern grid, not hand-picked rows

- **Context**: T5 acceptance asked for the `(1.0, 2.0)` row.
- **Finding**: the 256 rows cover a grid of bit patterns; `(1.0, 2.0)` is absent. The test asserts
  the `(1.0, 1.0)`/`(1.0, -1.0)` rows, a derived `(1.0, 2.0)` literal and the whole grid.
- **Impact**: future briefs should check row presence before naming a specific vector row.
- **Confidence**: High

## Observation: JDK `HashMap` never orders `Property` keys by `compareTo`

- **Context**: T7 deciding whether `PROPERTY` needs a `compare`.
- **Finding**: `Property implements Comparable<IProperty<?>>`, not `Comparable<Property>`; the
  JDK tree bins use comparison order only when the key's `Comparable` type argument is its own
  class, so colliding `Property` keys fall back to identity order (observable only with ≥ 8
  equal `String.hashCode` ids in one bin). Not vector-backed.
- **Impact**: `PROPERTY` has `hash`/`equals` only; revisit only if a golden ever hits the case.
- **Confidence**: Medium

## Observation: a failed EMF `addAt(-k, e)` still grows the backing array

- **Context**: T6 reproducing the JVM messages of `list-index-errors`.
- **Finding**: `grow` runs before the failing `arraycopy`, so later messages report the larger
  capacity (a full 4-element list goes to `array[10]`); EMF's `grow` is `old + old/2 + 4`
  (4 → 10 → 19). `FixedLayoutProvider.java:174-177` calls `sections.remove()` with no `next()`,
  which throws `IllegalStateException` with EMF's iterator whenever an edge has > 1 section — a
  latent ELK bug the port must keep.
- **Impact**: byte-exact replays depend on the capacity policy; expect the latent bug in goldens.
- **Confidence**: High

## Observation: ElkGraph feature ids collide across classes

- **Context**: T9 tests needing a "foreign" feature id.
- **Finding**: `ELK_EDGE_SECTION_FEATURE_COUNT` (12) equals `ELK_NODE__CONTAINED_EDGES`; a
  foreign id in a test must exceed every class's feature count (tests use 99).
  `ElkEdgeImpl.toString` joins the lazily created `sources`/`targets` fields directly; only the
  preceding `isHyperedge()` call initializes them (reordering would hand `Joiner` a null).
- **Impact**: keep statement order in the hand-written `toString`s; pick foreign ids ≥ 99.
- **Confidence**: High

## Observation: the complexity hook counts lines after Prettier

- **Context**: T9 `test/helpers/graph-vectors.ts` reached 492 lines.
- **Finding**: Prettier expands single-line object entries, so a file that looks under 500 lines
  when written can exceed the cap after `prettier --write`; `ElkGraphUtil.ts` needed one-line
  Javadoc and no blank lines inside bodies to land at 487.
- **Impact**: budget helper/util files at ~450 pre-Prettier lines; add new ops to a helper from a
  new test file rather than growing the helper.
- **Confidence**: High

## Observation: an unquoted `$FILES` list voids a lizard gate under zsh

- **Context**: batch 2 gate `lizard … $(git diff --name-only …)`.
- **Finding**: zsh passed the newline-joined list as one argument; lizard parsed 0 functions and
  exited 0, so the gate "passed" without checking anything. `xargs lizard < list.txt` found the
  real warning (`Property.test.ts` `javaEquals` CCN 13).
- **Impact**: a lizard summary with 0 or 1 functions is a misrun, not a pass; use `xargs`.
- **Confidence**: High
