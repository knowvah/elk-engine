// SPDX-License-Identifier: EPL-2.0
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { devAssert } from '../../../java/lang/DevAssert.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { CrossHierarchyEdgeComparator } from './CrossHierarchyEdgeComparator.js';
import type { ExternalPort } from './CompoundGraphPreprocessorExternalPort.js';
import { createDummyEdge, introduceHierarchicalEdgeSegment } from './CompoundGraphPreprocessorDummies.js';

/*
 * The label moving and the inner / outer hierarchical edge segment methods of `CompoundGraphPreprocessor` (mission 7h,
 * T6, H11): Java `:242-336` and `:338-610`. Each function is the Java method of the same name; `self` is the processor
 * whose `crossHierarchyMap` the Java reads as `this`. Where a Java method exceeds a complexity limit it is split into
 * file-local helpers at its loop bodies, keeping the statement order (each helper names its Java lines).
 */

/**
 * The iteration order of the identity-hashed containers (H3): `'java'` is insertion order (the oracle's order under
 * `-XX:hashCode=2`); `'reversed'` reverses it (the twin that shows order dependence).
 */
export type CompoundIterationOrder = 'java' | 'reversed' | PreprocessorReversal;

/**
 * Finer-grained form of the `reversed` twin (T9): names the iterations to reverse. `dummyNodeMap` is `dummyNodeMap.entrySet()`
 * (Java `:129`), `keys` is `crossHierarchyMap.keySet()` (`:252`), `values` each key's values before the sort (`:258-259`).
 * `'reversed'` is all three; `'java'` none.
 */
export interface PreprocessorReversal {
  readonly dummyNodeMap?: boolean;
  readonly keys?: boolean;
  readonly values?: boolean;
}

/** Whether the iteration of `site` is reversed under `order`. */
export const reversesSite = (order: CompoundIterationOrder, site: keyof PreprocessorReversal): boolean =>
  order === 'reversed' || (typeof order === 'object' && order[site] === true);

const inOrder = <T>(items: readonly T[], order: CompoundIterationOrder, site: keyof PreprocessorReversal): T[] =>
  reversesSite(order, site) ? [...items].reverse() : [...items];

/**
 * Moves all labels of the original edges to the appropriate dummy edges and removes the original edges from the graph.
 * AD-10 (H3): `crossHierarchyMap.keySet()` (Java `:252`) and each key's values (`:257-258`, before the sort at `:259`)
 * iterate in insertion order, or reversed when `order` is `'reversed'`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function moveLabelsAndRemoveOriginalEdges(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  order: CompoundIterationOrder,
): void {
  const crossHierarchyMap = self.crossHierarchyMap!;
  // move all labels of the original edges to the appropriate dummy edges and remove the original
  // edges from the graph
  for (const origEdge of inOrder(crossHierarchyMap.keySet(), order, 'keys')) {
    // if the original edge had any labels, we need to move them to the newly introduced edge
    // segments
    if (origEdge.getLabels().length > 0) {
      // retrieve and sort the edge segments introduced for the original edge
      const edgeSegments = inOrder([...crossHierarchyMap.get(origEdge)], order, 'values');
      const comparator = new CrossHierarchyEdgeComparator(graph);
      edgeSegments.sort((a, b) => comparator.compare(a, b));

      moveLabels(origEdge, edgeSegments);
    }

    // remove original edge
    origEdge.setSource(null);
    origEdge.setTarget(null);
  }
}

/** The label loop of `moveLabelsAndRemoveOriginalEdges` (Java `:261-297`), split for the NLOC and CCN limits. */
function moveLabels(origEdge: LEdge, edgeSegments: CrossHierarchyEdge[]): void {
  // iterate over the labels and move them to the edge segments
  const labelIterator = new ArrayListIterator(origEdge.getLabels());
  while (labelIterator.hasNext()) {
    const currLabel = labelIterator.next();

    // find the index of the dummy edge we will move the label to
    const targetDummyEdgeIndex = targetDummyEdgeIndexOf(currLabel, edgeSegments);

    // move the label if we were lucky enough to find a new home for it
    if (targetDummyEdgeIndex !== -1) {
      const targetSegment = edgeSegments[targetDummyEdgeIndex]!;
      targetSegment.getEdge().getLabels().push(currLabel);
      targetSegment
        .getEdge()
        .getSource()!
        .getNode()!
        .getGraph()!
        .getProperty(InternalProperties.GRAPH_PROPERTIES)
        .add(GraphProperties.END_LABELS);
      targetSegment
        .getEdge()
        .getSource()!
        .getNode()!
        .getGraph()!
        .getProperty(InternalProperties.GRAPH_PROPERTIES)
        .add(GraphProperties.CENTER_LABELS);

      labelIterator.remove();
      currLabel.setProperty(InternalProperties.ORIGINAL_LABEL_EDGE, origEdge);
    }
  }
}

