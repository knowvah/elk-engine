// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import { any, concat, isEmpty } from '../../../guava/Iterables.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { IInitializable } from './counting/IInitializable.js';
import type { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepTypeDeciderNodeInfo as NodeInfo } from './LayerSweepTypeDeciderNodeInfo.js';

/** The Java locals `pathsToRandom` and `pathsToHierarchical` of `useBottomUp`, shared by its helper methods. */
interface PathCounts {
  pathsToRandom: number;
  pathsToHierarchical: number;
}

/**
 * In order to decide whether to sweep into the graph or not, we compare the number of paths to nodes whose position
 * is decided on by random decisions to the number of paths to nodes whose position depends on cross-hierarchy edges.
 * By calculating (pathsToRandom - pathsToHierarchical) / allPaths, this value will always be between -1 (many cross
 * hierarchical paths) and +1 (many random paths). By setting the boundary CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS,
 * we can choose how likely it is to be hierarchical or more bottom up.
 *
 * Must be initialized using `IInitializable.init`!
 *
 * `useBottomUp` is split at the Java loop boundaries (`:80-133`): the loop over the layers, the loop over the nodes of
 * a layer, and the two edge/port loops are `processLayer`, `processNode` and their helpers, with the Java locals
 * `pathsToRandom`/`pathsToHierarchical` in a shared record; statement order is unchanged. The nested class `NodeInfo`
 * is `LayerSweepTypeDeciderNodeInfo` (M15).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerSweepTypeDecider.java
 */
export class LayerSweepTypeDecider implements IInitializable {
  private nodeInfo: NodeInfo[][];
  private readonly graphData: GraphInfoHolder;

  /**
   * Creates LayerSweepTypeDecider for deciding whether to sweep into graphs or not.
   *
   * Must be initialized using `IInitializable.init`!
   *
   * @param graphData the graph holder object for auxiliary graph information needed in crossing minimization
   * @see LayerSweepTypeDecider.java:56
   */
  constructor(graphData: GraphInfoHolder) {
    this.graphData = graphData;
    this.nodeInfo = new Array<NodeInfo[]>(graphData.currentNodeOrder().length);
  }

  /**
   * Decide whether to use bottom up or cross-hierarchical sweep method.
   *
   * @returns decision
   * @see LayerSweepTypeDecider.java:66
   */
  useBottomUp(): boolean {
    const boundary = this.graphData.lGraph().getProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS);
    if (this.bottomUpForced(boundary) || this.rootNode() || this.fixedPortOrder() || this.fewerThanTwoInOutEdges()) {
      return true;
    }

    if (this.graphData.crossMinDeterministic()) {
      return false;
    }

    const counts: PathCounts = { pathsToRandom: 0, pathsToHierarchical: 0 };

    const nsPortDummies: LNode[] = [];
    for (const layer of this.graphData.currentNodeOrder()) {
      this.processLayer(layer, nsPortDummies, counts);
    }

