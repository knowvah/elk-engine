// SPDX-License-Identifier: EPL-2.0
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { NodeDimensionCalculation } from '../../common/nodespacing/NodeDimensionCalculation.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphAdapters } from '../graph/LGraphAdapters.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * `List.get(index)` on the graph's layer list: Java throws `IndexOutOfBoundsException` for an index outside the list
 * (the router calls `layers.get(0)` and `layers.get(size - 1)` without a guard).
 */
export function layerAt(layers: readonly Layer[], index: number): Layer {
  if (index < 0 || index >= layers.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(layers.length)}`);
  }
  return layers[index]!;
}

/**
 * Step 1 of `HierarchicalPortOrthogonalEdgeRouter`: iterates through all layers, restoring hierarchical port dummy
 * nodes along the way. The restored nodes are connected to the temporary dummy nodes created for them (or, as Carsten
 * calls them, the "dummy dummies"). The restored nodes are added to the last layer. (which layer they are added to
 * doesn't make any difference)
 *
 * @param layeredGraph the layered graph.
 * @returns the list of restored external port dummies.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:160
 */
export function restoreNorthSouthDummies(layeredGraph: LGraph): LNode[] {
  const restoredDummies: LNode[] = [];

  if (!layeredGraph.hasProperty(InternalProperties.EXT_PORT_REPLACED_DUMMIES)) {
    return restoredDummies;
  }

  // Restore the original external port dummies
  for (const dummy of layeredGraph.getProperty(InternalProperties.EXT_PORT_REPLACED_DUMMIES)) {
    restoreDummy(dummy, layeredGraph);
    restoredDummies.push(dummy);
  }

  // Looking for hierarchical port dummies that replaced the restored hierarchical port dummy
  for (const layer of layeredGraph) {
    for (const node of layer) {
      if (node.getType() !== NodeType.EXTERNAL_PORT) {
        // Not a hierarchical port dummy - we're not interested. Move along, please, there's nothing to see here.
        continue;
      }

      // `EXT_PORT_REPLACED_DUMMY` has no default: the cast is Java's `(LNode)` of a possibly absent value
      const replacedDummy = node.getProperty(InternalProperties.EXT_PORT_REPLACED_DUMMY) as LNode | null;
      if (replacedDummy !== null) {
        // Java `assert replacedDummy.getType() == NodeType.EXTERNAL_PORT` (:184) is omitted (no devAssert helper yet)

        // Restore the origin and connect the node to it
        connectNodeToDummy(layeredGraph, node, replacedDummy);
      }
    }
  }

  // Assign the restored dummies to the graph's last layer (this has nothing to do anymore with where they'll be
  // placed; we just need some layer to assign them to, and we simply choose the last one)
  for (const dummy of restoredDummies) {
    const layers = layeredGraph.getLayers();
    dummy.setLayer(layerAt(layers, layers.length - 1));
  }

  return restoredDummies;
}

/**
 * Restores the given dummy.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:205
 */
function restoreDummy(dummy: LNode, graph: LGraph): void {
  // Depending on the hierarchical port's side, we set the port side of the dummy's ports to be able to route properly
  // (northern dummies must have a southern port)
  const portSide = dummy.getProperty(InternalProperties.EXT_PORT_SIDE);
  const dummyPort = dummy.getPorts()[0]!;

  if (portSide === PortSide.NORTH) {
    dummyPort.setSide(PortSide.SOUTH);
  } else if (portSide === PortSide.SOUTH) {
    dummyPort.setSide(PortSide.NORTH);
  }

  // Since the dummy node was hidden from the algorithm, its port labels are not placed properly and its margins are
  // not set accordingly. That needs to be fixed (if port labels are to be taken into consideration)
  if (graph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS).contains(SizeConstraint.PORT_LABELS)) {
    placePortLabels(dummy, dummyPort, graph);

    // Calculate margins
    NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(graph, false)).processNode(
      LGraphAdapters.adapt(dummy, false),
    );
  }
}

/**
 * The port label block of {@link restoreDummy} (`:219-243`), split out for the complexity limit.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:221
 */
function placePortLabels(dummy: LNode, dummyPort: LPort, graph: LGraph): void {
  // The ElkGraphImporter has set the relevant spacings on the dummy node
  const portLabelSpacingHorizontal = dummy.getProperty(LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL);
  const portLabelSpacingVertical = dummy.getProperty(LayeredOptions.SPACING_LABEL_PORT_VERTICAL);
  const labelLabelSpacing = dummy.getProperty(LayeredOptions.SPACING_LABEL_LABEL);

  const portLabelPlacement = graph.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT);
  if (portLabelPlacement.contains(PortLabelPlacement.INSIDE)) {
    let currentY = portLabelSpacingVertical;
    const xCenterRelativeToPort = dummy.getSize().x / 2 - dummyPort.getPosition().x;

    for (const label of dummyPort.getLabels()) {
      label.getPosition().y = currentY;
      label.getPosition().x = xCenterRelativeToPort - label.getSize().x / 2;

      currentY += label.getSize().y + labelLabelSpacing;
    }
  } else if (portLabelPlacement.contains(PortLabelPlacement.OUTSIDE)) {
    // Port labels have a vertical size of 0, but we need to set their x coordinate
    for (const label of dummyPort.getLabels()) {
      label.getPosition().x = portLabelSpacingHorizontal + dummy.getSize().x - dummyPort.getPosition().x;
    }
  }
}

/**
 * Adds a port to the given node and connects that to the given dummy node.
 *
 * @param layeredGraph the layered graph (unused, as in Java).
 * @param node the node to connect to the dummy.
 * @param dummy the external port dummy to connect the node to.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:256
 */
function connectNodeToDummy(_layeredGraph: LGraph, node: LNode, dummy: LNode): void {
  // First, add a port to the node. The port side depends on the node's hierarchical port side
  const outPort = new LPort();
  outPort.setNode(node);

  const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
  outPort.setSide(extPortSide);

  // Find the dummy node's port
  const inPort = dummy.getPorts()[0]!;

  // Connect the two nodes
  const edge = new LEdge();
  edge.setSource(outPort);
  edge.setTarget(inPort);
}
