// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** The single connection of a comment box found by the scan of `process`. */
interface BoxConnection {
  edgeCount: number;
  edge: LEdge | null;
  oppositePort: LPort | null;
}

/**
 * A pre-processor for comment boxes. Looks for comments that have exactly one connection to a normal node and removes
 * them from the graph. Such comments are put either into the `TOP_COMMENTS` or the `BOTTOM_COMMENTS` list of the
 * connected node and processed later by the `CommentPostprocessor`. Other comments are processed normally, i.e. they are
 * treated as regular nodes, but their incident edges may be reversed.
 *
 * Slot: before phase 1. `process` and `processBox` are split into helpers at their Java section comments for the
 * complexity limits; the order of every statement is the Java's.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/CommentPreprocessor.java
 */
export class CommentPreprocessor implements ILayoutProcessor<LGraph> {
  /** @see CommentPreprocessor.java:55 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Comment pre-processing', 1);

    let commentBoxCount = 0;

    // the Java `nodeIter.remove()` removes the last returned node from the live list
    const nodeIter = new ArrayListIterator<LNode>(layeredGraph.getLayerlessNodes());
    while (nodeIter.hasNext()) {
      const node = nodeIter.next();
      if (node.getProperty(LayeredOptions.COMMENT_BOX)) {
        commentBoxCount++;

        const connection = CommentPreprocessor.scanConnection(node);
        // the oppositePort is non-null once edgeCount is 1 (a single edge sits in exactly one incoming or outgoing list)
        if (
          connection.edgeCount === 1 &&
          connection.oppositePort!.getDegree() === 1 &&
          !connection.oppositePort!.getNode()!.getProperty(LayeredOptions.COMMENT_BOX)
        ) {
          // found a comment that has exactly one connection
          this.processBox(node, connection.edge!, connection.oppositePort!, connection.oppositePort!.getNode()!);
          nodeIter.remove();
        } else {
          // reverse edges that are oddly connected
          for (const re of CommentPreprocessor.oddEdges(node)) {
            re.reverse(layeredGraph, true);
          }
        }
      }
    }

    if (monitor.isLoggingEnabled()) {
      monitor.log(`Found ${commentBoxCount} comment boxes`);
    }

    monitor.done();
  }

  /** The first loop of `process` (CommentPreprocessor.java:69-82): counts the edges and remembers the last single one. */
  private static scanConnection(node: LNode): BoxConnection {
    const connection: BoxConnection = { edgeCount: 0, edge: null, oppositePort: null };
    for (const port of node.getPorts()) {
      connection.edgeCount += port.getDegree();
      if (port.getIncomingEdges().length === 1) {
        connection.edge = port.getIncomingEdges()[0]!;
        connection.oppositePort = connection.edge.getSource();
      }
      if (port.getOutgoingEdges().length === 1) {
        connection.edge = port.getOutgoingEdges()[0]!;
        connection.oppositePort = connection.edge.getTarget();
      }
    }
    return connection;
  }

  /** The edges to reverse (CommentPreprocessor.java:88-103), collected before any is reversed. */
  private static oddEdges(node: LNode): LEdge[] {
    const revEdges: LEdge[] = [];
    for (const port of node.getPorts()) {
      for (const outedge of port.getOutgoingEdges()) {
        if (outedge.getTarget()!.getOutgoingEdges().length > 0) {
          revEdges.push(outedge);
        }
      }

      for (const inedge of port.getIncomingEdges()) {
        if (inedge.getSource()!.getIncomingEdges().length > 0) {
          revEdges.push(inedge);
        }
      }
    }
    return revEdges;
  }

  /**
   * Process a comment box by putting it into a property of the corresponding node.
   *
   * @param box a comment box
   * @param edge the edge that connects the box with the real node
   * @param oppositePort the port of the real node to which the edge is incident
   * @param realNode the normal node that is connected with the comment
   * @see CommentPreprocessor.java:125
   */
  private processBox(box: LNode, edge: LEdge, oppositePort: LPort, realNode: LNode): void {
    let onlyTop = false;
    let onlyBottom = false;
    if (realNode.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
      const sides = CommentPreprocessor.scanSides(realNode);
      onlyTop = sides.hasSouth && !sides.hasNorth;
      onlyBottom = sides.hasNorth && !sides.hasSouth;
    }
    const topFirst = CommentPreprocessor.isTopFirst(realNode, onlyTop, onlyBottom);

    const boxList = topFirst
      ? CommentPreprocessor.favourTop(realNode, onlyTop)
      : CommentPreprocessor.favourBottom(realNode, onlyBottom);

    // add the comment box to one of the two possible lists
    boxList.push(box);

    // set the opposite port as property for the comment box
    box.setProperty(InternalProperties.COMMENT_CONN_PORT, oppositePort);
    CommentPreprocessor.detach(edge, oppositePort);
  }

