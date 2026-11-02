// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { Pair } from '../../../../core/util/Pair.js';
import { isEmpty } from '../../../../guava/Iterables.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { CrossingsCounter } from '../../p3order/counting/CrossingsCounter.js';
import type { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import type { CrossingMatrixFiller } from './CrossingMatrixFiller.js';
import { NorthSouthEdgeNeighbouringNodeCrossingsCounter } from './NorthSouthEdgeNeighbouringNodeCrossingsCounter.js';

/**
 * The Java constructor arguments `graphData` and `oneSided`, grouped to respect the five-parameter limit (the Java
 * constructor has six parameters).
 */
export interface SwitchDeciderOptions {
  /** collected graphData */
  readonly graphData: GraphInfoHolder;
  /** whether greedy mode is one sided or two-sided (not one-sided) */
  readonly oneSided: boolean;
}

/**
 * This class decides whether two neighboring nodes should be switched. There are two variants:
 *
 * - OneSided – The traditional risky way: The decider checks if a switch would reduce crossings on the given side of
 *   the layer whose nodes are to be switched.
 * - TwoSided – The faithless way: The decider checks if a switch would reduce crossings on both sides of the layer
 *   whose nodes are to be switched.
 *
 * The nested enum `CrossingCountSide` is `SwitchDeciderCrossingCountSide` (M15).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/SwitchDecider.java
 */
export class SwitchDecider {
  private readonly freeLayer: LNode[];
  private readonly leftInLayerCounter: CrossingsCounter;
  private readonly rightInLayerCounter: CrossingsCounter;
  private readonly northSouthCounter: NorthSouthEdgeNeighbouringNodeCrossingsCounter;
  private readonly crossingMatrixFiller: CrossingMatrixFiller;
  private readonly graphData: GraphInfoHolder;
  private parentCrossCounter: CrossingsCounter | null = null;
  private readonly countCrossingsCausedByPortSwitch: boolean;

  /**
   * Creates SwitchDecider.
   *
   * @param freeLayerIndex The freeLayer to switch in.
   * @param graph The graph as LNode[][]
   * @param crossingMatrixFiller the crossing matrix filler
   * @param portPositions port position array
   * @param options collected graphData and whether greedy mode is one sided or two-sided (not one-sided)
   * @see SwitchDecider.java:63
   */
  constructor(
    freeLayerIndex: number,
    graph: LNode[][],
    crossingMatrixFiller: CrossingMatrixFiller,
    portPositions: Int32Array,
    options: SwitchDeciderOptions,
  ) {
    this.crossingMatrixFiller = crossingMatrixFiller;
    this.graphData = options.graphData;
    if (freeLayerIndex >= graph.length) {
      throw new IndexOutOfBoundsException('Greedy SwitchDecider: Free layer not in graph.');
    }
    this.freeLayer = graph[freeLayerIndex]!;

    this.leftInLayerCounter = new CrossingsCounter(portPositions);
    this.leftInLayerCounter.initPortPositionsForInLayerCrossings(this.freeLayer, PortSide.WEST);
    this.rightInLayerCounter = new CrossingsCounter(portPositions);
    this.rightInLayerCounter.initPortPositionsForInLayerCrossings(this.freeLayer, PortSide.EAST);
    this.northSouthCounter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter(this.freeLayer);
    this.countCrossingsCausedByPortSwitch =
      !options.oneSided &&
      this.graphData.hasParent() &&
      !this.graphData.dontSweepInto() &&
      this.freeLayer[0]!.getType() === NodeType.EXTERNAL_PORT;
    if (this.countCrossingsCausedByPortSwitch) {
      this.initParentCrossingsCounters(freeLayerIndex, graph.length);
    }
  }

  /** @see SwitchDecider.java:85 */
  private initParentCrossingsCounters(freeLayerIndex: number, length: number): void {
    const parentGraphData = this.graphData.parentGraphData()!;
    const parentNodeOrder = parentGraphData.currentNodeOrder();
    const portPos = parentGraphData.portPositions();
    this.parentCrossCounter = new CrossingsCounter(portPos);
    const parentNodeLayerPos = this.graphData.parent()!.getLayer()!.id;
    const leftLayer: LNode[] = parentNodeLayerPos > 0 ? parentNodeOrder[parentNodeLayerPos - 1]! : [];
    const middleLayer = parentNodeOrder[parentNodeLayerPos]!;
    const rightLayer: LNode[] =
      parentNodeLayerPos < parentNodeOrder.length - 1 ? parentNodeOrder[parentNodeLayerPos + 1]! : [];
    const rightMostLayer = freeLayerIndex === length - 1;
    if (rightMostLayer) {
      this.parentCrossCounter.initForCountingBetween(middleLayer, rightLayer);
    } else {
      this.parentCrossCounter.initForCountingBetween(leftLayer, middleLayer);
    }
  }

  /**
   * Notifies in-layer counter of node switch for efficiency reasons.
   *
   * @param upperNode a node
   * @param lowerNode a node
   * @see SwitchDecider.java:111
   */
  notifyOfSwitch(upperNode: LNode, lowerNode: LNode): void {
    this.leftInLayerCounter.switchNodes(upperNode, lowerNode, PortSide.WEST);
    this.rightInLayerCounter.switchNodes(upperNode, lowerNode, PortSide.EAST);
    if (this.countCrossingsCausedByPortSwitch) {
      const upperPort = upperNode.getProperty(InternalProperties.ORIGIN) as LPort;
      const lowerPort = lowerNode.getProperty(InternalProperties.ORIGIN) as LPort;
      this.parentCrossCounter!.switchPorts(upperPort, lowerPort);
    }
  }

  /**
   * @returns whether switching the nodes represented by the indices would reduce the number of crossings.
   * @see SwitchDecider.java:124
   */
  doesSwitchReduceCrossings(upperNodeIndex: number, lowerNodeIndex: number): boolean {
    if (this.constraintsPreventSwitch(upperNodeIndex, lowerNodeIndex)) {
      return false;
    }

    const upperNode = this.freeLayer[upperNodeIndex]!;
    const lowerNode = this.freeLayer[lowerNodeIndex]!;

    const { leftInlayer, rightInlayer } = this.countInLayerCrossings(upperNode, lowerNode);
    this.northSouthCounter.countCrossings(upperNode, lowerNode);
    let upperLowerCrossings =
      this.crossingMatrixFiller.getCrossingMatrixEntry(upperNode, lowerNode) +
      leftInlayer.getFirst()! +
      rightInlayer.getFirst()! +
      this.northSouthCounter.getUpperLowerCrossings();
    let lowerUpperCrossings =
      this.crossingMatrixFiller.getCrossingMatrixEntry(lowerNode, upperNode) +
      leftInlayer.getSecond()! +
      rightInlayer.getSecond()! +
      this.northSouthCounter.getLowerUpperCrossings();

    if (this.countCrossingsCausedByPortSwitch) {
      const crossingNumbers = this.countCrossingsBetweenOriginPorts(upperNode, lowerNode);
      upperLowerCrossings += crossingNumbers.getFirst()!;
      lowerUpperCrossings += crossingNumbers.getSecond()!;
    }

    return upperLowerCrossings > lowerUpperCrossings;
  }

  /** The two in-layer counter calls at the top of `doesSwitchReduceCrossings` (`SwitchDecider.java:133-136`). */
  private countInLayerCrossings(
    upperNode: LNode,
    lowerNode: LNode,
  ): { leftInlayer: Pair<number, number>; rightInlayer: Pair<number, number> } {
    const leftInlayer = this.leftInLayerCounter.countInLayerCrossingsBetweenNodesInBothOrders(
      upperNode,
      lowerNode,
      PortSide.WEST,
    );
    const rightInlayer = this.rightInLayerCounter.countInLayerCrossingsBetweenNodesInBothOrders(
      upperNode,
      lowerNode,
      PortSide.EAST,
    );
    return { leftInlayer, rightInlayer };
  }

  /** The `countCrossingsCausedByPortSwitch` block of `doesSwitchReduceCrossings` (`SwitchDecider.java:147-154`). */
  private countCrossingsBetweenOriginPorts(upperNode: LNode, lowerNode: LNode): Pair<number, number> {
    const upperPort = upperNode.getProperty(InternalProperties.ORIGIN) as LPort;
    const lowerPort = lowerNode.getProperty(InternalProperties.ORIGIN) as LPort;
    return this.parentCrossCounter!.countCrossingsBetweenPortsInBothOrders(upperPort, lowerPort);
  }

  /**
   * Check if in layer `InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS` or `InternalProperties.IN_LAYER_LAYOUT_UNIT`
   * constraints prevent a possible switch or if the nodes are a normal node and a north south port dummy.
   *
   * @param nodeIndex the index of the upper node, assuming a left-right order.
   * @param lowerNodeIndex the index of the lower node, assuming a left-right order.
   * @returns true if constraints should prevent switching.
   * @see SwitchDecider.java:171
   */
  private constraintsPreventSwitch(nodeIndex: number, lowerNodeIndex: number): boolean {
    const upperNode = this.freeLayer[nodeIndex]!;
    const lowerNode = this.freeLayer[lowerNodeIndex]!;

    return (
      this.haveSuccessorConstraints(upperNode, lowerNode) ||
      this.haveLayoutUnitConstraints(upperNode, lowerNode) ||
      this.areNormalAndNorthSouthPortDummy(upperNode, lowerNode)
    );
  }

  /** @see SwitchDecider.java:180 */
  private haveSuccessorConstraints(upperNode: LNode, lowerNode: LNode): boolean {
    const constraints: LNode[] | null = upperNode.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS);
    const hasSuccessorConstraint = constraints !== null && constraints.length !== 0 && constraints.includes(lowerNode);
    return hasSuccessorConstraint;
  }

  /** @see SwitchDecider.java:188 */
  private haveLayoutUnitConstraints(upperNode: LNode, lowerNode: LNode): boolean {
    const neitherNodeIsLongEdgeDummy =
      upperNode.getType() !== NodeType.LONG_EDGE && lowerNode.getType() !== NodeType.LONG_EDGE;

    // If upperNode and lowerNode are part of a layout unit not only containing themselves,
    // then the layout units must be equal for a switch to be allowed.
    const upperLayoutUnit: LNode | null = upperNode.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);
    const lowerLayoutUnit: LNode | null = lowerNode.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);

    const areInDifferentLayoutUnits = upperLayoutUnit !== lowerLayoutUnit;

    // FIXME the following predicate is problematic, layout units are represented by a regular node,
    // thus 'upperNode' can be 'upperLayoutUnit' and still have more nodes in the layout unit
    let nodesHaveLayoutUnits =
      this.partOfMultiNodeLayoutUnit(upperNode, upperLayoutUnit) ||
      this.partOfMultiNodeLayoutUnit(lowerNode, lowerLayoutUnit);

    const upperNodeHasNorthernEdges = this.hasEdgesOnSide(upperNode, PortSide.NORTH);
    const lowerNodeHasSouthernEdges = this.hasEdgesOnSide(lowerNode, PortSide.SOUTH);

    // hotfix for #162, if north or south edges are present, there must be a layout unit
    nodesHaveLayoutUnits =
      nodesHaveLayoutUnits ||
      this.hasEdgesOnSide(upperNode, PortSide.SOUTH) ||
      this.hasEdgesOnSide(lowerNode, PortSide.NORTH);

    const hasLayoutUnitConstraint =
      (nodesHaveLayoutUnits && areInDifferentLayoutUnits) || upperNodeHasNorthernEdges || lowerNodeHasSouthernEdges;

    return neitherNodeIsLongEdgeDummy && hasLayoutUnitConstraint;
  }

  /** @see SwitchDecider.java:218 */
  private hasEdgesOnSide(node: LNode, side: PortSide): boolean {
    const ports = node.getPortSideView(side);
    for (const port of ports) {
      if (port.getProperty(InternalProperties.PORT_DUMMY) !== null || !isEmpty(port.getConnectedEdges())) {
        return true;
      }
    }
    return false;
  }

  /** @see SwitchDecider.java:229 */
  private partOfMultiNodeLayoutUnit(node: LNode, layoutUnit: LNode | null): boolean {
    return layoutUnit !== null && layoutUnit !== node;
  }

  /** @see SwitchDecider.java:233 */
  private areNormalAndNorthSouthPortDummy(upperNode: LNode, lowerNode: LNode): boolean {
    return (
      (this.isNorthSouthPortNode(upperNode) && this.isNormalNode(lowerNode)) ||
      (this.isNorthSouthPortNode(lowerNode) && this.isNormalNode(upperNode))
    );
  }

  /** @see SwitchDecider.java:238 */
  private isNormalNode(node: LNode): boolean {
    return node.getType() === NodeType.NORMAL;
  }

  /** @see SwitchDecider.java:242 */
  private isNorthSouthPortNode(node: LNode): boolean {
    return node.getType() === NodeType.NORTH_SOUTH_PORT;
  }
}
