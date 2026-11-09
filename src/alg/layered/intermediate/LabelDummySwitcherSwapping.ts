// SPDX-License-Identifier: EPL-2.0
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import { PortType } from '../options/PortType.js';
import { firstOf } from './LabelDummySwitcherSupport.js';

/**
 * Swaps the two given label dummy with the given long edge dummy. The dummies are assumed to be part of the same long
 * edge. (Java also documents an update of the layer widths array here; the width update is done by `assignLayer`.)
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java:556
 */
export function swapNodes(labelDummy: LNode, longEdgeDummy: LNode): void {
  // Find the layers and the positions inside the layers of the dummy nodes. We need the positions later since we run
  // after crossing minimization and have to keep the order of nodes the same.
  const layer1 = labelDummy.getLayer()!;
  const layer2 = longEdgeDummy.getLayer()!;

  const dummy1LayerPosition = layer1.getNodes().indexOf(labelDummy);
  const dummy2LayerPosition = layer2.getNodes().indexOf(longEdgeDummy);

  // Detect incoming and outgoing ports of the nodes (this of course assumes that there's just one of each kind, which
  // should be true for long edge and label dummy nodes)
  const inputPort1 = firstOf(labelDummy.getPorts(PortType.INPUT));
  const outputPort1 = firstOf(labelDummy.getPorts(PortType.OUTPUT));
  const inputPort2 = firstOf(longEdgeDummy.getPorts(PortType.INPUT));
  const outputPort2 = firstOf(longEdgeDummy.getPorts(PortType.OUTPUT));

  // Store incoming and outgoing edges
  const incomingEdges1: LEdge[] = LGraphUtil.toEdgeArray(inputPort1.getIncomingEdges());
  const outgoingEdges1: LEdge[] = LGraphUtil.toEdgeArray(outputPort1.getOutgoingEdges());
  const incomingEdges2: LEdge[] = LGraphUtil.toEdgeArray(inputPort2.getIncomingEdges());
  const outgoingEdges2: LEdge[] = LGraphUtil.toEdgeArray(outputPort2.getOutgoingEdges());

  // Put first dummy into second dummy's layer and reroute second dummy's edges to first dummy
  labelDummy.setLayer(dummy2LayerPosition, layer2);
  for (const edge of incomingEdges2) {
    edge.setTarget(inputPort1);
  }
  for (const edge of outgoingEdges2) {
    edge.setSource(outputPort1);
  }

  // Put second dummy into first dummy's layer and reroute first dummy's edges to second dummy
  longEdgeDummy.setLayer(dummy1LayerPosition, layer1);
  for (const edge of incomingEdges1) {
    edge.setTarget(inputPort2);
  }
  for (const edge of outgoingEdges1) {
    edge.setSource(outputPort2);
  }
}