/** The `switch` on the label placement in `moveLabelsAndRemoveOriginalEdges` (Java `:267-283`). */
function targetDummyEdgeIndexOf(currLabel: LLabel, edgeSegments: CrossHierarchyEdge[]): number {
  let targetDummyEdgeIndex = -1;
  switch (currLabel.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT)) {
    case EdgeLabelPlacement.HEAD:
      targetDummyEdgeIndex = edgeSegments.length - 1;
      break;

    case EdgeLabelPlacement.CENTER:
      targetDummyEdgeIndex = getShallowestEdgeSegment(edgeSegments);
      break;

    case EdgeLabelPlacement.TAIL:
      targetDummyEdgeIndex = 0;
      break;

    default:
    // we have no idea what to do with the label, so ignore it
  }
  return targetDummyEdgeIndex;
}

/**
 * Determines the index of the shallowest edge segment in a `CrossHierarchyEdge`. The shallowest segment is the last
 * edge segement with type set to `PortType.OUTPUT`. If no such element exists, the first segment is the shallowest
 * segment.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function getShallowestEdgeSegment(edgeSegments: readonly CrossHierarchyEdge[]): number {
  let result = -1;
  let index = 0;

  for (const crossHierarchyEdge of edgeSegments) {
    if (crossHierarchyEdge.getType() === PortType.INPUT) {
      // We have an edge pointing downwards here.
      // If this is the first segment we take this element.
      // If there was a segement before, we take that one
      result = index === 0 ? 0 : index - 1;
      break;
    } else if (index === edgeSegments.length - 1) {
      // If this is the last segment and we didn't find a descending edge,
      // This edge is always ascending. Place the label at the last
      // segment here.
      result = index;
    }
    index += 1;
  }

  return result;
}

////////////////////////////////////////////////////////////////////////////////////////////
// Inner Hierarchical Edge Segment Processing

/** The state the split loop bodies of `processInnerHierarchicalEdgeSegments` share (its Java locals and parameters). */
interface InnerSegmentContext {
  readonly self: CompoundGraphPreprocessor;
  readonly graph: LGraph;
  readonly parentNode: LNode | null;
  readonly containedExternalPorts: readonly ExternalPort[];
  readonly createdExternalPorts: ExternalPort[];
}

/**
 * Deals with the inner segments of hierarchical edges by breaking them between external ports. For each external port
 * contained in child nodes, this method adds appropriate new external ports and / or dummy edges.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function processInnerHierarchicalEdgeSegments(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  parentNode: LNode | null,
  containedExternalPorts: readonly ExternalPort[],
  exportedExternalPorts: ExternalPort[],
): void {
  // we remember the ports and the dummy nodes we create to add them to the graph afterwards
  // (this is not strictly necessary, but allows us to reuse methods we also use for outer
  // hierarchy edge segments)
  const createdExternalPorts: ExternalPort[] = [];
  const context: InnerSegmentContext = { self, graph, parentNode, containedExternalPorts, createdExternalPorts };

  // iterate over the list of contained external ports
  for (const externalPort of containedExternalPorts) {
    // we process output ports and input ports a bit differently
    if (externalPort.type === PortType.OUTPUT) {
      innerOutputSegments(context, externalPort);
    } else {
      innerInputSegments(context, externalPort);
    }
  }

  // add dummy nodes and exported external ports
  for (const externalPort of createdExternalPorts) {
    if (!graph.getLayerlessNodes().includes(externalPort.dummyNode)) {
      graph.getLayerlessNodes().push(externalPort.dummyNode);
    }

    if (externalPort.exported) {
      exportedExternalPorts.push(externalPort);
    }
  }
}

/** The output-port arm of `processInnerHierarchicalEdgeSegments` (Java `:367`, `:370-405`), split for the CCN limit. */
function innerOutputSegments(context: InnerSegmentContext, externalPort: ExternalPort): void {
  const { self, graph, parentNode } = context;
  let currentExternalPort: ExternalPort | null = null;
  // iterate over the port's original edges
  for (const outEdge of externalPort.origEdges) {
    /* at this point, we distinguish three cases:
     *  1. The edge connects to a direct child of the parent node.
     *  2. connects two external ports of direct children of the parent node.
     *  3. The edge comes from a child node and either connects directly to the parent
     *     node or leaves it.
     */
    const targetNode = outEdge.getTarget()!.getNode()!;
    if (targetNode.getGraph() === graph) {
      // case 1: edge connects to a direct chlid
      const targetPort = outEdge.getTarget()!;
      connectChild(self, { graph, externalPort, origEdge: outEdge, sourcePort: externalPort.dummyPort, targetPort });
    } else if (parentNode === null || LGraphUtil.isDescendant(targetNode, parentNode)) {
      // case 2: edge connects two direct children
      connectSiblings(self, graph, externalPort, context.containedExternalPorts, outEdge);
    } else {
      // case 3: edge connects to parent node or to the outside world
      const newExternalPort = introduceHierarchicalEdgeSegment(self, {
        graph,
        parentNode,
        origEdge: outEdge,
        oppositePort: externalPort.dummyPort,
        portType: PortType.OUTPUT,
        defaultExternalPort: currentExternalPort,
      });
      if (newExternalPort !== currentExternalPort) {
        context.createdExternalPorts.push(newExternalPort);
      }

      // the port is our new current external port if it is exported
      if (newExternalPort.exported) {
        currentExternalPort = newExternalPort;
      }
    }
  }
}

