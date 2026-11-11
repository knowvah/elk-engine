// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { identity } from '../../../java/util/HashStrategy.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';
import type { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { JAVA_NULL_VECTOR, processInsideSelfLoops } from './CompoundGraphPreprocessorDummies.js';
import type { ExternalPort } from './CompoundGraphPreprocessorExternalPort.js';
import {
  moveLabelsAndRemoveOriginalEdges,
  processInnerHierarchicalEdgeSegments,
  processOuterHierarchicalEdgeSegments,
  reversesSite,
  type CompoundIterationOrder,
} from './CompoundGraphPreprocessorSegments.js';

/*
 * The entry of `CompoundGraphPreprocessor` (mission 7h, T6, H11): Java `process` (`:102-121`),
 * `setSidesOfPortsToSidesOfDummyNodes` (`:123-142`) and `transformHierarchyEdges` (`:144-240`). The facade's
 * `process` keeps throwing until T8, which points it at `processCompoundGraphPreprocessor`. The remaining methods are
 * in `CompoundGraphPreprocessorSegments.ts` (labels, inner and outer segments) and `CompoundGraphPreprocessorDummies.ts`
 * (inside self loops, segment introduction, dummies); the nested `ExternalPort` is
 * `CompoundGraphPreprocessorExternalPort.ts`. `transformHierarchyEdges` stays a recursion as in the Java: its depth is
 * the depth of the graph's hierarchy, not of a graph traversal (F11 asks for explicit stacks for traversals).
 */

/**
 * Preprocess a compound graph by splitting cross-hierarchy edges. The result is stored in
 * `InternalProperties.CROSS_HIERARCHY_MAP`, which is attached to the top-level graph; the processor's state is cleared
 * afterwards. AD-10 (H3): the cross hierarchy map is a `LinkedHashMultimap` with identity keys and values (Java
 * `HashMultimap.create()` at `:107`, read in insertion order under `-XX:hashCode=2`). `order` is the H3 twin: `'reversed'`
 * reverses the iterations at `:129` (`dummyNodeMap.entrySet()`) and `:252` / `:257-258` (`crossHierarchyMap.keySet()` and
 * each key's values before the sort) and nothing else.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function processCompoundGraphPreprocessor(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  monitor: IElkProgressMonitor,
  order: CompoundIterationOrder = 'java',
): void {
  monitor.begin('Compound graph preprocessor', 1);

  // This can be a HashMultimap since the values are sorted prior to working with them
  self.crossHierarchyMap = LinkedHashMultimap.create(identity<LEdge>(), identity<CrossHierarchyEdge>());

  // create new dummy edges at hierarchy bounds and move the labels around accordingly
  transformHierarchyEdges(self, graph, null);
  moveLabelsAndRemoveOriginalEdges(self, graph, order);

  setSidesOfPortsToSidesOfDummyNodes(self, order);

  // Attach cross hierarchy map to the graph and cleanup
  graph.setProperty(InternalProperties.CROSS_HIERARCHY_MAP, self.crossHierarchyMap);
  self.crossHierarchyMap = null;
  self.dummyNodeMap.clear();

  monitor.done();
}

/**
 * Ensures that for each dummy node the external port and vice versa is set. Since the side of the dummy node has also
 * already been calculated, we set this fixed here. Therefore the compound node has a fixed side constraint, with some
 * sides still set to UNDEFINED. This must be dealt with later. AD-10 (H3): `dummyNodeMap` (Java `Maps.newHashMap()`,
 * identity-keyed `LPort`, `:96`) is a `Map` in insertion order; its `entrySet()` (`:129`) is reversed when `order` is
 * `'reversed'`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function setSidesOfPortsToSidesOfDummyNodes(
  self: CompoundGraphPreprocessor,
  order: CompoundIterationOrder,
): void {
  const entries = [...self.dummyNodeMap.entries()];
  for (const [externalPort, dummyNode] of reversesSite(order, 'dummyNodeMap') ? entries.reverse() : entries) {
    dummyNode.setProperty(InternalProperties.ORIGIN, externalPort);
    externalPort.setProperty(InternalProperties.PORT_DUMMY, dummyNode);
    externalPort.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
    externalPort.setSide(dummyNode.getProperty(InternalProperties.EXT_PORT_SIDE));
    // Java :136 reads the property again and discards the value; kept verbatim
    void dummyNode.getProperty(InternalProperties.EXT_PORT_SIDE);
    externalPort.getNode()!.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    externalPort
      .getNode()!
      .getGraph()!
      .getProperty(InternalProperties.GRAPH_PROPERTIES)
      .add(GraphProperties.NON_FREE_PORTS);
  }
}

/**
 * Recursively transform cross-hierarchy edges into sequences of dummy ports and dummy edges.
 *
 * @param graph the layered graph to process
 * @param parentNode the node that represents the graph in the upper hierarchy level, or `null` if it already is on
 *   top-level
 * @returns the external ports created to split edges that cross the boundary of the parent node
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function transformHierarchyEdges(
  self: CompoundGraphPreprocessor,
  graph: LGraph,
  parentNode: LNode | null,
): ExternalPort[] {
  // process all children and recurse down to gather their external ports
  const containedExternalPorts: ExternalPort[] = [];

  for (const node of graph.getLayerlessNodes()) {
    const nestedGraph = node.getNestedGraph();
    if (nestedGraph !== null) {
      // recursively process the child graph
      const childPorts = transformHierarchyEdges(self, nestedGraph, node);
      for (const childPort of childPorts) {
        containedExternalPorts.push(childPort);
      }

      // process inside self loops
      processInsideSelfLoops(self, nestedGraph, node);

      // make sure that all hierarchical ports have had dummy nodes created for them (some
      // will already have been created, but perhaps not all)
      if (nestedGraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
        ensureHierarchicalPortDummies(self, node, nestedGraph);
      }
    }
  }

  // this will be the list of external ports we will export
  const exportedExternalPorts: ExternalPort[] = [];

  // process the cross-hierarchy edges connected to the inside of the child nodes
  processInnerHierarchicalEdgeSegments(self, graph, parentNode, containedExternalPorts, exportedExternalPorts);

  // process the cross-hierarchy edges connected to the outside of the parent node
  if (parentNode !== null) {
    processOuterHierarchicalEdgeSegments(self, graph, parentNode, exportedExternalPorts);
  }

  return exportedExternalPorts;
}

/**
 * The body of the `EXTERNAL_PORTS` branch of `transformHierarchyEdges` (Java `:173-222`), split for the NLOC and CCN
 * limits; statement order unchanged.
 */
function ensureHierarchicalPortDummies(self: CompoundGraphPreprocessor, node: LNode, nestedGraph: LGraph): void {
  // We need the port constraints to position external ports (Issues KIPRA-1528, ELK-48)
  const portConstraints = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  const insidePortLabels = node.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT).contains(PortLabelPlacement.INSIDE);

  for (const port of node.getPorts()) {
    // Make sure that every port has a dummy node created for it
    let dummyNode = self.dummyNodeMap.get(port) ?? null;
    if (dummyNode === null) {
      dummyNode = LGraphUtil.createExternalPortDummy({
        propertyHolder: port,
        portConstraints,
        portSide: port.getSide(),
        netFlow: Int32.neg(port.getNetFlow()),
        portNodeSize: JAVA_NULL_VECTOR,
        portPosition: new KVector(),
        portSize: port.getSize(),
        layoutDirection: nestedGraph.getProperty(LayeredOptions.DIRECTION),
        layeredGraph: nestedGraph,
      });
      dummyNode.setProperty(InternalProperties.ORIGIN, port);
      self.dummyNodeMap.set(port, dummyNode);
      nestedGraph.getLayerlessNodes().push(dummyNode);
    }

    // We need to reserve space for external port labels by adding those labels to our dummy nodes
    const dummyNodePort = dummyNode.getPorts()[0]!;
    reserveExternalPortLabelSpace(node, port, dummyNodePort, portConstraints, insidePortLabels);
  }
}

