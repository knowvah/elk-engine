// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import type { Triple } from '../../../core/util/Triple.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';

/** The two bend points a gap computes for one registered edge. */
type BendPair = readonly [bend1: KVector, bend2: KVector];

/**
 * This class keeps track of all the multi level edges bendPoints that come through this node node gap and updates the
 * registered bendPoints if new edges are added.
 *
 * `bendPoints` is a Java `LinkedList` that is only appended to, sorted and iterated: an array keeps exactly that
 * behaviour (`List.sort` is stable, as `Array.prototype.sort`).
 *
 * @author jnc
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/MultiLevelEdgeNodeNodeGap.java
 */
export class MultiLevelEdgeNodeNodeGap {
  private readonly neighborOne: TNode | null;
  private readonly neighborTwo: TNode | null;
  private readonly bendPoints: Array<Triple<KVector, KVector, TEdge>>;
  private readonly graph: TGraph;
  private readonly d: Direction;
  private readonly nodeBendpointPadding: number;
  private onFirstNodeSide = false;
  private onLastNodeSide = false;

  /**
   * Creates a new MultiLevelEdgeNodeNodeGap object.
   *
   * @param neighborOne the neighbor with the lower index
   * @param neighborTwo the neighbor with the higher index
   * @param bendTriple the bendPoints between the two nodes
   * @param graph the graph the nodes are in
   */
  constructor(
    neighborOne: TNode | null,
    neighborTwo: TNode | null,
    bendTriple: Triple<KVector, KVector, TEdge>,
    graph: TGraph,
  ) {
    this.neighborOne = neighborOne;
    this.neighborTwo = neighborTwo;
    this.graph = graph;

    const bends: Array<Triple<KVector, KVector, TEdge>> = [];
    bends.push(bendTriple);
    this.bendPoints = bends;

    this.d = graph.getProperty(MrTreeOptions.DIRECTION);
    this.nodeBendpointPadding = graph.getProperty(MrTreeOptions.SPACING_EDGE_NODE);

    this.updateBendPoints();
  }

  /**
   * @return the neighborOne
   */
  getNeighborOne(): TNode | null {
    return this.neighborOne;
  }

  /**
   * @return the neighborTwo
   */
  getNeighborTwo(): TNode | null {
    return this.neighborTwo;
  }

  /**
   * @return the onFirstNodeSide
   */
  isOnFirstNodeSide(): boolean {
    return this.onFirstNodeSide;
  }

  /**
   * @return the onLastNodeSide
   */
  isOnLastNodeSide(): boolean {
    return this.onLastNodeSide;
  }

  /**
   * Adds new bendPoints to the gap.
   *
   * @param newBends the two new bendPoints
   */
  addBendPoints(newBends: Triple<KVector, KVector, TEdge>): void {
    this.bendPoints.push(newBends);

    if (this.d.isHorizontal()) {
      this.bendPoints.sort((x, y) =>
        compareDoubles(x.getThird().getTarget()!.getPosition().y, y.getThird().getTarget()!.getPosition().y),
      );
    } else {
      this.bendPoints.sort((x, y) =>
        compareDoubles(x.getThird().getTarget()!.getPosition().x, y.getThird().getTarget()!.getPosition().x),
      );
    }

    this.updateBendPoints();
  }

  /**
   * Updates the BendPoints according to the new amount of edges that come through this gap.
   */
  private updateBendPoints(): void {
    let i = 0;
    const count = this.bendPoints.length;
    for (const p of this.bendPoints) {
      let bends: BendPair;
      const interpolation = (i + 1) / (count + 1);
      if (this.neighborOne === null && this.neighborTwo === null) {
        return;
      } else if (this.neighborOne !== null && this.neighborTwo === null) {
        // Bendpoint should be placed next to last node
        this.onLastNodeSide = true;
        bends = this.bendPointsNextToLastNode(this.neighborOne, i);
      } else if (this.neighborOne !== null && this.neighborTwo !== null) {
        // Bendpoint should be placed in between two nodes
        bends = this.bendPointsBetweenNodes(this.neighborOne, this.neighborTwo, interpolation);
      } else {
        // Bendpoint should be placed next to the first node
        this.onFirstNodeSide = true;
        bends = this.bendPointsNextToFirstNode(this.neighborTwo!, i);
      }

      // Commit new values
      p.getFirst().x = bends[0].x;
      p.getFirst().y = bends[0].y;
      p.getSecond().x = bends[1].x;
      p.getSecond().y = bends[1].y;

      i++;
    }
  }

