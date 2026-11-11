// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { identity } from '../../../java/util/HashStrategy.js';
import { PriorityQueue } from '../../../java/util/PriorityQueue.js';
import { KVector } from '../../../core/math/KVector.js';
import { LinkedListMultimap } from '../../../guava/LinkedListMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import type { FEdge } from '../graph/FEdge.js';
import type { FGraph } from '../graph/FGraph.js';
import type { FNode } from '../graph/FNode.js';
import { StressOptions } from '../options/StressOptions.js';
import { Dimension } from './Dimension.js';

/**
 * Implementation of stress minimizing layout as described by Gansner, Koren, and North.
 * <ul><li>
 * Emden Gansner, Yehuda Koren, and Stephen North. Graph drawing by stress majorization. <em>Graph Drawing</em>, 2005.
 * </li></ul>
 *
 * The implementation supports performing a layout in one dimension only, preserving the coordinates of the other
 * dimension. For this, set {@link StressOptions#DIMENSION} to either {@link Dimension#X} or {@link Dimension#Y}.
 * Furthermore, nodes can be fixed using the {@link StressOptions#FIXED} option.
 *
 * `connectedEdges` is a Guava `LinkedListMultimap` keyed by identity (AD-10): `get` lists a key's edges in insertion order,
 * the only order the code observes. The nested Java enum `StressMajorization.Dimension` lives in its own file.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/stress/StressMajorization.java
 */
export class StressMajorization {
  /** The nested Java enum, kept reachable as `StressMajorization.Dimension`. */
  static readonly Dimension = Dimension;

  /** The graph do be laid out, should be connected. */
  private graph!: FGraph;

  /** All pairs shortest path matrix. */
  private apsp!: number[][];
  /** Weights for each pair of nodes. */
  private w!: number[][];

  /** Common desired edge length, can be overridden by individual edges. */
  private desiredEdgeLength: number = 0;
  /** Dimensions to consider during layout. */
  private dim!: Dimension;
  /** Epsilon for terminating the stress minimizing process. */
  private epsilon: number = 0;
  /** Maximum number of iterations (overrides the {@link #epsilon}). */
  private iterationLimit: number = 0;

  private readonly connectedEdges: Multimap<FNode, FEdge> = LinkedListMultimap.create<FNode, FEdge>(
    identity<FNode>(),
    identity<FEdge>(),
  );