/** The input-port arm of `processInnerHierarchicalEdgeSegments` (Java `:367`, `:406-443`), split for the CCN limit. */
function innerInputSegments(context: InnerSegmentContext, externalPort: ExternalPort): void {
  const { self, graph, parentNode } = context;
  let currentExternalPort: ExternalPort | null = null;
  // iterate over the port's original edges
  for (const inEdge of externalPort.origEdges) {
    /* at this point, we distinguish three cases:
     *  1. The edge comes from a direct child of the parent node.
     *  2. connects two external ports of direct children of the parent node. (we don't
     *     deal with that case here; the code that handles output ports above does that)
     *  3. The edge comes from the parent node or from the outside.
     */
    const sourceNode = inEdge.getSource()!.getNode()!;
    if (sourceNode.getGraph() === graph) {
      // case 1: edge comes from a direct child
      const sourcePort = inEdge.getSource()!;
      connectChild(self, { graph, externalPort, origEdge: inEdge, sourcePort, targetPort: externalPort.dummyPort });
    } else if (parentNode === null || LGraphUtil.isDescendant(sourceNode, parentNode)) {
      // case 2: edge connects two direct children; this case is handled in the code
      //         for output ports above, so there's nothing to do here
      continue;
    } else {
      // case 3: edge comes from the parent node or from the outside
      const newExternalPort = introduceHierarchicalEdgeSegment(self, {
        graph,
        parentNode,
        origEdge: inEdge,
        oppositePort: externalPort.dummyPort,
        portType: PortType.INPUT,
        defaultExternalPort: currentExternalPort,
      });
      if (newExternalPort !== currentExternalPort) {
        context.createdExternalPorts.push(newExternalPort);
      }

      // the port is our new current external port if it is exported
      if (newExternalPort.exported) {
        currentExternalPort = newExternalPort;
      }
    }
  }
}

/** The parameters of `connectChild` besides `self`, named as in Java (five; with `self` one over the limit). */
export interface ConnectChildArgs {
  /** the graph whose child to connect. */
  readonly graph: LGraph;
  /** the external port that provides the other end of the connection. */
  readonly externalPort: ExternalPort;
  /** the original hierarchy-crossing edge. */
  readonly origEdge: LEdge;
  /** the source port the edge shall be connected to. */
  readonly sourcePort: LPort;
  /** the target port the edge shall be connected to. */
  readonly targetPort: LPort;
}

/**
 * Connects an external port with a child node of the given graph. To this end, a new dummy edge is inserted and
 * associated with the original hierarchy-crossing edge in the cross hierarchy map.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function connectChild(self: CompoundGraphPreprocessor, args: ConnectChildArgs): void {
  const { graph, externalPort, origEdge, sourcePort, targetPort } = args;
  // add new dummy edge and connect properly
  const dummyEdge = createDummyEdge(graph, origEdge);
  dummyEdge.setSource(sourcePort);
  dummyEdge.setTarget(targetPort);

  self.crossHierarchyMap!.put(origEdge, new CrossHierarchyEdge(dummyEdge, graph, externalPort.type));
}

/**
 * Connects external ports of two child nodes of the given graph. To this end, the provided list of external ports is
 * searched for the counterpart of the provided external output port, and a new dummy edge is created to connect the
 * two. The dummy edge is associated with the original hierarchy-crossing edge in the cross hierarchy map.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function connectSiblings(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  externalOutputPort: ExternalPort,
  containedExternalPorts: readonly ExternalPort[],
  origEdge: LEdge,
): void {
  // find the opposite external port
  let targetExternalPort: ExternalPort | null = null;
  for (const externalPort2 of containedExternalPorts) {
    if (externalPort2 !== externalOutputPort && externalPort2.origEdges.includes(origEdge)) {
      targetExternalPort = externalPort2;
      break;
    }
  }
  // a null port throws here as the Java's NullPointerException would
  devAssert(() => targetExternalPort!.type === PortType.INPUT);

  // add new dummy edge and connect properly
  const dummyEdge = createDummyEdge(graph, origEdge);
  dummyEdge.setSource(externalOutputPort.dummyPort);
  dummyEdge.setTarget(targetExternalPort!.dummyPort);

  self.crossHierarchyMap!.put(origEdge, new CrossHierarchyEdge(dummyEdge, graph, externalOutputPort.type));
}

////////////////////////////////////////////////////////////////////////////////////////////
// Outer Hierarchical Edge Segment Processing

/** The state the split loop bodies of `processOuterHierarchicalEdgeSegments` share (its Java locals and parameters). */
interface OuterSegmentContext {
  readonly self: CompoundGraphPreprocessor;
  readonly graph: LGraph;
  readonly parentNode: LNode;
  readonly createdExternalPorts: ExternalPort[];
}

