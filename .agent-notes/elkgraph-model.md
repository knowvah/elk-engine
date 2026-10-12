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
