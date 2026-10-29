// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Reverses edges that connect higher-index to lower-index partitions. If all nodes have a partition set, the result is
 * a graph that can only contain cycles among nodes in the same partition, and no edge reversed by this processor can be
 * part of a cycle. Thus, the cycle breaker should not reverse any such edge again, resulting in an invalid
 * partitioning.
 *
 * If there are nodes that do not have a partition configured, that's another story. Since there can be arbitrarily
 * many such nodes connected in arbitrary ways, any edge we reverse here could be part of a cycle and thus be restored
 * again during cycle breaking. We try to avoid this by imposing a high direction priority on them, but we cannot
 * guarantee success.
 *
 * Precondition: an unlayered graph. Postcondition: edges that contradict layout partitions are reversed. Slots:
 * before phase 1. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/PartitionPreprocessor.java
 */
export class PartitionPreprocessor implements ILayoutProcessor<LGraph> {
  /** The priority to set on added constraint edges (arbitrary, large value). */
  private static readonly PARTITION_CONSTRAINT_EDGE_PRIORITY = 1_000;

  /** @see PartitionPreprocessor.java:68 */
  process(lGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Partition preprocessing', 1);

    // Find all edges that must be reversed, and then reverse them (this needs to be a two-step process to avoid
    // ConcurrentModificationExceptions)
    const partitionedNodes: LNode[] = lGraph
      .getLayerlessNodes()
      .filter((lNode) => lNode.hasProperty(LayeredOptions.PARTITIONING_PARTITION));
    const edgesToBeReversed: LEdge[] = lGraph
      .getLayerlessNodes()
      .filter((lNode) => lNode.hasProperty(LayeredOptions.PARTITIONING_PARTITION))
      .flatMap((lNode) => [...lNode.getOutgoingEdges()])
      .filter((lEdge) => this.mustBeReversed(lEdge, partitionedNodes));

    edgesToBeReversed.forEach((lEdge) => {
      this.reverse(lEdge, lGraph);
    });

    monitor.done();
  }

  /** @see PartitionPreprocessor.java:89 */
  private mustBeReversed(lEdge: LEdge, partitionedNodes: readonly LNode[]): boolean {
    const sourceNode = lEdge.getSource()!.getNode()!;
    const targetNode = lEdge.getTarget()!.getNode()!;

    if (targetNode.hasProperty(LayeredOptions.PARTITIONING_PARTITION)) {
      // This is the easy mode, the partitions are connected directly.
      const sourcePartition = sourceNode.getProperty(LayeredOptions.PARTITIONING_PARTITION);
      const targetPartition = targetNode.getProperty(LayeredOptions.PARTITIONING_PARTITION);

      // We need to reverse an edge if sourcePartition > targetPartition
      return sourcePartition > targetPartition;
    }
    // You need to check further in the graph to see if the is a connected partitioned node.
    // The node  order matters here, but I guess it is correct.
    // Traverse the graph breath first and check if there are partitioned nodes.
    // While doing so save the path to the partitioned node and reverse all edges leading to it if the target
    // partition is lower than the source partition.
    const sourcePartition = sourceNode.getProperty(LayeredOptions.PARTITIONING_PARTITION);
    // Remove all partitioned nodes with a higher partition ID than the source partition.
    const partitionedNodesWithLowerPartition = partitionedNodes.filter(
      (lNode) => lNode.getProperty(LayeredOptions.PARTITIONING_PARTITION) < sourcePartition,
    );

    return this.reachesLowerPartition(sourceNode, partitionedNodesWithLowerPartition);
  }

  /**
   * The breadth-first search of `mustBeReversed` (`:113`-`:137`), split off to stay within the complexity limits.
   *
   * @returns whether a partitioned node with a lower partition ID can be reached from the source node
   */
  private reachesLowerPartition(sourceNode: LNode, partitionedNodesWithLowerPartition: readonly LNode[]): boolean {
    // Find the paths between the source node and all partitioned nodes with a lower partition ID.
    // The Java LinkedList queue is a queue only (add, poll); the array is read from `head`. `visited` is an
    // identity-hashed HashSet used only for membership (AD-10).
    const queue: LNode[] = [];
    let head = 0;
    const visited = new Set<LNode>();
    queue.push(sourceNode);
    visited.add(sourceNode);
    while (head < queue.length) {
      const currentNode = queue[head++]!;
      if (partitionedNodesWithLowerPartition.includes(currentNode)) {
        // We found a partitioned node with a lower partition ID, so we need to reverse the edge
        // connecting it to the source node.
        // Currently, we only reverse the outgoing edge from a partitioned node that at some points leads
        // to a partitioned node with a lower partition ID and not the full path.
        return true;
      }
      // Doing bfs to find all partitioned nodes with a lower partition ID if they can be reached.
      for (const outgoingEdge of currentNode.getOutgoingEdges()) {
        const nextNode = outgoingEdge.getTarget()!.getNode()!;
        if (!visited.has(nextNode)) {
          visited.add(nextNode);
          queue.push(nextNode);
        }
      }
    }
    // No node with a lower partition ID was found, so we do not need to reverse any edges.
    return false;
  }

  /** @see PartitionPreprocessor.java:141 */
  private reverse(lEdge: LEdge, lGraph: LGraph): void {
    lEdge.reverse(lGraph, true);

    // If the user has set a priority, add that to our base priority to allow them to fix issues where an edge is
    // still being reversed
    let priority = PartitionPreprocessor.PARTITION_CONSTRAINT_EDGE_PRIORITY;

    if (lEdge.hasProperty(LayeredOptions.PRIORITY_DIRECTION)) {
      priority += lEdge.getProperty(LayeredOptions.PRIORITY_DIRECTION);
    }

    lEdge.setProperty(LayeredOptions.PRIORITY_DIRECTION, priority);
  }
}