/**
 * Deals with the outer segments of hierarchical edges by breaking them at their source or target. For each
 * hierarchical edge that starts or ends at one of the graph's children, this method adds appropriate new external
 * ports and / or dummy edges to the graph.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function processOuterHierarchicalEdgeSegments(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  parentNode: LNode,
  exportedExternalPorts: ExternalPort[],
): void {
  // we need to remember the ports and the dummy nodes we create to add them to the graph
  // afterwards (to avoid concurrent modification exceptions)
  const createdExternalPorts: ExternalPort[] = [];
  const context: OuterSegmentContext = { self, graph, parentNode, createdExternalPorts };

  // iterate over all ports of the graph's child nodes
  for (const childNode of graph.getLayerlessNodes()) {
    for (const childPort of childNode.getPorts()) {
      // we treat outgoing and incoming edges separately
      outerOutgoingSegments(context, childPort);
      outerIncomingSegments(context, childPort);
    }
  }

  // add dummy nodes and exported external ports
  for (const externalPort of createdExternalPorts) {
    if (!graph.getLayerlessNodes().includes(externalPort.dummyNode)) {
      graph.getLayerlessNodes().push(externalPort.dummyNode);
    }

    if (externalPort.exported) {
      exportedExternalPorts.push(externalPort);
    }
  }
}

/** The outgoing-edge loop of `processOuterHierarchicalEdgeSegments` (Java `:552-573`), split for the CCN limit. */
function outerOutgoingSegments(context: OuterSegmentContext, childPort: LPort): void {
  const { self, graph, parentNode } = context;
  let currentExternalOutputPort: ExternalPort | null = null;
  for (const outEdge of LGraphUtil.toEdgeArray(childPort.getOutgoingEdges())) {
    if (!LGraphUtil.isDescendant(outEdge.getTarget()!.getNode()!, parentNode)) {
      // the edge goes to the outside or to the parent node itself, so create an
      // external port if necessary and introduce a new dummy edge
      const newExternalPort = introduceHierarchicalEdgeSegment(self, {
        graph,
        parentNode,
        origEdge: outEdge,
        oppositePort: outEdge.getSource()!,
        portType: PortType.OUTPUT,
        defaultExternalPort: currentExternalOutputPort,
      });
      if (newExternalPort !== currentExternalOutputPort) {
        context.createdExternalPorts.push(newExternalPort);
      }

      // the port is our new current external port if it is exported
      if (newExternalPort.exported) {
        currentExternalOutputPort = newExternalPort;
      }
    }
  }
}

/** The incoming-edge loop of `processOuterHierarchicalEdgeSegments` (Java `:575-596`), split for the CCN limit. */
function outerIncomingSegments(context: OuterSegmentContext, childPort: LPort): void {
  const { self, graph, parentNode } = context;
  let currentExternalInputPort: ExternalPort | null = null;
  for (const inEdge of LGraphUtil.toEdgeArray(childPort.getIncomingEdges())) {
    if (!LGraphUtil.isDescendant(inEdge.getSource()!.getNode()!, parentNode)) {
      // the edge comes from the outside or from the parent node itself, so create an
      // external port if necessary and introduce a new dummy edge
      const newExternalPort = introduceHierarchicalEdgeSegment(self, {
        graph,
        parentNode,
        origEdge: inEdge,
        oppositePort: inEdge.getTarget()!,
        portType: PortType.INPUT,
        defaultExternalPort: currentExternalInputPort,
      });
      if (newExternalPort !== currentExternalInputPort) {
        context.createdExternalPorts.push(newExternalPort);
      }

      // the port is our new current external port if it is exported
      if (newExternalPort.exported) {
        currentExternalInputPort = newExternalPort;
      }
    }
  }
}
