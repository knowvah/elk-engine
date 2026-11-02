// SPDX-License-Identifier: EPL-2.0
import { NetworkSimplex } from '../../common/networksimplex/NetworkSimplex.js';
import { NGraph } from '../../common/networksimplex/NGraph.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { round } from '../../../java/lang/JavaMath.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NODE_SIZE_WEIGHT_FLEXIBLE } from './NetworkSimplexPlacerConstants.js';
import { applyPositions } from './NetworkSimplexPlacerApply.js';
import {
  insertFlexibleWhereSpaceAuxiliaryEdges,
  insertInLayerEdgeAuxiliaryEdges,
  insertNorthSouthAuxiliaryEdges,
} from './NetworkSimplexPlacerAuxiliaryEdges.js';
import { isFlexibleNode } from './NetworkSimplexPlacerFlexibleNode.js';
import { buildInitialAuxiliaryGraph } from './NetworkSimplexPlacerGraphBuilding.js';
import { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';
import { postProcessTwoPaths, preferStraightEdges } from './NetworkSimplexPlacerStraightEdges.js';
import type { LNode } from '../graph/LNode.js';

/**
 * Implements the node placement strategy as described by Gansner et al. in the following paper. It is based on the idea
 * to convert the problem into an auxiliary graph which is layered using the network simplex algorithm.
 * <ul>
 *   <li>Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, A technique for drawing directed
 *       graphs. <i>Software Engineering</i> 19(3), pp. 214-230, 1993.</li>
 * </ul>
 *
 * Restrictions: node positions are represented by layers, and layers are integral, so rational positions are resolved
 * as follows. Nodes: the position, height, margin, and spacing of a node are summed and ceiled. Ports: a port's
 * position is altered to the closest integer position.
 *
 * Favor straight edges: the way the auxiliary graph is built allows for symmetric optimal solutions, which may result in
 * edge "stair-cases"; with the `NODE_PLACEMENT_FAVOR_EDGE_STRAIGHTNESS` option set we try to improve this by
 * additionally reducing the number of bends. North/south ports and inverted ports are kept short by extra edges.
 * Flexible ports: setting `NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY` on a node allows to reposition the ports
 * on the node's border or even to increase the node's height; the flexibility is realized by further nodes in the
 * auxiliary graph that represent the top and bottom border of a node.
 *
 * Edge weights: "Regular edge": 4, 8, 32; "Node size edge": flexible weight 1, static weight 10000; "Port spacing
 * edge": 0; "In-layer edge": 4; "North-south edge": 0.1.
 *
 * Structure: the Java class is split into section files along its section comments (`NetworkSimplexPlacer*.ts`):
 * functions over a `NetworkSimplexPlacerState` that holds the Java instance fields, with the Java method names. The
 * nested types are `NetworkSimplexPlacerNodeRep`, `…EdgeRep` and `…Path`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export class NetworkSimplexPlacer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #HIERARCHY_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Additional processor dependencies for graphs with hierarchical ports. Built on first use, as Java builds the static
   * field at class initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum
   * finishes evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1; N4).
   */
  private static get HIERARCHY_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (NetworkSimplexPlacer.#HIERARCHY_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR));
  }

  /** The Java instance fields (`lGraph`, `spacings`, `nGraph`, `nodeReps`, `edgeReps`, `portMap`, ...). */
  private readonly state = new NetworkSimplexPlacerState();

  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      return NetworkSimplexPlacer.HIERARCHY_PROCESSING_ADDITIONS;
    } else {
      return null;
    }
  }

  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    const s = this.state;
    progressMonitor.begin('Network simplex node placement', 1);

    s.lGraph = layeredGraph;
    s.spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);

    // -------------------------------
    // #1 build the auxiliary graph
    // -------------------------------
    this.prepare();

    buildInitialAuxiliaryGraph(s);

    insertNorthSouthAuxiliaryEdges(s);
    insertInLayerEdgeAuxiliaryEdges(s);

    if (s.lGraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)) {
      const pm = progressMonitor.subTask(1)!;
      pm.begin('Straight Edges Pre-Processing', 1);
      preferStraightEdges(s);
      pm.done();
    }

    // make sure the ngraph is connected. Cases where this doesn't have to be the case include
    //  hierarchical nodes with unconnected ports that are (in the case of hierarchical layout)
    //  converted into unconnected dummy nodes
    s.nGraph!.makeConnected();

    this.executeNetworkSimplex(progressMonitor);

    // post process 'two paths' that have been identified during the previous call of #preferStraightEdges()
    if (layeredGraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)) {
      const pm = progressMonitor.subTask(1)!;
      pm.begin('Straight Edges Post-Processing', 1);
      postProcessTwoPaths(s);
      pm.done();
    }

    // --------------------------------
    // #3 apply positions
    // --------------------------------
    applyPositions(s);

    this.cleanup();

    progressMonitor.done();
  }

  /**
   * The `#2 execute the network simplex` block of `process` (Java `:218-258`), split out to meet the complexity limit.
   */
  private executeNetworkSimplex(progressMonitor: IElkProgressMonitor): void {
    const s = this.state;
    const layeredGraph = s.lGraph!;
    // --------------------------------
    // #2 execute the network simplex
    // --------------------------------
    // compared to {@link NetworkSimplexLayerer} a significantly larger iteration limit
    // is selected here because the node placement uses an auxiliary graph with
    // larger node and edge count
    const iterLimit = Int32.mul(layeredGraph.getProperty(LayeredOptions.THOROUGHNESS), s.nGraph!.nodes.length);

    NetworkSimplex.forGraph(s.nGraph!)
      .withIterationLimit(iterLimit)
      .withBalancing(false)
      .execute(progressMonitor.subTask(1)!);

    this.processFlexibleWhereSpace(progressMonitor, iterLimit);
  }

  /**
   * The `if (!flexibleWhereSpacePermitsEdges.isEmpty())` block of `process` (Java `:236-257`), split out to meet the
   * complexity limit.
   *
   * every individual node can be 'flexible where space permits'. thus we cannot check for the property here but must
   * rely on the fact that the affected nodes have been collected before. In fact, the edges that represent the size of
   * the node were collected
   */
  private processFlexibleWhereSpace(progressMonitor: IElkProgressMonitor, iterLimit: number): void {
    const s = this.state;
    if (s.flexibleWhereSpacePermitsEdges.size === 0) {
      return;
    }
    const pm = progressMonitor.subTask(1)!;
    pm.begin('Flexible Where Space Processing', 1);

    insertFlexibleWhereSpaceAuxiliaryEdges(s);
    // now the nodes may resize -> alter the weights
    for (const edge of s.flexibleWhereSpacePermitsEdges) {
      edge.weight = NODE_SIZE_WEIGHT_FLEXIBLE;
    }

    // run network simplex a second time
    NetworkSimplex.forGraph(s.nGraph!).withIterationLimit(iterLimit).withBalancing(false).execute(pm.subTask(1)!);

    pm.done();
  }

  // ------------------------------------------------------------------------------------------------
  //                                         Preparation
  // ------------------------------------------------------------------------------------------------
  private prepare(): void {
    const s = this.state;
    s.nGraph = new NGraph();

    // "integerify" port anchor and port positions
    //   note that margin.top and margin.bottom are not required to be integral
    //   since they do not influence the offset calculation for the edges
    // ... while we're at it, we assign ids to the nodes and edges
    let nodeIdx = 0;
    let edgeIdx = 0;
    for (const l of s.lGraph!) {
      for (const lNode of l) {
        lNode.id = nodeIdx++;
        for (const e of lNode.getOutgoingEdges()) {
          e.id = edgeIdx++;
        }
        NetworkSimplexPlacer.integerifyPorts(lNode);
      }
    }

    s.nodeCount = nodeIdx;
    s.edgeCount = edgeIdx;
    s.nodeReps = new Array(nodeIdx);
    s.edgeReps = new Array(edgeIdx);
    s.flexibleWhereSpacePermitsEdges.clear();
  }

  /** The port loop of `prepare` (Java `:322-342`), split out to meet the complexity limit. */
  private static integerifyPorts(lNode: LNode): void {
    // if a node is flexible, an edge attaches to the port itself within
    //  the auxiliary graph, thus the anchor must be integer
    // otherwise the port position can be altered such that it accounts for the anchor's position as well
    const anchorMustBeInteger = isFlexibleNode(lNode);
    for (const p of lNode.getPorts()) {
      if (anchorMustBeInteger) {
        // anchor
        const y = p.getAnchor().y;
        if (y !== Math.floor(y)) {
          const offset = y - round(y);
          p.getAnchor().y -= offset;
        }
      }

      // port + anchor
      const y = p.getPosition().y + p.getAnchor().y;
      if (y !== Math.floor(y)) {
        const offset = y - round(y);
        p.getPosition().y -= offset;
      }
    }
  }

  private cleanup(): void {
    const s = this.state;
    s.lGraph = null;
    s.nGraph = null;

    s.nodeReps = null;
    s.edgeReps = null;
    s.portMap.clear();

    s.nodeState = null;
    s.crossing = null;
    s.twoPaths = null;
    s.flexibleWhereSpacePermitsEdges.clear();
  }

  /**
   * A node is _flexible_ if its port constraints are not `FIXED_POS` and its height is large enough for the ports on
   * both sides to alter their position (see `NetworkSimplexPlacerFlexibleNode.ts`).
   *
   * @param lNode a node
   * @return whether the node is regarded flexible.
   */
  static isFlexibleNode(lNode: LNode): boolean {
    return isFlexibleNode(lNode);
  }
}
