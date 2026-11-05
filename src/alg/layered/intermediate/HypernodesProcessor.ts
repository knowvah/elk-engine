// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { KVector } from '../../../core/math/KVector.js';
import type { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LPort } from '../graph/LPort.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** Java `Integer.MAX_VALUE`. */
const INTEGER_MAX_VALUE = 2147483647;

/** The edges that form the first join point of a hyperedge and the distances found while searching for them. */
interface BendSearch {
  readonly bendEdges: LEdge[];
  bendx: number;
  diffx: number;
  diffy: number;
}

/**
 * Removes the first element equal to `point` from the chain: Java's `List.remove(Object)` compares with
 * `KVector.equals`, whereas the local `LinkedList.remove` compares by identity.
 */
function removeEqual(chain: KVectorChain, point: KVector): void {
  for (let i = 0; i < chain.size(); i++) {
    if (chain.get(i).equals(point)) {
      chain.removeAt(i);
      return;
    }
  }
}

/**
 * Moves hypernodes (nodes with the `HYPERNODE` property and at most two ports) towards the first join point of their
 * hyperedge, replacing that bend point by new north or south ports. Slot: after phase 5.
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HypernodesProcessor.java
 */
export class HypernodesProcessor implements ILayoutProcessor<LGraph> {
  /** @see HypernodesProcessor.java:48 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Hypernodes processing', 1);

    for (const layer of layeredGraph) {
      for (const node of layer) {
        // Java unboxes the property; it cannot be null (a null `setProperty` removes the key, the default is false).
        if (node.getProperty(LayeredOptions.HYPERNODE) && node.getPorts().length <= 2) {
          const [topEdges, rightEdges, bottomEdges, leftEdges] = this.countSides(node);
          // don't move the node if there are any edges to the top or bottom
          if (topEdges === 0 && bottomEdges === 0) {
            this.moveHypernode(layeredGraph, node, leftEdges <= rightEdges);
          }
        }
      }
    }

    monitor.done();
  }

  /** The port counts per side `[top, right, bottom, left]` (the `switch` of `process`, split for the complexity limits). */
  private countSides(node: LNode): [number, number, number, number] {
    let topEdges = 0;
    let rightEdges = 0;
    let bottomEdges = 0;
    let leftEdges = 0;
    for (const port of node.getPorts()) {
      switch (port.getSide()) {
        case PortSide.NORTH:
          topEdges++;
          break;
        case PortSide.EAST:
          rightEdges++;
          break;
        case PortSide.SOUTH:
          bottomEdges++;
          break;
        case PortSide.WEST:
          leftEdges++;
          break;
        default:
          break;
      }
    }
    return [topEdges, rightEdges, bottomEdges, leftEdges];
  }

  /**
   * Move the given hypernode either towards the previous layer or towards the next layer.
   *
   * @param layeredGraph a layered graph
   * @param hypernode a node that is marked with `LayeredOptions.HYPERNODE`
   * @param right if true, the node is moved right (to the next layer), else it is moved left (to the previous layer)
   * @see HypernodesProcessor.java:92
   */
  private moveHypernode(layeredGraph: LGraph, hypernode: LNode, right: boolean): void {
    // find edges that constitute the first join point of the hyperedge
    const search: BendSearch = {
      bendEdges: [],
      bendx: INTEGER_MAX_VALUE,
      diffx: INTEGER_MAX_VALUE,
      diffy: INTEGER_MAX_VALUE,
    };
    if (right) {
      search.bendx = layeredGraph.getSize().x;
      this.searchRight(hypernode, search);
    } else {
      this.searchLeft(hypernode, search);
    }

    if (
      search.bendEdges.length > 0 &&
      search.diffx > hypernode.getSize().x / 2 &&
      search.diffy > hypernode.getSize().y / 2
    ) {
      this.shiftHypernode(hypernode, search, right);
    }
  }