/** The label loop of `transformHierarchyEdges` (Java `:194-221`), split for the NLOC and CCN limits. */
function reserveExternalPortLabelSpace(
  node: LNode,
  port: LPort,
  dummyNodePort: LPort,
  portConstraints: PortConstraints,
  insidePortLabels: boolean,
): void {
  for (const extPortLabel of port.getLabels()) {
    const dummyPortLabel = new LLabel();
    dummyPortLabel.getSize().x = extPortLabel.getSize().x;
    dummyPortLabel.getSize().y = extPortLabel.getSize().y;
    dummyNodePort.getLabels().push(dummyPortLabel);

    // If port labels are placed outside, modify the size. At this point, the port's side
    // may not be known yet if port constraints are free. If they are, however, we know that
    // the port will end up on either the east or west side. (see #596).
    // But if the port labels are fixed, we should consider the part that is inside the node.
    if (!insidePortLabels) {
      const side = port.getSide();
      const insidePart = insidePartOf(node, port, extPortLabel, side);
      if (portConstraints === PortConstraints.FREE || PortSide.SIDES_EAST_WEST.has(side)) {
        dummyPortLabel.getSize().x = insidePart;
      } else {
        dummyPortLabel.getSize().y = insidePart;
      }
    }
  }
}

/**
 * The inside part of an external port label in `transformHierarchyEdges` (Java `:206-213`), split from
 * {@link reserveExternalPortLabelSpace} for the NLOC limit; `side` is the port side read at `:205`.
 */
function insidePartOf(node: LNode, port: LPort, extPortLabel: LLabel, side: PortSide): number {
  let insidePart = 0;
  if (PortLabelPlacement.isFixed(node.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT))) {
    // We use 0 as port border offset here, as we only want the label part that is
    // inside the node "after" the port.
    insidePart = ElkUtil.computeInsidePart(extPortLabel.getPosition(), extPortLabel.getSize(), port.getSize(), 0, side);
  }
  return insidePart;
}
