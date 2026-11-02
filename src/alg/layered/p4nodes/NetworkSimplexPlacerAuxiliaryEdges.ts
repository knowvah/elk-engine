// SPDX-License-Identifier: EPL-2.0
import { NEdge } from '../../common/networksimplex/NEdge.js';
import { NNode } from '../../common/networksimplex/NNode.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { EDGE_WEIGHT_BASE, NODE_SIZE_WEIGHT_STATIC, SMALL_EDGE_WEIGHT } from './NetworkSimplexPlacerConstants.js';
import type { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';

/**
 * Insert `NEdge`s to keep edges connected to inverted ports short.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function insertInLayerEdgeAuxiliaryEdges(s: NetworkSimplexPlacerState): void {
  s.lGraph!.getLayers()
    .flatMap((l) => l.getNodes())
    .filter((n) => n.getType() === NodeType.NORMAL)
    .flatMap((n) => [...n.getConnectedEdges()])
    .filter((e) => e.isInLayerEdge())
    .forEach((inLayerEdge) => {
      const srcIsDummy = inLayerEdge.getSource()!.getNode()!.getType() !== NodeType.NORMAL;

      const thePort = srcIsDummy ? inLayerEdge.getTarget()! : inLayerEdge.getSource()!;
      const dummyNode = inLayerEdge.getOther(thePort)!.getNode()!;

      const portRep = s.portMap.get(thePort)!;
      const dummyRep = s.nodeReps![dummyNode.id]!.head; // head/tail doesn't matter since it's a dummy node

      let src: NNode;
      let tgt: NNode;
      if (thePort.getNode()!.getIndex() < dummyNode.getIndex()) {
        // port --> dummy
        src = portRep;
        tgt = dummyRep;
      } else {
        // dummy --> port
        src = dummyRep;
        tgt = portRep;
      }

      NEdge.of().delta(0).weight(EDGE_WEIGHT_BASE).source(src).target(tgt).create();
    });
}

/** Insert `NEdge`s to keep north and south port edges short. */
export function insertNorthSouthAuxiliaryEdges(s: NetworkSimplexPlacerState): void {
  s.lGraph!.getLayers()
    .flatMap((l) => l.getNodes())
    .forEach((n) => {
      for (const sp of n.getPortSideView(PortSide.SOUTH)) {
        const other = sp.getProperty(InternalProperties.PORT_DUMMY);
        // if no edge was attached to the port, no dummy was created ...
        if (other !== null) {
          NEdge.of()
            .delta(0) // doesn't matter, separation is already taken care off
            .weight(SMALL_EDGE_WEIGHT)
            .source(s.nodeReps![n.id]!.tail)
            .target(s.nodeReps![other.id]!.head)
            .create();
        }
      }

      for (const sp of n.getPortSideView(PortSide.NORTH)) {
        const other = sp.getProperty(InternalProperties.PORT_DUMMY);
        // if no edge was attached to the port, no dummy was created ...
        if (other !== null) {
          NEdge.of()
            .delta(0) // doesn't matter
            .weight(SMALL_EDGE_WEIGHT)
            .source(s.nodeReps![other.id]!.tail)
            .target(s.nodeReps![n.id]!.head)
            .create();
        }
      }
    });
}

/** Inserts auxiliary edges for the case that `NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS` node exist. */
export function insertFlexibleWhereSpaceAuxiliaryEdges(s: NetworkSimplexPlacerState): void {
  const nGraph = s.nGraph!;
  // The Java `stream().map(n -> n.layer).min(...).get()` throws on an empty graph; this method only runs once
  // `flexibleWhereSpacePermitsEdges` is non-empty, so the graph holds nodes.
  const layers = nGraph.nodes.map((n) => n.layer);
  const minLayer = layers.reduce((a, b) => (b < a ? b : a));
  const maxLayer = layers.reduce((a, b) => (b > a ? b : a));
  const usedLayers = maxLayer - minLayer;

  const globalSource = NNode.of().create(nGraph);
  const globalSink = NNode.of().create(nGraph);

  // make sure the distance between source and sink is preserved
  NEdge.of()
    .weight(NODE_SIZE_WEIGHT_STATIC * 2)
    .delta(usedLayers)
    .source(globalSource)
    .target(globalSink)
    .create();

  // fix the position of most non-flexible nodes and make sure the flexible nodes
  // can only increase in size
  s.nodeReps!.filter((nr) => nr.origin.getType() === NodeType.NORMAL)
    .filter((nr) => nr.origin.getPorts().length > 1) // allow leaves to move
    .forEach((nr) => {
      NEdge.of()
        .weight(0)
        .delta(nr.tail.layer - minLayer)
        .source(globalSource)
        .target(nr.tail)
        .create();

      NEdge.of()
        .weight(0)
        .delta(usedLayers - nr.head.layer)
        .source(nr.head)
        .target(globalSink)
        .create();
    });
}