  /** The `right` branch of the search in `moveHypernode` (split for the complexity limits, Java order kept). */
  private searchRight(hypernode: LNode, search: BendSearch): void {
    for (const port of hypernode.getPorts()) {
      for (const edge of port.getOutgoingEdges()) {
        if (!edge.getBendPoints().isEmpty()) {
          const firstPoint = edge.getBendPoints().getFirst();
          if (firstPoint.x < search.bendx) {
            search.diffx = search.bendx - firstPoint.x;
            search.diffy = INTEGER_MAX_VALUE;
            search.bendEdges.length = 0;
            search.bendx = firstPoint.x;
          }
          if (firstPoint.x <= search.bendx) {
            search.bendEdges.push(edge);
            if (edge.getBendPoints().size() > 1) {
              search.diffy = Math.min(search.diffy, Math.abs(edge.getBendPoints().get(1).y - firstPoint.y));
            }
          }
        }
      }
    }
  }

  /** The left branch of the search in `moveHypernode` (split for the complexity limits, Java order kept). */
  private searchLeft(hypernode: LNode, search: BendSearch): void {
    for (const port of hypernode.getPorts()) {
      for (const edge of port.getIncomingEdges()) {
        if (!edge.getBendPoints().isEmpty()) {
          const lastPoint = edge.getBendPoints().getLast();
          if (lastPoint.x > search.bendx) {
            search.diffx = lastPoint.x - search.bendx;
            search.diffy = INTEGER_MAX_VALUE;
            search.bendEdges.length = 0;
            search.bendx = lastPoint.x;
          }
          if (lastPoint.x >= search.bendx) {
            search.bendEdges.push(edge);
            if (edge.getBendPoints().size() > 1) {
              search.diffy = Math.min(
                search.diffy,
                Math.abs(edge.getBendPoints().get(edge.getBendPoints().size() - 2).y - lastPoint.y),
              );
            }
          }
        }
      }
    }
  }

  /**
   * The body of the `if` at the end of `moveHypernode`: new ports for the edges, the first bend point replaced by
   * them, and the node moved.
   *
   * @see HypernodesProcessor.java:149
   */
  private shiftHypernode(hypernode: LNode, search: BendSearch, right: boolean): void {
    // create new ports for the edges
    const northPort = new LPort();
    northPort.setNode(hypernode);
    northPort.setSide(PortSide.NORTH);
    northPort.getPosition().x = hypernode.getSize().x / 2;
    const southPort = new LPort();
    southPort.setNode(hypernode);
    southPort.setSide(PortSide.SOUTH);
    southPort.getPosition().x = hypernode.getSize().x / 2;
    southPort.getPosition().y = hypernode.getSize().y;
    // replace the first bend point by the new ports
    for (const edge of search.bendEdges) {
      this.replaceBendPoint(edge, right, northPort, southPort);
    }
    // move the node to new position
    hypernode.getPosition().x = search.bendx - hypernode.getSize().x / 2;
  }

  /** The loop body of the replacement in `shiftHypernode` (Java order kept). */
  private replaceBendPoint(edge: LEdge, right: boolean, northPort: LPort, southPort: LPort): void {
    let first: KVector;
    let second: KVector;
    if (right) {
      first = edge.getBendPoints().removeFirst();
      second = edge.getBendPoints().isEmpty() ? edge.getTarget()!.getAbsoluteAnchor() : edge.getBendPoints().getFirst();
      if (second.y >= first.y) {
        edge.setSource(southPort);
      } else {
        edge.setSource(northPort);
      }
    } else {
      first = edge.getBendPoints().removeLast();
      second = edge.getBendPoints().isEmpty() ? edge.getSource()!.getAbsoluteAnchor() : edge.getBendPoints().getLast();
      if (second.y >= first.y) {
        edge.setTarget(southPort);
      } else {
        edge.setTarget(northPort);
      }
    }
    // remove junction points that collide with the eliminated bend point
    const junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    if (junctionPoints !== null) {
      removeEqual(junctionPoints, first);
    }
  }
}