  /**
   * Initialize all internal structures that are required for the subsequent iterative procedure..
   *
   * @param fgraph the graph to be laid out.
   */
  initialize(fgraph: FGraph): void {
    if (fgraph.getNodes().length <= 1) {
      return;
    }

    this.graph = fgraph;

    this.dim = this.graph.getProperty(StressOptions.DIMENSION);
    this.iterationLimit = this.graph.getProperty(StressOptions.ITERATION_LIMIT);
    this.epsilon = this.graph.getProperty(StressOptions.EPSILON);
    this.desiredEdgeLength = this.graph.getProperty(StressOptions.DESIRED_EDGE_LENGTH);

    this.connectedEdges.clear();
    for (const edge of this.graph.getEdges()) {
      this.connectedEdges.put(edge.getSource()!, edge);
      this.connectedEdges.put(edge.getTarget()!, edge);
    }

    // all pairs shortest path
    const n = this.graph.getNodes().length;
    this.apsp = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (const source of this.graph.getNodes()) {
      this.dijkstra(source, this.apsp[source.id]!);
    }

    // init weight matrix
    this.w = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        const dij = this.apsp[i]![j]!;
        const wij = 1.0 / (dij * dij);
        this.w[i]![j] = wij;
      }
    }
  }

  /**
   * Execute the stress-minimizing iteration until a termination criterion is reached.
   */
  execute(): void {
    if (this.graph.getNodes().length <= 1) {
      return;
    }

    let count = 0;
    let prevStress = this.computeStress();
    let curStress = Number.POSITIVE_INFINITY;

    do {
      if (count > 0) {
        prevStress = curStress;
      }

      for (const u of this.graph.getNodes()) {
        // note that we do not use 'NO_LAYOUT' here,
        // since that option results in the node already
        // being excluded by the layout engine
        if (u.getProperty(StressOptions.FIXED)) {
          continue;
        }

        const newPos = this.computeNewPosition(u);
        u.getPosition().reset().add(newPos);
      }

      curStress = this.computeStress();
      // `count++`: done() returns true at the latest when count equals iterationLimit <= Integer.MAX_VALUE, so the
      // increment past Integer.MAX_VALUE never reaches a later read (no Int32 wrap needed).
    } while (!this.done(count++, prevStress, curStress));
  }

  /**
   * Performs Dijkstra's all pairs shortest path algorithm.
   */
  private dijkstra(source: FNode, dist: number[]): void {
    // the comparator reads the shared `dist`, which is mutated while the nodes are queued (the heap order is observable)
    const nodes = new PriorityQueue<FNode>((n1, n2) => DoubleCompare.compare(dist[n1.id]!, dist[n2.id]!));
    const mark: boolean[] = new Array<boolean>(this.graph.getNodes().length);

    // init
    mark.fill(false);
    dist[source.id] = 0;
    for (const n of this.graph.getNodes()) {
      if (n.id !== source.id) {
        dist[n.id] = JavaInteger.MAX_VALUE;
      }
      nodes.add(n);
    }

    // find shortest paths
    while (!nodes.isEmpty()) {
      const u = nodes.poll()!;
      mark[u.id] = true;

      for (const e of this.connectedEdges.get(u)) {
        const v = this.getOther(e, u);
        if (mark[v.id]) {
          continue;
        }
        const el = this.getDesiredLength(e);
        const d = dist[u.id]! + el;
        if (d < dist[v.id]!) {
          dist[v.id] = d;
          nodes.remove(v);
          nodes.add(v);
        }
      }
    }
  }

  /**
   * The desired length of an edge: its own option when set, else the common one. Split out of `dijkstra` for the
   * complexity limits (StressMajorization.java:166-173).
   */
  private getDesiredLength(e: FEdge): number {
    // get e's desired length
    let el: number;
    if (e.hasProperty(StressOptions.DESIRED_EDGE_LENGTH)) {
      el = e.getProperty(StressOptions.DESIRED_EDGE_LENGTH);
    } else {
      el = this.desiredEdgeLength;
    }
    return el;
  }

  /**
   * Done if either stress improvement is small than {@link StressOptions#EPSILON} or the
   * {@link StressOptions#ITERATION_LIMIT} is reached.
   */
  private done(count: number, prevStress: number, curStress: number): boolean {
    return prevStress === 0 || (prevStress - curStress) / prevStress < this.epsilon || count >= this.iterationLimit;
  }

  /**
   * @return the stress value of the current node positioning.
   */
  private computeStress(): number {
    let stress = 0;
    const nodes = this.graph.getNodes();
    // we know 'nodes' is an arraylist
    for (let i = 0; i < nodes.length; ++i) {
      const u = nodes[i]!;
      for (let j = i + 1; j < nodes.length; ++j) {
        const v = nodes[j]!;
        const eucDist = u.getPosition().distance(v.getPosition());
        const eucDisplacement = eucDist - this.apsp[u.id]![v.id]!;
        stress += this.w[u.id]![v.id]! * eucDisplacement * eucDisplacement;
      }
    }
    return stress;
  }

  /**
   * Computes a new position for the passed node. The procedure is described in
   * <em>Section 2.3 Localized optimization</em> of the paper.
   */
  private computeNewPosition(u: FNode): KVector {
    let weightSum = 0;
    let xDisp = 0;
    let yDisp = 0;

    // we need at least two nodes here, otherwise we would divide by zero below
    // assert graph.getNodes().size() > 1; (StressMajorization.java:213)

    for (const v of this.graph.getNodes()) {
      if (u === v) {
        continue;
      }

      const wij = this.w[u.id]![v.id]!;
      weightSum += wij;

      const eucDist = u.getPosition().distance(v.getPosition());

      if (eucDist > 0 && this.dim !== Dimension.Y) {
        xDisp +=
          wij * (v.getPosition().x + (this.apsp[u.id]![v.id]! * (u.getPosition().x - v.getPosition().x)) / eucDist);
      }

      if (eucDist > 0 && this.dim !== Dimension.X) {
        yDisp +=
          wij * (v.getPosition().y + (this.apsp[u.id]![v.id]! * (u.getPosition().y - v.getPosition().y)) / eucDist);
      }
    }

    return this.newPositionOf(u, xDisp, yDisp, weightSum);
  }

  /**
   * The `switch (dim)` of `computeNewPosition` (StressMajorization.java:245-252), split out for the complexity limits.
   */
  private newPositionOf(u: FNode, xDisp: number, yDisp: number, weightSum: number): KVector {
    switch (this.dim) {
      case Dimension.X:
        return new KVector(xDisp / weightSum, u.getPosition().y);
      case Dimension.Y:
        return new KVector(u.getPosition().x, yDisp / weightSum);
      default:
        return new KVector(xDisp / weightSum, yDisp / weightSum);
    }
  }

  private getOther(edge: FEdge, one: FNode): FNode {
    if (edge.getSource() === one) {
      return edge.getTarget()!;
    } else if (edge.getTarget() === one) {
      return edge.getSource()!;
    } else {
      throw new IllegalArgumentException("Node 'one' must be either source or target of edge 'edge'.");
    }
  }
}
