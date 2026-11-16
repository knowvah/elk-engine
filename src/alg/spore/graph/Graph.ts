// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import * as Lists from '../../../guava/Lists.js';
import type { JavaHashSet } from '../../../java/util/JavaHashSet.js';
import type { ICostFunction } from '../../common/ICostFunction.js';
import type { TEdge } from '../../common/TEdge.js';
import type { Tree } from '../../common/Tree.js';
import type { Node } from '../../common/spore/Node.js';
import type { CompactionStrategy } from '../options/CompactionStrategy.js';
import type { TreeConstructionStrategy } from '../options/TreeConstructionStrategy.js';

/**
 * A graph structure for SPOrE.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/graph/Graph.java
 */
export class Graph extends MapPropertyHolder {
  /** All vertices of this graph. */
  vertices: Node[] = Lists.newArrayList<Node>();
  /**
   * All edges of this graph. The Java type is `Set<TEdge>`; every instance is a value-hashed `HashSet`
   * (the triangulation result or the overlap set of `OverlapRemovalLayoutProvider`), so it is a `JavaHashSet`.
   */
  tEdges: JavaHashSet<TEdge> | null = null;
  /** Determines the kind of spanning tree to be generated. */
  readonly treeConstructionStrategy: TreeConstructionStrategy;
  /** Holds the tree structure for the processing order. */
  tree: Tree<Node> | null = null;
  /** Determines the compaction method applied to the spanning tree. */
  readonly compactionStrategy: CompactionStrategy;
  /** Callback function for the cost/weight of an edge. */
  readonly costFunction: ICostFunction;
  /** One of the vertices can be selected to be used as the root for the tree construction. */
  preferredRoot: Node | null = null;
  /** Restricts the translation of nodes to orthogonal directions in a compaction. */
  orthogonalCompaction = false;

  /**
   * Constructor. The callback functions and the strategy for tree construction that are needed in the processing
   * of this graph are set at this point.
   *
   * @param costFun a function returning a cost value for a {@link TEdge}
   * @param treeStrategy strategy for the spanning tree construction (e.g. MINIMUM_SPANNING_TREE)
   * @param compStrategy a strategy for the compaction
   */
  constructor(costFun: ICostFunction, treeStrategy: TreeConstructionStrategy, compStrategy: CompactionStrategy) {
    super();
    this.costFunction = costFun;
    this.treeConstructionStrategy = treeStrategy;
    this.compactionStrategy = compStrategy;
  }
}
