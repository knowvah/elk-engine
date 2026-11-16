// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { ForceOptions } from '../options/ForceOptions.js';
import { FBendpoint } from './FBendpoint.js';
import type { FEdge } from './FEdge.js';
import type { FLabel } from './FLabel.js';
import { FNode } from './FNode.js';
import type { FParticle } from './FParticle.js';

/**
 * A graph for the force layouter.
 *
 * @author owo
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FGraph.java
 */
export class FGraph extends MapPropertyHolder {
  /** All nodes of this graph. */
  private readonly nodes: FNode[] = [];
  /** All edges of this graph. */
  private readonly edges: FEdge[] = [];
  /** All labels of this graph. */
  private readonly labels: FLabel[] = [];
  /** All bend points of this graph. */
  private readonly bendPoints: FBendpoint[] = [];
  /** adjacency matrix of the graph (`int[][]`, `null` until `calcAdjacency`). */
  private adjacency: number[][] | null = null;

  /**
   * Returns the list of edges for this graph.
   *
   * @return the edges
   */
  getEdges(): FEdge[] {
    return this.edges;
  }

  /**
   * Returns the list of nodes for this graph.
   *
   * @return the nodes
   */
  getNodes(): FNode[] {
    return this.nodes;
  }

  /**
   * Returns the list of labels for this graph.
   *
   * @return the labels
   */
  getLabels(): FLabel[] {
    return this.labels;
  }

  /**
   * Returns the list of bend points for this graph.
   *
   * @return the bend points
   */
  getBendpoints(): FBendpoint[] {
    return this.bendPoints;
  }

  /**
   * Returns a list of all particles occurring in the graph: vertices, labels, and bend points. Like Guava's
   * `Iterables.concat` it is a live view of the three lists.
   *
   * @return iterable over all particles
   */
  getParticles(): Iterable<FParticle> {
    return Iterables.concat<FParticle>(this.nodes, this.labels, this.bendPoints);
  }

  /**
   * Determines the amount of connection between the two given particles, considering the priority value of the
   * respective edges.
   *
   * @param particle1 first particle
   * @param particle2 second particle
   * @return the amount of connection
   */
  getConnection(particle1: FParticle, particle2: FParticle): number {
    if (particle1 instanceof FNode && particle2 instanceof FNode) {
      const node1 = particle1;
      const node2 = particle2;
      const adjacency = this.adjacency!;
      return Int32.add(adjacency[node1.id]![node2.id]!, adjacency[node2.id]![node1.id]!);
    } else if (particle1 instanceof FBendpoint && particle2 instanceof FBendpoint) {
      const bpoint1 = particle1;
      const bpoint2 = particle2;
      if (bpoint1.getEdge() === bpoint2.getEdge()) {
        return bpoint2.getEdge().getProperty(ForceOptions.PRIORITY);
      }
    }
    return 0;
  }

  /** Calculate the adjacency matrix of the graph. */
  calcAdjacency(): void {
    const n = this.nodes.length;
    const adjacency: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    this.adjacency = adjacency;

    for (const edge of this.edges) {
      const row = adjacency[edge.getSource()!.id]!;
      const column = edge.getTarget()!.id;
      row[column] = Int32.add(row[column]!, edge.getProperty(ForceOptions.PRIORITY));
    }
  }
}
