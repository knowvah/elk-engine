// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { Layer } from '../../graph/Layer.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { HyperedgeCrossingsCounterHyperedge as Hyperedge } from './HyperedgeCrossingsCounterHyperedge.js';
import { HyperedgeCrossingsCounterHyperedgeCorner as HyperedgeCorner } from './HyperedgeCrossingsCounterHyperedgeCorner.js';
import { HyperedgeCrossingsCounterHyperedgeCornerType as CornerType } from './HyperedgeCrossingsCounterHyperedgeCornerType.js';

/**
 * Crossings counter implementation specialized for hyperedges. It also works for normal edges, but is considerably
 * slower compared to other implementations. For normal edges the computed number of crossings is exact, while for
 * hyperedges it is an estimation. In fact, it is impossible to reliably count the number of crossings at this stage of
 * the layer-based approach. See the following publication for details.
 *
 * - M. Spönemann, C. D. Schulze, U. Rüegg, R. von Hanxleden. Counting crossings for layered hypergraphs, In
 *   _DIAGRAMS 2014_, volume 8578 of LNAI, Springer, 2014.
 *
 * Java's one 211-line `countCrossings` is split at its own comment sections (the helpers below, in Java order), which
 * hand the Java locals on as arguments and results.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java
 */
export class HyperedgeCrossingsCounter {
  /** Port position array used for counting the number of edge crossings. */
  private readonly portPos: Int32Array;

  /**
   * Create a hyperedge crossings counter.
   *
   * @param _inLayerEdgeCount The number of in-layer edges for each layer, including virtual connections to north/south
   *   dummies (unused by the Java too)
   * @param _hasNorthSouthPorts Whether the layers contain north / south port dummies or not (unused by the Java too)
   * @param portPos Port position array used for counting the number of edge crossings
   * @see HyperedgeCrossingsCounter.java:65
   */
  constructor(_inLayerEdgeCount: Int32Array, _hasNorthSouthPorts: boolean[], portPos: Int32Array) {
    this.portPos = portPos;
  }

  /**
   * Special crossings counting method for hyperedges. See
   *
   * - M. Spönemann, C. D. Schulze, U. Rüegg, R. von Hanxleden. Counting crossings for layered hypergraphs, In
   *   _DIAGRAMS 2014_, volume 8578 of LNAI, Springer, 2014.
   *
   * @param leftLayer the left layer
   * @param rightLayer the right layer
   * @returns the number of edge crossings
   * @see HyperedgeCrossingsCounter.java:154
   */
  countCrossings(leftLayer: LNode[], rightLayer: LNode[]): number {
    const sourceCount = this.assignLeftLayerIndices(leftLayer);
    const targetCount = this.assignRightLayerIndices(rightLayer);

    const hyperedgeSet = this.gatherHyperedges(leftLayer);

    // Determine top and bottom positions for each hyperedge
    const hyperedges: Hyperedge[] = [...hyperedgeSet];
    this.determineTopAndBottomPositions(hyperedges, leftLayer, rightLayer, sourceCount, targetCount);

    // Determine the sequence of edge target positions sorted by source and target index
    hyperedges.sort((a, b) => a.compareTo(b));
    const { southSequence, q } = this.compressSouthSequence(hyperedges, targetCount);

    let crossings = this.countStraightLineCrossings(southSequence, q);

    crossings = Int32.add(crossings, this.countLeftCornerCrossings(hyperedges));
    crossings = Int32.add(crossings, this.countRightCornerCrossings(hyperedges));

    return crossings;
  }

  /**
   * Assign index values to the ports of the left layer; returns Java's `sourceCount`.
   *
   * @see HyperedgeCrossingsCounter.java:155
   */
  private assignLeftLayerIndices(leftLayer: LNode[]): number {
    let sourceCount = 0;
    for (const node of leftLayer) {
      // Assign index values in the order north - east - south - west
      for (const port of node.getPorts()) {
        let portEdges = 0;
        for (const edge of port.getOutgoingEdges()) {
          if (node.getLayer() !== edge.getTarget()!.getNode()!.getLayer()) {
            portEdges++;
          }
        }
        if (portEdges > 0) {
          this.portPos[port.id] = sourceCount++;
        }
      }
    }
    return sourceCount;
  }

