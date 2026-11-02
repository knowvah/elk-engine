// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../../core/util/Pair.js';
import * as Lists from '../../../../guava/Lists.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { NeighborhoodInformationNeighborComparator as NeighborComparator } from './NeighborhoodInformationNeighborComparator.js';

/**
 * Class holds neighborhood information for a layered graph that is used during bk node placing. Since this information
 * is required multiple times but does not change during processing we precalculate it in this class.
 *
 * `layerIndex` and `nodeIndex` are `null` after `cleanup`, as in Java; `buildFor` assigns them before anything reads
 * them.
 *
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/NeighborhoodInformation.java
 */
export class NeighborhoodInformation {
  /** Number of nodes in the graph. */
  nodeCount = 0;
  /** For a layer `l` the entry at `layerIndex[l.id]` holds the index of layer `l`. */
  layerIndex: number[] | null = null;
  /** For a node `n` the entry at `nodeIndex[n.id]` holds the index of `n` within its layer. */
  nodeIndex: number[] | null = null;
  /**
   * For a node n holds leftNeighbors.get(n.id) holds a list with all left neighbors along with any edge that connects
   * n to its neighbor.
   */
  leftNeighbors: Array<Array<Pair<LNode, LEdge>>> = [];
  /** See javadoc of `leftNeighbors`. */
  rightNeighbors: Array<Array<Pair<LNode, LEdge>>> = [];
  /** A comparator to sort a list of neighbor nodes. */
  neighborComparator: NeighborComparator | null = null;

  /** Use `buildFor` to construct an instance. */
  private constructor() {}

  /** Release allocated resources. */
  cleanup(): void {
    this.layerIndex = null;
    this.nodeIndex = null;
    this.leftNeighbors.length = 0;
    this.rightNeighbors.length = 0;
    this.neighborComparator = null;
  }

  /**
   * Creates and properly initializes the neighborhood information required by the `BKNodePlacer`. This includes:
   * calculating the number of nodes in the graph, assigning a unique id to every layer and node, recording the index
   * of every node in its layer and calculating left and right neighbors for every node.
   *
   * @param graph the underlying graph
   * @return a properly initialized instance
   */
  static buildFor(graph: LGraph): NeighborhoodInformation {
    const ni = new NeighborhoodInformation();

    ni.nodeCount = 0;
    for (const layer of graph) {
      ni.nodeCount += layer.getNodes().length;
    }

    // cache indexes of layers and of nodes
    let lId = 0;
    let lIndex = 0;
    const layerIndex = new Array<number>(graph.getLayers().length).fill(0);
    ni.layerIndex = layerIndex;
    let nId = 0;
    let nIndex = 0;
    const nodeIndex = new Array<number>(ni.nodeCount).fill(0);
    ni.nodeIndex = nodeIndex;
    for (const l of graph.getLayers()) {
      l.id = lId++;
      layerIndex[l.id] = lIndex++;
      nIndex = 0;
      for (const n of l.getNodes()) {
        n.id = nId++;
        nodeIndex[n.id] = nIndex++;
      }
    }

    // we will need a comparator for the next step
    ni.neighborComparator = new NeighborComparator(ni);

    // determine all left and right neighbors of the graph's nodes
    ni.leftNeighbors = Lists.newArrayListWithCapacity(ni.nodeCount);
    NeighborhoodInformation.determineAllLeftNeighbors(ni, graph);
    ni.rightNeighbors = Lists.newArrayListWithCapacity(ni.nodeCount);
    NeighborhoodInformation.determineAllRightNeighbors(ni, graph);

    return ni;
  }

  /**
   * Give all right neighbors (originally known as lower neighbors) of a given node. A lower neighbor is a node in a
   * following layer that has an edge coming from the given node.
   */
  private static determineAllRightNeighbors(ni: NeighborhoodInformation, graph: LGraph): void {
    for (const l of graph) {
      for (const n of l) {
        const result: Array<Pair<LNode, LEdge>> = Lists.newArrayList();
        let maxPriority = 0;

        for (const edge of n.getOutgoingEdges()) {
          if (edge.isSelfLoop() || edge.isInLayerEdge()) {
            continue;
          }
          const edgePrio = edge.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS);
          if (edgePrio > maxPriority) {
            maxPriority = edgePrio;
            result.length = 0;
          }
          if (edgePrio === maxPriority) {
            result.push(Pair.of(edge.getTarget()!.getNode()!, edge));
          }
        }

        const comparator = ni.neighborComparator!;
        result.sort((a, b) => comparator.compare(a, b));

        ni.rightNeighbors[n.id] = result;
      }
    }
  }

  /**
   * Gives all left neighbors (originally known as upper neighbors) of a given node. An upper neighbor is a node in a
   * previous layer that has an edge pointing to the given node.
   */
  private static determineAllLeftNeighbors(ni: NeighborhoodInformation, graph: LGraph): void {
    for (const l of graph) {
      for (const n of l) {
        const result: Array<Pair<LNode, LEdge>> = Lists.newArrayList();
        let maxPriority = 0;

        for (const edge of n.getIncomingEdges()) {
          if (edge.isSelfLoop() || edge.isInLayerEdge()) {
            continue;
          }
          const edgePrio = edge.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS);
          if (edgePrio > maxPriority) {
            maxPriority = edgePrio;
            result.length = 0;
          }
          if (edgePrio === maxPriority) {
            result.push(Pair.of(edge.getSource()!.getNode()!, edge));
          }
        }

        const comparator = ni.neighborComparator!;
        result.sort((a, b) => comparator.compare(a, b));

        ni.leftNeighbors[n.id] = result;
      }
    }
  }
}
