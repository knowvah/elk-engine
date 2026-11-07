// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { Layer } from '../../graph/Layer.js';
import { LongEdgeSplitter } from '../LongEdgeSplitter.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';

/** What `shiftNode` knows about the node it moves: the Java method's four parameters, bundled (5-parameter limit). */
export interface ShiftSite {
  readonly graph: LGraph;
  readonly subLayers: readonly Layer[];
  readonly targetLayer: number;
  readonly nodeIndex: number;
}

/** The sub-layer at `index` (Java `List.get`; the callers stay within `subLayers`). */
const subLayerAt = (site: ShiftSite, index: number): Layer => site.subLayers[index] as Layer;

/**
 * Puts a dummy node into a sub-layer at `position`, or at the end when `position` is beyond the layer (the
 * `if (... > size) setLayer(layer) else setLayer(index, layer)` pattern of the Java, repeated verbatim at `:241`,
 * `:258` and `:285`).
 */
function placeAt(dummy: LNode, position: number, layer: Layer): void {
  if (position > layer.getNodes().length) {
    dummy.setLayer(layer);
  } else {
    dummy.setLayer(position, layer);
  }
}

/**
 * Creates a dummy node for an edge that should be split into a long edge.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
export function createDummyNode(graph: LGraph, nextEdgeToSplit: LEdge): LNode {
  const dummyNode = new LNode(graph);
  dummyNode.setType(NodeType.LONG_EDGE);
  dummyNode.setProperty(InternalProperties.ORIGIN, nextEdgeToSplit);
  dummyNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  return dummyNode;
}

/** What the incoming-edge block of `shiftNode` leaves behind. */
interface IncomingResult {
  readonly edgeCount: number;
  readonly noIncomingEdges: boolean;
}

/**
 * Handle incoming edges and preceding layers (`shiftNode`, first block).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
function shiftIncoming(site: ShiftSite, node: LNode): IncomingResult {
  let edgeCount = 0;
  // If there are no incoming edges, the nodeindex will have to be decreased by one
  let noIncomingEdges = true;
  // Lists.reverse(Lists.newArrayList(...)): a reversed copy of the snapshot, the original is never touched
  const reversedIncomingEdges = [...node.getIncomingEdges()].reverse();
  for (const incomingEdge of reversedIncomingEdges) {
    noIncomingEdges = false;
    let nextEdgeToSplit = incomingEdge;
    for (let layerIndex = 0; layerIndex < site.targetLayer; layerIndex++) {
      const dummyNode = createDummyNode(site.graph, nextEdgeToSplit);
      placeAt(dummyNode, site.nodeIndex + edgeCount, subLayerAt(site, layerIndex));
      nextEdgeToSplit = LongEdgeSplitter.splitEdge(nextEdgeToSplit, dummyNode);
    }
    if (site.targetLayer > 0) {
      edgeCount += 1;
    }
  }
  return { edgeCount, noIncomingEdges };
}

/**
 * Create unconnected dummy nodes to fill the layers if there are no incoming edges (`shiftNode`, second block).
 *
 * @returns the new edge count
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
function fillWithoutIncoming(site: ShiftSite, edgeCountBefore: number): number {
  let edgeCount = edgeCountBefore;
  for (let layerIndex = 0; layerIndex < site.targetLayer; layerIndex++) {
    const dummyNode = new LNode(site.graph);
    dummyNode.setType(NodeType.PLACEHOLDER);
    placeAt(dummyNode, site.nodeIndex + edgeCount, subLayerAt(site, layerIndex));
  }
  if (site.targetLayer > 0) {
    edgeCount += 1;
  }
  return edgeCount;
}

/**
 * Handle outgoing edges and following layers (`shiftNode`, third block).
 *
 * @returns the new edge count
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
function shiftOutgoing(site: ShiftSite, node: LNode, edgeCountBefore: number): number {
  let edgeCount = edgeCountBefore;
  let extraEdge = false;
  for (const outgoingEdge of node.getOutgoingEdges()) {
    let nextEdgeToSplit = outgoingEdge;
    for (let layerIndex = site.targetLayer + 1; layerIndex < site.subLayers.length; layerIndex++) {
      const dummyNode = createDummyNode(site.graph, nextEdgeToSplit);
      dummyNode.setLayer(subLayerAt(site, layerIndex));
      nextEdgeToSplit = LongEdgeSplitter.splitEdge(nextEdgeToSplit, dummyNode);
    }

    for (let layerIndex = 0; layerIndex <= site.targetLayer; layerIndex++) {
      if (extraEdge) {
        // add a placeholder beneath node's old position so that later
        const placeholder = new LNode(site.graph);
        placeholder.setType(NodeType.NONSHIFTING_PLACEHOLDER);
        placeAt(placeholder, site.nodeIndex + 1, subLayerAt(site, layerIndex));
      }
    }

    if (extraEdge) {
      edgeCount += 1;
    }

    extraEdge = true;
  }
  return edgeCount;
}

/**
 * Shifts a node from one layer to another and adds dummy nodes for the long edges this introduces.
 *
 * @returns the number new nodes in the original layer
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
export function shiftNode(site: ShiftSite): number {
  const node = subLayerAt(site, 0).getNodes()[site.nodeIndex] as LNode;
  if (site.targetLayer > 0) {
    node.setLayer(subLayerAt(site, site.targetLayer));
  }
  const incoming = shiftIncoming(site, node);
  const afterIncoming = incoming.noIncomingEdges ? fillWithoutIncoming(site, incoming.edgeCount) : incoming.edgeCount;
  const edgeCount = shiftOutgoing(site, node, afterIncoming);

  if (edgeCount > 0) {
    return edgeCount - 1;
  } else {
    return 0;
  }
}