  /**
   * Assign index values to the ports of the right layer; returns Java's `targetCount`.
   *
   * @see HyperedgeCrossingsCounter.java:172
   */
  private assignRightLayerIndices(rightLayer: LNode[]): number {
    let targetCount = 0;
    for (const node of rightLayer) {
      const northInputPorts = this.countNorthInputPorts(node);

      // Assign index values in the order north - west - south - east
      let otherInputPorts = 0;
      const nodePorts = node.getPorts();
      for (let i = nodePorts.length - 1; i >= 0; i--) {
        const port = nodePorts[i]!;
        let portEdges = 0;
        for (const edge of port.getIncomingEdges()) {
          if (node.getLayer() !== edge.getSource()!.getNode()!.getLayer()) {
            portEdges++;
          }
        }
        if (portEdges > 0) {
          if (port.getSide() === PortSide.NORTH) {
            this.portPos[port.id] = targetCount;
            targetCount++;
          } else {
            this.portPos[port.id] = targetCount + northInputPorts + otherInputPorts;
            otherInputPorts++;
          }
        }
      }
      targetCount += otherInputPorts;
    }
    return targetCount;
  }

  /**
   * Determine how many input ports there are on the north side (note that the standard port order is north - east -
   * south - west).
   *
   * @see HyperedgeCrossingsCounter.java:175
   */
  private countNorthInputPorts(node: LNode): number {
    let northInputPorts = 0;
    for (const port of node.getPorts()) {
      if (port.getSide() === PortSide.NORTH) {
        for (const edge of port.getIncomingEdges()) {
          if (node.getLayer() !== edge.getSource()!.getNode()!.getLayer()) {
            northInputPorts++;
            break;
          }
        }
      } else {
        break;
      }
    }
    return northInputPorts;
  }

  /**
   * Gather hyperedges. `Maps.newHashMap()` keyed by `LPort` and `Sets.newLinkedHashSet()` of `Hyperedge` are
   * identity-hashed (neither class overrides `hashCode`): an insertion-ordered `Map`/`Set` (AD-10).
   *
   * @see HyperedgeCrossingsCounter.java:215
   */
  private gatherHyperedges(leftLayer: LNode[]): Set<Hyperedge> {
    const port2HyperedgeMap = new Map<LPort, Hyperedge>();
    const hyperedgeSet = new Set<Hyperedge>();
    for (const node of leftLayer) {
      for (const sourcePort of node.getPorts()) {
        for (const edge of sourcePort.getOutgoingEdges()) {
          const targetPort = edge.getTarget()!;
          if (node.getLayer() !== targetPort.getNode()!.getLayer()) {
            this.addEdgeToHyperedges(port2HyperedgeMap, hyperedgeSet, edge, sourcePort, targetPort);
          }
        }
      }
    }
    return hyperedgeSet;
  }

  /**
   * The branches of the innermost `gatherHyperedges` loop body: look up the hyperedges of both end ports and extend,
   * create or merge.
   *
   * @see HyperedgeCrossingsCounter.java:223
   */
  private addEdgeToHyperedges(
    port2HyperedgeMap: Map<LPort, Hyperedge>,
    hyperedgeSet: Set<Hyperedge>,
    edge: LEdge,
    sourcePort: LPort,
    targetPort: LPort,
  ): void {
    const sourceHE = port2HyperedgeMap.get(sourcePort) ?? null;
    const targetHE = port2HyperedgeMap.get(targetPort) ?? null;
    if (sourceHE === null && targetHE === null) {
      this.createHyperedge(port2HyperedgeMap, hyperedgeSet, edge, sourcePort, targetPort);
    } else if (sourceHE === null) {
      targetHE!.edges.push(edge);
      targetHE!.ports.push(sourcePort);
      port2HyperedgeMap.set(sourcePort, targetHE!);
    } else if (targetHE === null) {
      sourceHE.edges.push(edge);
      sourceHE.ports.push(targetPort);
      port2HyperedgeMap.set(targetPort, sourceHE);
    } else if (sourceHE === targetHE) {
      sourceHE.edges.push(edge);
    } else {
      this.mergeHyperedges(port2HyperedgeMap, hyperedgeSet, edge, sourceHE, targetHE);
    }
  }

