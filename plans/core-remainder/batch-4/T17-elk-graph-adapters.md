<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — `ElkGraphAdapters`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T17): port elk graph adapters`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `ElkGraphAdapters` implements the landed generic `GraphAdapters` interfaces
(`src/core/util/adapters/GraphAdapters.ts`, a type-only namespace) over the ElkGraph.
- Generic code in `alg.common` uses it, as do `alg.layered`, `alg.rectpacking` and `alg.spore` (node-margin and
  label-placement helpers).
- There is no Java test; the unit tests derive from the Java source.

## Task
1. Port `J/util/adapters/ElkGraphAdapters.java` (539 lines). It has a facade and 6 nested classes (P1, M15), each in
   its own prefixed file:
   - `ElkGraphAdapters.ts`: `adapt`, `adaptSingleNode`, `adaptSinglePort`, `DEFAULT_PORTLIST_SORTER`;
   - `ElkGraphAdaptersAbstractElkGraphElementAdapter.ts`, `ElkGraphAdaptersElkGraphAdapter.ts`,
     `ElkGraphAdaptersElkNodeAdapter.ts`, `ElkGraphAdaptersElkLabelAdapter.ts`, `ElkGraphAdaptersElkPortAdapter.ts`,
     `ElkGraphAdaptersElkEdgeAdapter.ts`, `ElkGraphAdaptersPortComparator.ts`.
   - Java's private nested classes stay unexported from the facade but are exported from their own files for tests.
2. **`OFFSET_PROXY`** (`:102`) is `new Property<>(CoreOptions.PORT_BORDER_OFFSET, 0.0)`, Java's copy-with-default
   constructor. Use the landed `Property` equivalent; grep for its existing uses.
3. **`sortPortList`** uses `ECollections.sort(element.getPorts(), comparator)` (`:314-325`). The landed
   `src/emf/common/util/ECollections.ts` already has a stable `sort`.
4. **`PortComparator`** (`:491-510`): the difference of `PORT_SIDE` ordinals, then Java's tie rule as written.
5. Port every getter and setter branch: position, size, padding, margin (including the label- and port-aware margin
   paths), volatile id, labels, ports, incoming and outgoing edges, and `isCompoundNode`.
6. Write unit tests: build small ElkGraphs with `ElkGraphUtil`, adapt them, and assert on every adapter method,
   including the sort order of ports across sides.

## Write-set
`src/core/util/adapters/ElkGraphAdapters*.ts` and colocated tests.

## Read-set
- `J/util/adapters/ElkGraphAdapters.java`.
- `src/core/util/adapters/GraphAdapters.ts`, `src/graph/properties/Property.ts`, `src/emf/common/util/ECollections.ts`.
- `src/core/math/{ElkMargin,ElkPadding,KVector}.ts`, `src/core/options/{CoreOptions,PortSide,LabelSide}.ts`,
  `src/graph/util/ElkGraphUtil.ts`.

## Interface contracts (outputs)
- `ElkGraphAdapters.adapt(graph): ElkGraphAdapter`, `adaptSingleNode(node): ElkNodeAdapter`,
  `adaptSinglePort(port): ElkPortAdapter`.
- `ElkGraphAdapters.DEFAULT_PORTLIST_SORTER`.
- Each adapter satisfies its `GraphAdapters.*Adapter<T>` interface.

## Acceptance criteria
- Given a node with ports on all four sides in shuffled order, when `sortPortList()` runs, then the ports end up in
  `PORT_SIDE` ordinal order, with ties broken as `PortComparator` does.
- Given a port without `PORT_BORDER_OFFSET`, when the adapter reads the offset, then `0.0` is returned through
  `OFFSET_PROXY`.
- Given `ElkNodeAdapter.getMargin()` and `setMargin()`, when called, then they read and write
  `CoreOptions.MARGINS` as in Java, including any copy semantics.
- Given the typecheck, when run, then each adapter class satisfies its `GraphAdapters` interface.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