  /** The `topFirst` computation of `processBox` (CommentPreprocessor.java:147-157). */
  private static isTopFirst(realNode: LNode, onlyTop: boolean, onlyBottom: boolean): boolean {
    if (!onlyTop && !onlyBottom && realNode.getLabels().length > 0) {
      let labelPos = 0;
      for (const label of realNode.getLabels()) {
        labelPos += label.getPosition().y + label.getSize().y / 2;
      }
      labelPos /= realNode.getLabels().length;
      return labelPos >= realNode.getSize().y / 2;
    }
    return !onlyBottom;
  }

  /** The end of `processBox` (CommentPreprocessor.java:193-204): detach the edge and the opposite port. */
  private static detach(edge: LEdge, oppositePort: LPort): void {
    if (edge.getTarget() === oppositePort) {
      edge.setTarget(null);
      if (oppositePort.getDegree() === 0) {
        oppositePort.setNode(null);
      }
      CommentPreprocessor.removeHierarchicalPortDummyNode(oppositePort);
    } else {
      edge.setSource(null);
      if (oppositePort.getDegree() === 0) {
        oppositePort.setNode(null);
      }
    }
    edge.getBendPoints().clear();
  }

  /** The `portLoop` of `processBox` (CommentPreprocessor.java:128-145): the first non-comment connection on N or S. */
  private static scanSides(realNode: LNode): { hasNorth: boolean; hasSouth: boolean } {
    for (const port1 of realNode.getPorts()) {
      for (const port2 of port1.getConnectedPorts()) {
        if (!port2.getNode()!.getProperty(LayeredOptions.COMMENT_BOX)) {
          if (port1.getSide() === PortSide.NORTH) {
            return { hasNorth: true, hasSouth: false };
          }
          if (port1.getSide() === PortSide.SOUTH) {
            return { hasNorth: false, hasSouth: true };
          }
        }
      }
    }
    return { hasNorth: false, hasSouth: false };
  }

  /** The `topFirst` arm (CommentPreprocessor.java:159-182): determine the position to use, favoring the top position. */
  private static favourTop(realNode: LNode, onlyTop: boolean): LNode[] {
    const topBoxes = realNode.getProperty(InternalProperties.TOP_COMMENTS) as LNode[] | null;
    if (topBoxes === null) {
      return CommentPreprocessor.newList(realNode, InternalProperties.TOP_COMMENTS);
    } else if (onlyTop) {
      return topBoxes;
    }
    const bottomBoxes = realNode.getProperty(InternalProperties.BOTTOM_COMMENTS) as LNode[] | null;
    if (bottomBoxes === null) {
      return CommentPreprocessor.newList(realNode, InternalProperties.BOTTOM_COMMENTS);
    }
    return topBoxes.length <= bottomBoxes.length ? topBoxes : bottomBoxes;
  }

  /** The other arm (CommentPreprocessor.java:183-205): determine the position to use, favoring the bottom position. */
  private static favourBottom(realNode: LNode, onlyBottom: boolean): LNode[] {
    const bottomBoxes = realNode.getProperty(InternalProperties.BOTTOM_COMMENTS) as LNode[] | null;
    if (bottomBoxes === null) {
      return CommentPreprocessor.newList(realNode, InternalProperties.BOTTOM_COMMENTS);
    } else if (onlyBottom) {
      return bottomBoxes;
    }
    const topBoxes = realNode.getProperty(InternalProperties.TOP_COMMENTS) as LNode[] | null;
    if (topBoxes === null) {
      return CommentPreprocessor.newList(realNode, InternalProperties.TOP_COMMENTS);
    }
    return bottomBoxes.length <= topBoxes.length ? bottomBoxes : topBoxes;
  }

  /** `boxList = Lists.newArrayList(); realNode.setProperty(property, boxList);` */
  private static newList(realNode: LNode, property: typeof InternalProperties.TOP_COMMENTS): LNode[] {
    const boxList: LNode[] = [];
    realNode.setProperty(property, boxList);
    return boxList;
  }

  /** @see CommentPreprocessor.java:224 */
  private static removeHierarchicalPortDummyNode(oppositePort: LPort): void {
    const dummy = oppositePort.getProperty(InternalProperties.PORT_DUMMY) as LNode | null;
    if (dummy !== null) {
      const layer = dummy.getLayer()!;
      const nodes = layer.getNodes();
      const index = nodes.indexOf(dummy);
      if (index >= 0) {
        nodes.splice(index, 1);
      }
      if (nodes.length === 0) {
        const layers = dummy.getGraph()!.getLayers();
        const layerIndex = layers.indexOf(layer);
        if (layerIndex >= 0) {
          layers.splice(layerIndex, 1);
        }
      }
    }
  }
}
