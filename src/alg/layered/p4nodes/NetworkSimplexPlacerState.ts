// SPDX-License-Identifier: EPL-2.0
import type { NEdge } from '../../common/networksimplex/NEdge.js';
import { NGraph } from '../../common/networksimplex/NGraph.js';
import type { NNode } from '../../common/networksimplex/NNode.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LGraphElement } from '../graph/LGraphElement.js';
import type { Spacings } from '../options/Spacings.js';
import type { EdgeRep } from './NetworkSimplexPlacerEdgeRep.js';
import type { NodeRep } from './NetworkSimplexPlacerNodeRep.js';
import type { Path } from './NetworkSimplexPlacerPath.js';

/**
 * The instance fields of the Java `NetworkSimplexPlacer`, shared by the section files (graph building, straightening,
 * path identification, applying the solution), which are functions over this state with the Java method names.
 *
 * Concurrency contract: one state belongs to one `process` call and is touched sequentially; the facade resets it in
 * `cleanup`.
 *
 * AD-10 (N7): the Java `portMap` (`Maps.newHashMap()`, `:175`) is looked up only, never iterated: a `Map` keyed by
 * identity. `flexibleWhereSpacePermitsEdges` (`Sets.newHashSet()`, `:190`) is iterated once, at `:236`, to set every
 * member's weight to the same constant, so the order cannot be observed: a `Set` in insertion order. `NEdge` and `NNode`
 * do not override `hashCode`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export class NetworkSimplexPlacerState {
  /** The `LGraph` to be handled. */
  lGraph: LGraph | null = null;
  /** The spacings of the graph. */
  spacings: Spacings | null = null;
  /** The internally used network simplex graph. */
  nGraph: NGraph | null = null;

  /** Mapping of the internal representations of nodes, indexed by `LNode.id`. */
  nodeReps: NodeRep[] | null = null;
  /** Mapping of the internal representations of edges, indexed by `LEdge.id`. */
  edgeReps: EdgeRep[] | null = null;
  /** Mapping of network simplex nodes to the graph elements they represent. */
  readonly portMap = new Map<LGraphElement, NNode>();

  /** Node count of `lGraph`; uninitialized until `prepare` has been executed. */
  nodeCount = 0;
  edgeCount = 0;

  // used for edge straightening
  /** Internal book keeping array for the case that `NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES` is used. Indexed by `LNode.id`. */
  nodeState: number[] | null = null;
  twoPaths: Path[] | null = null;
  crossing: boolean[] | null = null;

  // used for a special version of node flexibility
  readonly flexibleWhereSpacePermitsEdges = new Set<NEdge>();
}