  /** @see HyperedgeCrossingsCounter.java:225 */
  private createHyperedge(
    port2HyperedgeMap: Map<LPort, Hyperedge>,
    hyperedgeSet: Set<Hyperedge>,
    edge: LEdge,
    sourcePort: LPort,
    targetPort: LPort,
  ): void {
    const hyperedge = new Hyperedge();
    hyperedgeSet.add(hyperedge);
    hyperedge.edges.push(edge);
    hyperedge.ports.push(sourcePort);
    port2HyperedgeMap.set(sourcePort, hyperedge);
    hyperedge.ports.push(targetPort);
    port2HyperedgeMap.set(targetPort, hyperedge);
  }

  /** @see HyperedgeCrossingsCounter.java:243 */
  private mergeHyperedges(
    port2HyperedgeMap: Map<LPort, Hyperedge>,
    hyperedgeSet: Set<Hyperedge>,
    edge: LEdge,
    sourceHE: Hyperedge,
    targetHE: Hyperedge,
  ): void {
    sourceHE.edges.push(edge);
    for (const p of targetHE.ports) {
      port2HyperedgeMap.set(p, sourceHE);
    }
    sourceHE.edges.push(...targetHE.edges);
    sourceHE.ports.push(...targetHE.ports);
    hyperedgeSet.delete(targetHE);
  }

  /**
   * Determine top and bottom positions for each hyperedge.
   *
   * @see HyperedgeCrossingsCounter.java:257
   */
  private determineTopAndBottomPositions(
    hyperedges: Hyperedge[],
    leftLayer: LNode[],
    rightLayer: LNode[],
    sourceCount: number,
    targetCount: number,
  ): void {
    const leftLayerRef = leftLayer[0]!.getLayer();
    const rightLayerRef = rightLayer[0]!.getLayer();
    for (const he of hyperedges) {
      he.upperLeft = sourceCount;
      he.upperRight = targetCount;
      for (const port of he.ports) {
        this.updateBounds(he, port, leftLayerRef, rightLayerRef);
      }
    }
  }

  /**
   * The body of the `for (LPort port : he.ports)` loop of `determineTopAndBottomPositions`.
   *
   * @see HyperedgeCrossingsCounter.java:264
   */
  private updateBounds(he: Hyperedge, port: LPort, leftLayerRef: Layer | null, rightLayerRef: Layer | null): void {
    const pos = this.portPos[port.id]!;
    if (port.getNode()!.getLayer() === leftLayerRef) {
      if (pos < he.upperLeft) {
        he.upperLeft = pos;
      }
      if (pos > he.lowerLeft) {
        he.lowerLeft = pos;
      }
    } else if (port.getNode()!.getLayer() === rightLayerRef) {
      if (pos < he.upperRight) {
        he.upperRight = pos;
      }
      if (pos > he.lowerRight) {
        he.lowerRight = pos;
      }
    }
  }

  /**
   * The sequence of edge target positions, compressed by `compressDeltas`; `q` is Java's running maximum of
   * `southSequence[i] + 1`.
   *
   * @see HyperedgeCrossingsCounter.java:285
   */
  private compressSouthSequence(
    hyperedges: Hyperedge[],
    targetCount: number,
  ): { southSequence: Int32Array; q: number } {
    const southSequence = new Int32Array(hyperedges.length);
    const compressDeltas = new Int32Array(Int32.add(targetCount, 1));
    for (let i = 0; i < hyperedges.length; i++) {
      southSequence[i] = hyperedges[i]!.upperRight;
      compressDeltas[southSequence[i]!] = 1;
    }
    let delta = 0;
    for (let i = 0; i < compressDeltas.length; i++) {
      if (compressDeltas[i] === 1) {
        compressDeltas[i] = delta;
      } else {
        delta--;
      }
    }
    let q = 0;
    for (let i = 0; i < southSequence.length; i++) {
      southSequence[i] = Int32.add(southSequence[i]!, compressDeltas[southSequence[i]!]!);
      q = Math.max(q, Int32.add(southSequence[i]!, 1));
    }
    return { southSequence, q };
  }

