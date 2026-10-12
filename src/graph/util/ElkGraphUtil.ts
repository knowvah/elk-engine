// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import * as Iterables from '../../guava/Iterables.js';
import * as Iterators from '../../guava/Iterators.js';
import * as Lists from '../../guava/Lists.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { Ordinal } from '../../java/util/EnumSet.js';
import { ArrayListIterator } from '../../java/util/ListIterator.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import type { ElkBendPoint } from '../ElkBendPoint.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import { type ElkEdge, isElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { type ElkGraphElement, isElkGraphElement } from '../ElkGraphElement.js';
import { ElkGraphFactory } from '../ElkGraphFactory.js';
import { type ElkLabel, isElkLabel } from '../ElkLabel.js';
import { type ElkNode, isElkNode } from '../ElkNode.js';
import { type ElkPort, isElkPort } from '../ElkPort.js';
// Loads the impl classes and sets `ElkGraphFactory.eINSTANCE` (Java initializes it with the interface).
import '../impl/ElkGraphFactoryImpl.js';
import { ElkPropertyToValueMapEntryImpl } from '../impl/ElkPropertyToValueMapEntryImpl.js';
import { isAdvanced } from '../properties/AdvancedPropertyValue.js';
import { isExperimental } from '../properties/ExperimentalPropertyValue.js';

// Utility methods that make using the ElkGraph data structure easier (factory, containment, convenience).

// ---- Creation ----

/** Creates a new root node that will represent a graph. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createGraph(): ElkNode {
  return createNode(null);
}

/** Creates a new node in the graph represented by `parent` (if not `null`). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createNode(parent: ElkNode | null): ElkNode {
  const node = ElkGraphFactory.eINSTANCE.createElkNode();
  if (parent !== null) {
    node.setParent(parent);
  }
  return node;
}

/** Creates a new port for `parent` (if not `null`). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createPort(parent: ElkNode | null): ElkPort {
  const port = ElkGraphFactory.eINSTANCE.createElkPort();
  if (parent !== null) {
    port.setParent(parent);
  }
  return port;
}

/** Java `createLabel(ElkGraphElement)`: a new label for `parent` (if not `null`). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createLabel(parent: ElkGraphElement | null): ElkLabel {
  const label = ElkGraphFactory.eINSTANCE.createElkLabel();
  if (parent !== null) {
    label.setParent(parent);
  }
  return label;
}

/** Java `createLabel(String, ElkGraphElement)` (renamed: arity clash): a new label with `text`. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createLabelWithText(text: string | null, parent: ElkGraphElement | null): ElkLabel {
  const label = createLabel(parent);
  label.setText(text);
  return label;
}

/** Creates a new edge contained in `containingNode` (if not `null`), connecting nothing yet. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createEdge(containingNode: ElkNode | null): ElkEdge {
  const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
  if (containingNode !== null) {
    edge.setContainingNode(containingNode);
  }
  return edge;
}

/** Creates an edge from `source` to `target` and sets its containment; `null` throws `TypeError` (D10). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createSimpleEdge(source: ElkConnectableShape | null, target: ElkConnectableShape | null): ElkEdge {
  requireNonNull(source, 'source cannot be null');
  requireNonNull(target, 'target cannot be null');
  const edge = createEdge(null);
  edge.getSources().add(source);
  edge.getTargets().add(target);
  updateContainment(edge);
  return edge;
}

/** Creates a hyperedge from `sources` to `targets` and sets its containment; `null` throws `TypeError` (D10). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createHyperedge(
  sources: Iterable<ElkConnectableShape> | null,
  targets: Iterable<ElkConnectableShape> | null,
): ElkEdge {
  requireNonNull(sources, 'sources cannot be null');
  requireNonNull(targets, 'targets cannot be null');
  const edge = createEdge(null);
  const edgeSources = edge.getSources();
  for (const source of sources) {
    edgeSources.add(source);
  }
  const edgeTargets = edge.getTargets();
  for (const target of targets) {
    edgeTargets.add(target);
  }
  updateContainment(edge);
  return edge;
}

/** Creates a new edge section and adds it to `edge` (if not `null`). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createEdgeSection(edge: ElkEdge | null): ElkEdgeSection {
  const section = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
  if (edge !== null) {
    edge.getSections().add(section);
  }
  return section;
}

/** Returns the edge's first section (created if none), optionally reset and with the others removed. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function firstEdgeSection(edge: ElkEdge, resetSection: boolean, removeOtherSections: boolean): ElkEdgeSection {
  if (edge.getSections().isEmpty()) {
    // Create and return a new section
    return createEdgeSection(edge);
  } else {
    // Retrieve the first section
    const section = edge.getSections().get(0);
    if (resetSection) {
      section.getBendPoints().clear();
      section.setStartLocation(0, 0);
      section.setEndLocation(0, 0);
    }
    if (removeOtherSections) {
      const sections = edge.getSections();
      while (sections.size() > 1) {
        sections.removeAt(sections.size() - 1);
      }
    }
    return section;
  }
}

/** Java's two overloads: `createBendPoint(section)` delegates with `(0, 0)`. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function createBendPoint(edgeSection: ElkEdgeSection | null): ElkBendPoint;
function createBendPoint(edgeSection: ElkEdgeSection | null, x: number, y: number): ElkBendPoint;
function createBendPoint(edgeSection: ElkEdgeSection | null, x?: number, y?: number): ElkBendPoint {
  if (x === undefined || y === undefined) {
    return createBendPoint(edgeSection, 0, 0);
  }
  const bendPoint = ElkGraphFactory.eINSTANCE.createElkBendPoint();
  bendPoint.set(x, y);
  if (edgeSection !== null) {
    edgeSection.getBendPoints().add(bendPoint);
  }
  return bendPoint;
}

// ---- Edge Containment ----

/** Java `Objects.requireNonNull(o, message)`; a `null` throws `TypeError` (D10). */
function requireNonNull<T>(o: T | null, message: string): asserts o is T {
  if (o === null) {
    throw new TypeError(message);
  }
}

/** Changes an edge's containment to the one returned by {@link findBestEdgeContainment}. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function updateContainment(edge: ElkEdge | null): void {
  requireNonNull(edge, 'edge cannot be null');
  edge.setContainingNode(findBestEdgeContainment(edge));
}

/** The node the edge should best be contained in (the lowest common ancestor of its incident shapes), `null` across graphs. `connectableShapeToNode(...) as ElkNode`: a parentless port fails with a `TypeError` there, as Java's NPE. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function findBestEdgeContainment(edge: ElkEdge | null): ElkNode | null {
  requireNonNull(edge, 'edge cannot be null');
  // We start with corner cases: an edge which is not connected to anything and an edge which is
  // connected to just one shape.
  switch (edge.getSources().size() + edge.getTargets().size()) {
    case 0:
      // We need at least one to work with
      throw new IllegalArgumentException('The edge must have at least one source or target.');
    case 1:
      // Return the parent of the only incident thing
      if (edge.getSources().isEmpty()) {
        return (connectableShapeToNode(edge.getTargets().get(0)) as ElkNode).getParent();
      } else {
        return (connectableShapeToNode(edge.getSources().get(0)) as ElkNode).getParent();
      }
  }
  // At least two incident shapes: the simple common cases first (same parent, or one is the
  // other's parent), then the general case.
  if (edge.getSources().size() === 1 && edge.getTargets().size() === 1) {
    const sourceNode = connectableShapeToNode(edge.getSources().get(0)) as ElkNode;
    const targetNode = connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;
    if (sourceNode.getParent() === targetNode.getParent()) {
      return sourceNode.getParent();
    } else if (sourceNode === targetNode.getParent()) {
      return sourceNode;
    } else if (targetNode === sourceNode.getParent()) {
      return targetNode;
    }
  }
  return findCommonAncestorOfIncidentShapes(edge);
}

/** The general case of {@link findBestEdgeContainment}, split out for the 30-NLOC limit: keep the highest common ancestor found so far over all incident shapes. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function findCommonAncestorOfIncidentShapes(edge: ElkEdge): ElkNode | null {
  const incidentShapes = allIncidentShapes(edge)[Symbol.iterator]();
  let commonAncestor = connectableShapeToNode(incidentShapes.next().value as ElkConnectableShape) as ElkNode;
  for (let next = incidentShapes.next(); next.done !== true; next = incidentShapes.next()) {
    const incidentNode = connectableShapeToNode(next.value) as ElkNode;
    // Check if the current common ancestor is not an ancestor to the new node, in which case we need to act
    if (incidentNode !== commonAncestor && !isDescendant(incidentNode, commonAncestor)) {
      if (incidentNode.getParent() === commonAncestor.getParent()) {
        // The two nodes are siblings, the common ancestor is their parent
        commonAncestor = incidentNode.getParent() as ElkNode;
      } else {
        const lowest = findLowestCommonAncestor(commonAncestor, incidentNode);
        if (lowest === null) {
          // The nodes are not part of the same graph. Abort.
          return null;
        }
        commonAncestor = lowest;
      }
    }
  }
  return commonAncestor;
}

/** The lowest common ancestor of the two nodes, or `null` if their root nodes differ. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function findLowestCommonAncestor(node1: ElkNode, node2: ElkNode): ElkNode | null {
  // Retrieve iterators over the node ancestors
  const ancestors1 = Lists.newArrayList(new AncestorIterator(node1, true));
  const iterator1 = new ArrayListIterator(ancestors1, ancestors1.length);
  const ancestors2 = Lists.newArrayList(new AncestorIterator(node2, true));
  const iterator2 = new ArrayListIterator(ancestors2, ancestors2.length);
  // Traverse the ancestor hierarchies from the end as longs as the elements we find are the same
  let commonAncestor: ElkNode | null = null;
  while (iterator1.hasPrevious() && iterator2.hasPrevious()) {
    const ancestor1 = iterator1.previous();
    const ancestor2 = iterator2.previous();
    if (ancestor1 === ancestor2) {
      commonAncestor = ancestor1;
    } else {
      // The ancestral lines differ; no need to continue
      break;
    }
  }
  return commonAncestor;
}

// ---- Convenience ----

/** All edges incoming to a node, directly or through a port. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function allIncomingEdges(node: ElkNode): Iterable<ElkEdge> {
  const incomingEdgeIterables = Lists.newArrayListWithCapacity<Iterable<ElkEdge>>(1 + node.getPorts().size());
  incomingEdgeIterables.push(node.getIncomingEdges());
  for (const port of node.getPorts()) {
    incomingEdgeIterables.push(port.getIncomingEdges());
  }
  return Iterables.concatAll(incomingEdgeIterables);
}

/** All edges outgoing from a node, directly or through a port. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function allOutgoingEdges(node: ElkNode): Iterable<ElkEdge> {
  const outgoingEdgeIterables = Lists.newArrayListWithCapacity<Iterable<ElkEdge>>(1 + node.getPorts().size());
  outgoingEdgeIterables.push(node.getOutgoingEdges());
  for (const port of node.getPorts()) {
    outgoingEdgeIterables.push(port.getOutgoingEdges());
  }
  return Iterables.concatAll(outgoingEdgeIterables);
}

/** Java's two overloads, chosen by the static argument type: `allIncidentEdges(ElkNode)` (through the node's ports too) and `allIncidentEdges(ElkConnectableShape)`. The port dispatches on the runtime type; every ELK caller passes a statically typed `ElkNode` or `ElkPort`, so the choice is the same. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function allIncidentEdges(shape: ElkConnectableShape): Iterable<ElkEdge> {
  if (isElkNode(shape)) {
    return Iterables.concat(allOutgoingEdges(shape), allIncomingEdges(shape));
  }
  return Iterables.concat(shape.getIncomingEdges(), shape.getOutgoingEdges());
}

/** All connectable shapes the edge is incident to: sources, then targets. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function allIncidentShapes(edge: ElkEdge): Iterable<ElkConnectableShape> {
  return Iterables.concat<ElkConnectableShape>(edge.getSources(), edge.getTargets());
}

/** All sections incident to the section: incoming, then outgoing. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function allIncidentSections(section: ElkEdgeSection): Iterable<ElkEdgeSection> {
  return Iterables.concat<ElkEdgeSection>(section.getIncomingSections(), section.getOutgoingSections());
}

/** Whether `child` is a direct or indirect child of `ancestor` (not reflexive). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function isDescendant(child: ElkNode, ancestor: ElkNode): boolean {
  // Go up the hierarchy and see if we find the ancestor
  let current = child;
  while (current.getParent() !== null) {
    current = current.getParent() as ElkNode;
    if (current === ancestor) {
      return true;
    }
  }
  // Reached the root node without finding the ancestor
  return false;
}

/** The node representing the graph `element` is part of, or `null` (a root node or an invalid structure). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function containingGraph(element: ElkGraphElement | null): ElkNode | null {
  let current = element;
  while (current !== null) {
    if (isElkEdge(current)) {
      // Edges have a direct reference to their containing graph
      return current.getContainingNode();
    } else if (isElkNode(current)) {
      // A node's container is its graph
      return current.getParent();
    } else if (isElkGraphElement(current.eContainer())) {
      // Walk up the hierarchy
      current = current.eContainer() as ElkGraphElement;
    } else {
      // Something's wrong
      return null;
    }
  }
  // --> current is null
  return null;
}

/** The node itself, or a port's parent node (possibly `null`); `null` throws `TypeError` (D10). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function connectableShapeToNode(connectableShape: ElkConnectableShape | null): ElkNode | null {
  if (isElkNode(connectableShape)) {
    return connectableShape;
  } else if (isElkPort(connectableShape)) {
    return connectableShape.getParent();
  } else if (connectableShape === null) {
    throw new TypeError('connectableShape cannot be null');
  } else {
    // In case the meta model is changed in the distant future...
    throw new UnsupportedOperationException('Only support nodes and ports.');
  }
}

/** The port itself, or `null` for any other shape; `null` throws `TypeError` (D10). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function connectableShapeToPort(connectableShape: ElkConnectableShape | null): ElkPort | null {
  if (isElkPort(connectableShape)) {
    return connectableShape;
  } else if (connectableShape === null) {
    throw new TypeError('connectableShape cannot be null');
  } else {
    return null;
  }
}

/** The source node of a simple edge (one source, one target), whether it connects to a port or a node. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function getSourceNode(simpleEdge: ElkEdge): ElkNode | null {
  if (simpleEdge.getSources().size() !== 1 || simpleEdge.getTargets().size() !== 1) {
    throw new IllegalArgumentException("Passed edge is not 'simple'.");
  }
  return connectableShapeToNode(simpleEdge.getSources().get(0));
}

/** The target node of a simple edge, whether it connects to a port or a node. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function getTargetNode(simpleEdge: ElkEdge): ElkNode | null {
  if (simpleEdge.getSources().size() !== 1 || simpleEdge.getTargets().size() !== 1) {
    throw new IllegalArgumentException("Passed edge is not 'simple'.");
  }
  return connectableShapeToNode(simpleEdge.getTargets().get(0));
}

/** The source port of a simple edge, `null` if it connects directly to a node. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function getSourcePort(simpleEdge: ElkEdge): ElkPort | null {
  if (simpleEdge.getSources().size() !== 1 || simpleEdge.getTargets().size() !== 1) {
    throw new IllegalArgumentException("Passed edge is not 'simple'.");
  }
  return connectableShapeToPort(simpleEdge.getSources().get(0));
}

/** The target port of a simple edge, `null` if it connects directly to a node. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function getTargetPort(simpleEdge: ElkEdge): ElkPort | null {
  if (simpleEdge.getSources().size() !== 1 || simpleEdge.getTargets().size() !== 1) {
    throw new IllegalArgumentException("Passed edge is not 'simple'.");
  }
  return connectableShapeToPort(simpleEdge.getTargets().get(0));
}

/** The first non-label ancestor of a (possibly nested) label, or `null` if there is none. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function elementLabeledBy(label: ElkLabel): ElkGraphElement | null {
  let element: EObject | null = label.getParent();
  while (isElkLabel(element)) {
    element = element.eContainer();
  }
  // Ensure that the element we've found is actually an ElkGraphElement
  return isElkGraphElement(element) ? element : null;
}

// ---- Iteration ----

/** `PropertiesSkippingTreeIterator.getChildren`: the object's contents without the `EMapPropertyHolder.properties` feature. Java filters that feature on EMF's feature iterator; the port's `eContents()` is a flat snapshot (D4), and the feature holds exactly the `ElkPropertyToValueMapEntry` objects, so those are filtered out. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function getChildren(object: EObject): Iterator<EObject> {
  return Iterators.filter(object.eContents().iterator(), (o) => !(o instanceof ElkPropertyToValueMapEntryImpl));
}

/** The private `PropertiesSkippingTreeIterator` (an EMF `AbstractTreeIterator`) as a generator: depth-first pre-order, the root first when `includeRoot`; an element's children are fetched when it is returned (the root's before it is returned). `remove()`/`prune()` have no generator counterpart. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function* propertiesSkippingTreeIterator(object: EObject, includeRoot: boolean): Generator<EObject, void, undefined> {
  const stack: Array<Iterator<EObject>> = [getChildren(object)];
  if (includeRoot) {
    yield object;
  }
  while (stack.length > 0) {
    const next = (stack[stack.length - 1] as Iterator<EObject>).next();
    if (next.done === true) {
      stack.pop();
    } else {
      stack.push(getChildren(next.value));
      yield next.value;
    }
  }
}

/** An iterator over the EMF tree rooted at `root` which skips properties. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function propertiesSkippingIteratorFor(root: EObject, includeRoot: boolean): IterableIterator<EObject> {
  return propertiesSkippingTreeIterator(root, includeRoot);
}

// ---- Property values ----

/** Whether the enum constant is marked `@AdvancedPropertyValue` (the D7 registry stands in for reflection). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function isAdvancedPropertyValue(enumValue: Ordinal | null): boolean {
  if (enumValue !== null) {
    return isAdvanced(enumValue);
  }
  return false;
}

/** Whether the enum constant is marked `@ExperimentalPropertyValue` (the D7 registry stands in for reflection). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
function isExperimentalPropertyValue(enumValue: Ordinal | null): boolean {
  if (enumValue !== null) {
    return isExperimental(enumValue);
  }
  return false;
}

// ---- Privates ----

/** Walks up the ancestor tree from a starting node (itself first when `includeNode`). Java's `Iterator`; `[Symbol.iterator]` drives it as Guava's `Lists.newArrayList(Iterator)` does. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
class AncestorIterator implements Iterable<ElkNode> {
  /** The next node we will return. */
  private nextNode: ElkNode | null;

  constructor(startNode: ElkNode, includeNode: boolean) {
    this.nextNode = includeNode ? startNode : startNode.getParent();
  }

  hasNext(): boolean {
    return this.nextNode !== null;
  }

  next(): ElkNode {
    if (this.nextNode === null) {
      throw new NoSuchElementException('There is no more element.');
    }
    const next = this.nextNode;
    this.nextNode = this.nextNode.getParent();
    return next;
  }

  *[Symbol.iterator](): Generator<ElkNode, void, undefined> {
    while (this.hasNext()) {
      yield this.next();
    }
  }
}

/** The public statics of Java's `ElkGraphUtil`, grouped by its sections. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java */
const CREATION = { createGraph, createNode, createPort, createLabel, createLabelWithText, createEdge } as const;
const EDGES = { createSimpleEdge, createHyperedge, createEdgeSection, firstEdgeSection, createBendPoint } as const;
const CONTAINMENT = { updateContainment, findBestEdgeContainment, findLowestCommonAncestor, allIncomingEdges } as const;
const INCIDENCE = { allOutgoingEdges, allIncidentEdges, allIncidentShapes, allIncidentSections } as const;
const STRUCTURE = { isDescendant, containingGraph, connectableShapeToNode, connectableShapeToPort } as const;
const SIMPLE_EDGES = { getSourceNode, getTargetNode, getSourcePort, getTargetPort, elementLabeledBy } as const;
const ITERATION = { propertiesSkippingIteratorFor, isAdvancedPropertyValue, isExperimentalPropertyValue } as const;
export const ElkGraphUtil = {
  ...CREATION,
  ...EDGES,
  ...CONTAINMENT,
  ...INCIDENCE,
  ...STRUCTURE,
  ...SIMPLE_EDGES,
  ...ITERATION,
} as const;
