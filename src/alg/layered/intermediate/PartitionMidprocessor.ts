// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Add constraint edges between partitions that force layering algorithms to adhere to the partitions.
 *
 * In partitioned graphs, nodes may have an assigned partition. For every such node it must hold that every other node
 * with a smaller partition is placed left to it. This is accomplished by adding partition constraint edges. For each
 * node, we add an edge to every node in the next greater partition. During layering, the constraint edges assure the
 * aforementioned condition. The constraint edges are removed later by the `PartitionPostprocessor`.
 *
 * Precondition: an unlayered, acyclic graph. Postcondition: unlayered graph with partition constraint edges. Slots:
 * before phase 2. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/PartitionMidprocessor.java
 */
export class PartitionMidprocessor implements ILayoutProcessor<LGraph> {
  /**
   * @see PartitionMidprocessor.java:62
   *
   * Java collects the partitions in a `HashMultimap` whose value sets hash `LNode` by identity (JVM order is not
   * reproducible); AD-10 maps it to insertion order: one `Set` per partition ID in layerless-node order.
   */
  process(lGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Partition midprocessing', 1);

    // Collect nodes which have a partition set
    const partitionToNodesMap = new Map<number, Set<LNode>>();

    // Go through all layerless nodes and collect all partition IDs in use
    lGraph
      .getLayerlessNodes()
      .filter((node) => node.hasProperty(LayeredOptions.PARTITIONING_PARTITION))
      .forEach((node) => {
        const partition = node.getProperty(LayeredOptions.PARTITIONING_PARTITION);
        let nodes = partitionToNodesMap.get(partition);
        if (nodes === undefined) {
          nodes = new Set<LNode>();
          partitionToNodesMap.set(partition, nodes);
        }
        nodes.add(node);
      });

    if (partitionToNodesMap.size === 0) {
      // This shouldn't happen, but if it does, there's nothing to do
      return;
    }

    // Collect a sorted list of partition IDs
    const sortedPartitionIDs = [...partitionToNodesMap.keys()].sort((a, b) => a - b);

    // For each pair of consecutive partition IDs (a, b), connect all nodes from partition a to partition b.
    let firstId = sortedPartitionIDs[0]!;
    for (const secondId of sortedPartitionIDs.slice(1)) {
      this.connectNodes(partitionToNodesMap.get(firstId)!, partitionToNodesMap.get(secondId)!);
      firstId = secondId;
    }

    monitor.done();
  }

  /**
   * Connects all nodes from the first collection to all nodes from the second collection.
   *
   * @see PartitionMidprocessor.java:100
   */
  private connectNodes(firstPartition: Iterable<LNode>, secondPartition: Iterable<LNode>): void {
    for (const node of firstPartition) {
      const sourcePort = new LPort();
      sourcePort.setNode(node);
      sourcePort.setSide(PortSide.EAST);
      sourcePort.setProperty(InternalProperties.PARTITION_DUMMY, true);

      for (const otherNode of secondPartition) {
        const targetPort = new LPort();
        targetPort.setNode(otherNode);
        targetPort.setSide(PortSide.WEST);
        targetPort.setProperty(InternalProperties.PARTITION_DUMMY, true);

        const edge = new LEdge();
        edge.setProperty(InternalProperties.PARTITION_DUMMY, true);
        edge.setSource(sourcePort);
        edge.setTarget(targetPort);
      }
    }
  }
}
