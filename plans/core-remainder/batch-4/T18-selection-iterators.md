<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — EMF `AbstractTreeIterator` and selection iterators

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T18): port tree iterator and edge selection iterators`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `SelectionIterator` and `DefaultSelectionIterator` walk chains of hyperedges through ports.
Nothing in scope calls them (R1).
- `SelectionIterator` extends EMF's `AbstractTreeIterator<ElkGraphElement>`, which is not in `src/emf/` yet.
- EMF is EPL-2.0, so its source may be read and ported (translation-rules §emf, P6).
- There is no Java test; the unit tests derive from the Java source and EMF's documented contract.

## Task
1. **EMF port**: `org.eclipse.emf.common.util.AbstractTreeIterator`, plus `TreeIterator` if `SelectionIterator`'s
   API needs it, into `src/emf/common/util/`, mirroring EMF paths and names.
   - Find the EMF common source locally first: a `*.source` or `-sources` jar in `~/.m2` or the p2 bundle cache.
     Otherwise port from the EMF Javadoc and journal which you used (push-forward).
   - Port the constructor `(object, includeRoot)`, `hasNext`, `next`, `remove`, `prune()` and the abstract
     `getChildren(object)`, keeping its iteration-stack semantics.
   - `serialVersionUID` is dropped (no serialization).
2. **`J/util/selection/SelectionIterator.java`**: the protected `visited: Set<ElkPort> | null`, the constructor
   calling `super(edge, false)`, and `attachVisitedSet`. It imports `ElkUtil`; check why and port that use.
3. **`J/util/selection/DefaultSelectionIterator.java`**: `getChildren` (`:62-102`), with lazy
   `visited = Sets.newHashSet()` (identity-hashed, contains and add only; a JS `Set`, journaled, P2).
   - Keep the `followEdgeDirection ? targets.get(0) : sources.get(0)` choice.
   - Keep the empty iterator for a non-port or already-visited shape.
   - With `addPorts`, return `Iterators.concat(singletonIterator(port), edges)`, using `src/guava/Iterators.ts`.
4. Write unit tests:
   - a chain `e1 → p1 → e2 → p2 → e3` with `addPorts` on and off, in both directions;
   - a cycle that `visited` must break;
   - a shared `attachVisitedSet` across two iterators;
   - `prune()` skipping a subtree;
   - `AbstractTreeIterator` with and without the root.

## Write-set
`src/emf/common/util/{AbstractTreeIterator,TreeIterator}.ts`,
`src/core/util/selection/{SelectionIterator,DefaultSelectionIterator}.ts`, colocated tests.

## Read-set
- `J/util/selection/*.java`.
- The EMF `AbstractTreeIterator` and `TreeIterator` source or Javadoc.
- `src/emf/common/util/{ECollections,BasicEList}.ts` (EMF port style), `src/guava/{Iterators,Sets}.ts`.
- `src/graph/{ElkEdge,ElkPort,ElkConnectableShape}.ts`.
- `docs/translation-rules.md` (§emf).

## Interface contracts (outputs)
- `abstract class AbstractTreeIterator<E>`, implementing a JS `Iterator<E>` and `Iterable<E>` plus Java's
  `hasNext()`, `next()` and `prune()`. Subclasses implement `getChildren(object): Iterator<E>`.
- `abstract class SelectionIterator extends AbstractTreeIterator<ElkGraphElement>`, with `attachVisitedSet(set)`.
- `new DefaultSelectionIterator(edge, addPorts, followEdgeDirection)`.

## Acceptance criteria
- Given the chain `e1 → p1 → e2 → p2 → e3` with `addPorts = true` and `followEdgeDirection = true`, when iterated,
  then the order is `p1, e2, p2, e3` (the root `e1` is excluded by `super(edge, false)`).
- Given a port cycle, when iterated, then iteration terminates, and each port is visited once.
- Given `prune()` called right after `next()` returns an edge, when iteration continues, then that edge's children
  are skipped, per EMF's contract.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