  /**
   * The `neighborOne != null && neighborTwo == null` arm of `updateBendPoints`.
   *
   * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/MultiLevelEdgeNodeNodeGap.java:123
   */
  private bendPointsNextToLastNode(neighborOne: TNode, i: number): BendPair {
    const pad = this.nodeBendpointPadding;
    const levelMax = neighborOne.getProperty(InternalProperties.LEVELMAX);
    const levelMin = neighborOne.getProperty(InternalProperties.LEVELMIN);
    let bendTmp: number;
    if (this.d === Direction.LEFT) {
      bendTmp = neighborOne.getPosition().y + neighborOne.getSize().y + pad * (i + 1);
      return [new KVector(levelMax + pad, bendTmp), new KVector(levelMin - pad, bendTmp)];
    } else if (this.d === Direction.RIGHT) {
      bendTmp = neighborOne.getPosition().y + neighborOne.getSize().y + pad * (i + 1);
      return [new KVector(levelMin - pad, bendTmp), new KVector(levelMax + pad, bendTmp)];
    } else if (this.d === Direction.UP) {
      bendTmp = neighborOne.getPosition().x + neighborOne.getSize().x + pad * (i + 1);
      return [new KVector(bendTmp, levelMax + pad), new KVector(bendTmp, levelMin - pad)];
    } else {
      bendTmp = neighborOne.getPosition().x + neighborOne.getSize().x + pad * (i + 1);
      return [new KVector(bendTmp, levelMin - pad), new KVector(bendTmp, levelMax + pad)];
    }
  }

  /**
   * The `neighborOne != null && neighborTwo != null` arm of `updateBendPoints`.
   *
   * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/MultiLevelEdgeNodeNodeGap.java:150
   */
  private bendPointsBetweenNodes(neighborOne: TNode, neighborTwo: TNode, interpolation: number): BendPair {
    const pad = this.nodeBendpointPadding;
    const levelMax = neighborOne.getProperty(InternalProperties.LEVELMAX);
    const levelMin = neighborOne.getProperty(InternalProperties.LEVELMIN);
    let bendTmp: number;
    if (this.d === Direction.LEFT) {
      bendTmp =
        neighborTwo.getPosition().y * interpolation +
        (neighborOne.getPosition().y + neighborOne.getSize().y) * (1 - interpolation);
      return [new KVector(levelMax + pad, bendTmp), new KVector(levelMin - pad, bendTmp)];
    } else if (this.d === Direction.RIGHT) {
      bendTmp =
        neighborTwo.getPosition().y * interpolation +
        (neighborOne.getPosition().y + neighborOne.getSize().y) * (1 - interpolation);
      return [new KVector(levelMin - pad, bendTmp), new KVector(levelMax + pad, bendTmp)];
    } else if (this.d === Direction.UP) {
      bendTmp =
        neighborTwo.getPosition().x * interpolation +
        (neighborOne.getPosition().x + neighborOne.getSize().x) * (1 - interpolation);
      return [new KVector(bendTmp, levelMax + pad), new KVector(bendTmp, levelMin - pad)];
    } else {
      bendTmp =
        neighborTwo.getPosition().x * interpolation +
        (neighborOne.getPosition().x + neighborOne.getSize().x) * (1 - interpolation);
      return [new KVector(bendTmp, levelMin - pad), new KVector(bendTmp, levelMax + pad)];
    }
  }

  /**
   * The final (`neighborOne == null`, `neighborTwo != null`) arm of `updateBendPoints`. The level bounds are read from
   * `neighborTwo` here, as in Java.
   *
   * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/MultiLevelEdgeNodeNodeGap.java:180
   */
  private bendPointsNextToFirstNode(neighborTwo: TNode, i: number): BendPair {
    const pad = this.nodeBendpointPadding;
    const levelMax = neighborTwo.getProperty(InternalProperties.LEVELMAX);
    const levelMin = neighborTwo.getProperty(InternalProperties.LEVELMIN);
    let bendTmp: number;
    if (this.d === Direction.LEFT) {
      bendTmp = neighborTwo.getPosition().y - pad * (i + 1);
      return [new KVector(levelMax + pad, bendTmp), new KVector(levelMin - pad, bendTmp)];
    } else if (this.d === Direction.RIGHT) {
      bendTmp = neighborTwo.getPosition().y - pad * (i + 1);
      return [new KVector(levelMin - pad, bendTmp), new KVector(levelMax + pad, bendTmp)];
    } else if (this.d === Direction.UP) {
      bendTmp = neighborTwo.getPosition().x - pad * (i + 1);
      return [new KVector(bendTmp, levelMax + pad), new KVector(bendTmp, levelMin - pad)];
    } else {
      bendTmp = neighborTwo.getPosition().x - pad * (i + 1);
      return [new KVector(bendTmp, levelMin - pad), new KVector(bendTmp, levelMax + pad)];
    }
  }
}