  /**
   * Build the accumulator tree and count the straight-line crossings of the topmost edges.
   *
   * @see HyperedgeCrossingsCounter.java:307
   */
  private countStraightLineCrossings(southSequence: Int32Array, q: number): number {
    let firstIndex = 1;
    while (firstIndex < q) {
      firstIndex = Int32.mul(firstIndex, 2);
    }
    const treeSize = Int32.sub(Int32.mul(2, firstIndex), 1);
    firstIndex -= 1;
    const tree = new Int32Array(treeSize);

    // Count the straight-line crossings of the topmost edges
    let crossings = 0;
    for (let k = 0; k < southSequence.length; k++) {
      let index = Int32.add(southSequence[k]!, firstIndex);
      tree[index] = Int32.add(tree[index]!, 1);
      while (index > 0) {
        if (Int32.rem(index, 2) > 0) {
          crossings = Int32.add(crossings, tree[index + 1]!);
        }
        index = Int32.div(Int32.sub(index, 1), 2);
        tree[index] = Int32.add(tree[index]!, 1);
      }
    }
    return crossings;
  }

  /**
   * Create corners for the left side and count crossings caused by overlapping hyperedge areas on the left side.
   *
   * @see HyperedgeCrossingsCounter.java:331
   */
  private countLeftCornerCrossings(hyperedges: Hyperedge[]): number {
    const leftCorners: HyperedgeCorner[] = new Array<HyperedgeCorner>(hyperedges.length * 2);
    for (let i = 0; i < hyperedges.length; i++) {
      const he = hyperedges[i]!;
      leftCorners[2 * i] = new HyperedgeCorner(he, he.upperLeft, he.lowerLeft, CornerType.UPPER);
      leftCorners[2 * i + 1] = new HyperedgeCorner(he, he.lowerLeft, he.upperLeft, CornerType.LOWER);
    }
    leftCorners.sort((a, b) => a.compareTo(b));
    return this.countOverlaps(leftCorners);
  }

  /**
   * Create corners for the right side and count crossings caused by overlapping hyperedge areas on the right side.
   *
   * @see HyperedgeCrossingsCounter.java:356
   */
  private countRightCornerCrossings(hyperedges: Hyperedge[]): number {
    const rightCorners: HyperedgeCorner[] = new Array<HyperedgeCorner>(hyperedges.length * 2);
    for (let i = 0; i < hyperedges.length; i++) {
      const he = hyperedges[i]!;
      rightCorners[2 * i] = new HyperedgeCorner(he, he.upperRight, he.lowerRight, CornerType.UPPER);
      rightCorners[2 * i + 1] = new HyperedgeCorner(he, he.lowerRight, he.upperRight, CornerType.LOWER);
    }
    rightCorners.sort((a, b) => a.compareTo(b));
    return this.countOverlaps(rightCorners);
  }

  /**
   * The `switch (corners[i].type)` loop of the two corner sections (identical in Java, which holds it twice:
   * `:341` for the left and `:366` for the right corners).
   *
   * @see HyperedgeCrossingsCounter.java:341
   */
  private countOverlaps(corners: HyperedgeCorner[]): number {
    let crossings = 0;
    let openHyperedges = 0;
    for (let i = 0; i < corners.length; i++) {
      switch (corners[i]!.type) {
        case CornerType.UPPER:
          openHyperedges++;
          break;
        case CornerType.LOWER:
          openHyperedges--;
          crossings = Int32.add(crossings, openHyperedges);
          break;
      }
    }
    return crossings;
  }
}