    const allPaths = counts.pathsToRandom + counts.pathsToHierarchical;
    const normalized =
      allPaths === 0 ? Number.POSITIVE_INFINITY : (counts.pathsToRandom - counts.pathsToHierarchical) / allPaths;
    return normalized >= boundary;
  }

  /** The body of the `for (LNode[] layer : ...)` loop (`LayerSweepTypeDecider.java:81-132`). */
  private processLayer(layer: LNode[], nsPortDummies: LNode[], counts: PathCounts): void {
    for (const node of layer) {
      // We must visit all sources of edges first, so we collect north south dummies for later.
      if (this.isNorthSouthDummy(node)) {
        nsPortDummies.push(node);
        continue;
      }

      this.processNode(node, counts);
    }

    // Now process nsPortDummies
    for (const node of nsPortDummies) {
      const currentNode = this.nodeInfoFor(node);
      this.transferAlongOutgoingEdges(node, currentNode, counts);
    }
    nsPortDummies.length = 0;
  }

  /** The body of the `for (LNode node : layer)` loop after the north/south check (`LayerSweepTypeDecider.java:87-121`). */
  private processNode(node: LNode, counts: PathCounts): void {
    const currentNode = this.nodeInfoFor(node);
    // Check for hierarchical port dummies or random influence.
    if (this.isExternalPortDummy(node)) {
      currentNode.hierarchicalInfluence = 1;
      if (this.isEasternDummy(node)) {
        counts.pathsToHierarchical += currentNode.connectedEdges;
      }
    } else if (this.hasNoWesternPorts(node)) {
      currentNode.randomInfluence = 1;
    } else if (this.hasNoEasternPorts(node)) {
      counts.pathsToRandom += currentNode.connectedEdges;
    }

    // Increase counts of paths by the number outgoing edges times the influence
    // and transfer information to targets.
    this.transferAlongOutgoingEdges(node, currentNode, counts);

    // Do the same for north/south dummies: Increase counts of paths by the number outgoing edges times the
    // influence and transfer information to dummies.
    const northSouthPorts = concat(node.getPortSideView(PortSide.NORTH), node.getPortSideView(PortSide.SOUTH));
    for (const port of northSouthPorts) {
      const nsDummy: LNode | null = port.getProperty(InternalProperties.PORT_DUMMY);
      if (nsDummy !== null) {
        counts.pathsToRandom += currentNode.randomInfluence;
        counts.pathsToHierarchical += currentNode.hierarchicalInfluence;
        this.transferInfoTo(currentNode, nsDummy);
      }
    }
  }

  /** The `for (LEdge edge : node.getOutgoingEdges())` loop, which occurs twice in `useBottomUp` (`:103`, `:126`). */
  private transferAlongOutgoingEdges(node: LNode, currentNode: NodeInfo, counts: PathCounts): void {
    for (const edge of node.getOutgoingEdges()) {
      counts.pathsToRandom += currentNode.randomInfluence;
      counts.pathsToHierarchical += currentNode.hierarchicalInfluence;
      this.transferInfoToTarget(currentNode, edge);
    }
  }

  /** @see LayerSweepTypeDecider.java:140 */
  private fixedPortOrder(): boolean {
    return this.graphData.parent()!.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed();
  }

  /** @see LayerSweepTypeDecider.java:144 */
  private transferInfoToTarget(currentNode: NodeInfo, edge: LEdge): void {
    const target = this.targetNode(edge);
    this.transferInfoTo(currentNode, target);
  }

  /** @see LayerSweepTypeDecider.java:149 */
  private transferInfoTo(currentNode: NodeInfo, target: LNode): void {
    const targetNodeInfo = this.nodeInfoFor(target);
    targetNodeInfo.transfer(currentNode);
    targetNodeInfo.connectedEdges++;
  }

  /** @see LayerSweepTypeDecider.java:177 */
  private fewerThanTwoInOutEdges(): boolean {
    return (
      this.graphData.parent()!.getPortSideView(PortSide.EAST).length < 2 &&
      this.graphData.parent()!.getPortSideView(PortSide.WEST).length < 2
    );
  }

  /** @see LayerSweepTypeDecider.java:182 */
  private rootNode(): boolean {
    return !this.graphData.hasParent();
  }

  /** @see LayerSweepTypeDecider.java:186 */
  private bottomUpForced(boundary: number): boolean {
    return boundary < -1;
  }

  /** @see LayerSweepTypeDecider.java:190 */
  private targetNode(edge: LEdge): LNode {
    return edge.getTarget()!.getNode()!;
  }

  /** @see LayerSweepTypeDecider.java:194 */
  private hasNoEasternPorts(node: LNode): boolean {
    const eastPorts = node.getPortSideView(PortSide.EAST);
    return eastPorts.length === 0 || !any(eastPorts, (p) => !isEmpty(p.getConnectedEdges()));
  }

  /** @see LayerSweepTypeDecider.java:199 */
  private hasNoWesternPorts(node: LNode): boolean {
    const westPorts = node.getPortSideView(PortSide.WEST);
    return westPorts.length === 0 || !any(westPorts, (p) => !isEmpty(p.getConnectedEdges()));
  }

  /** @see LayerSweepTypeDecider.java:204 */
  private isExternalPortDummy(node: LNode): boolean {
    return node.getType() === NodeType.EXTERNAL_PORT;
  }

  /** @see LayerSweepTypeDecider.java:208 */
  private isNorthSouthDummy(node: LNode): boolean {
    return node.getType() === NodeType.NORTH_SOUTH_PORT;
  }

  /** @see LayerSweepTypeDecider.java:212 */
  private isEasternDummy(node: LNode): boolean {
    return this.originPort(node).getSide() === PortSide.EAST;
  }

  /** @see LayerSweepTypeDecider.java:216 */
  private originPort(node: LNode): LPort {
    return node.getProperty(InternalProperties.ORIGIN) as LPort;
  }

  /** @see LayerSweepTypeDecider.java:220 */
  private nodeInfoFor(n: LNode): NodeInfo {
    return this.nodeInfo[n.getLayer()!.id]![n.id]!;
  }

  /** @see LayerSweepTypeDecider.java:225 */
  initAtLayerLevel(l: number, nodeOrder: LNode[][]): void {
    nodeOrder[l]![0]!.getLayer()!.id = l;
    this.nodeInfo[l] = new Array<NodeInfo>(nodeOrder[l]!.length);
  }

  /** @see LayerSweepTypeDecider.java:231 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    const node = nodeOrder[l]![n]!;
    node.id = n;
    this.nodeInfo[l]![n] = new NodeInfo();
  }
}
