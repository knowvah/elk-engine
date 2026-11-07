// SPDX-License-Identifier: EPL-2.0
/*
 * Port of PartitionTest (mission 7f2, T13b): every node is placed to the left of the nodes with higher partition IDs.
 * `@GraphResourceProvider` (`tests/layered/partitioning/**` and the 656 ticket), `@Algorithm(layered)` and
 * `@DefaultConfiguration` go through the layout test runner; the one `@Test`, `testPartitionOrder`, runs once per graph
 * (5 oracle runs, `java-baseline.md`; `withEdgeLabels` holds the label dummy inserter, FX1). The `(non-vacuity)` case lays
 * the same graphs out again and counts graphs whose partitioning is active with at least two partition IDs in use.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/PartitionTest.java
 */
import { describe, expect, it } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  { path: 'tests/layered/partitioning/**/' },
  { path: 'tickets/layered/656_brokenLayoutPartitions.elkt' },
] as const;

/** `testPartitionCoordinates`: the rightmost coordinate of the first partition is left of all of the second's. */
function testPartitionCoordinates(firstPartition: readonly ElkNode[], secondPartition: readonly ElkNode[]): void {
  // The rightmost coordinate of any node in the first partition...
  const rightmost =
    firstPartition.length === 0 ? null : Math.max(...firstPartition.map((n) => n.getX() + n.getWidth()));

  // ...must be to the left of all coordinates of the second partition
  const leftmost = secondPartition.length === 0 ? null : Math.min(...secondPartition.map((n) => n.getX()));

  if (rightmost !== null && leftmost !== null) {
    expect(rightmost < leftmost).toBe(true);
  }
}

/** `testPartitionOrderInGraph` */
function testPartitionOrderInGraph(graph: ElkNode): void {
  // If partitioning is not even active, don't bother
  if (!graph.getProperty(LayeredOptions.PARTITIONING_ACTIVATE)) {
    return;
  }

  // Collect nodes which have a partition set (a `HashMultimap<Integer, ElkNode>`: only min/max per key are read)
  const partitionToNodesMap = new Map<number, ElkNode[]>();

  // Go through all layerless nodes and collect all partition IDs in use
  for (const node of graph.getChildren()) {
    if (node.hasProperty(LayeredOptions.PARTITIONING_PARTITION)) {
      const partition = node.getProperty(LayeredOptions.PARTITIONING_PARTITION);
      const nodes = partitionToNodesMap.get(partition);
      if (nodes === undefined) {
        partitionToNodesMap.set(partition, [node]);
      } else {
        nodes.push(node);
      }
    }
  }

  // If no nodes have partition IDs assigned to them, don't bother
  if (partitionToNodesMap.size === 0) {
    return;
  }

  // Collect a sorted list of partition IDs
  const sortedPartitionIDs = [...partitionToNodesMap.keys()].sort((a, b) => a - b);

  // For each pair of consecutive partition IDs (a, b), connect all nodes from partition a to partition b
  let firstId = sortedPartitionIDs[0];
  for (const secondId of sortedPartitionIDs.slice(1)) {
    testPartitionCoordinates(partitionToNodesMap.get(firstId)!, partitionToNodesMap.get(secondId)!);
    firstId = secondId;
  }
}

/** The graphs the Java's queue visits: the root, and (the filter reads the root `node`, not the child) its descendants. */
function visitedGraphs(node: ElkNode): ElkNode[] {
  const visited: ElkNode[] = [];
  const graphQueue: ElkNode[] = [node];

  while (graphQueue.length > 0) {
    const graph = graphQueue.shift()!;
    visited.push(graph);

    // Look for child nodes that also contain graphs
    for (const child of graph.getChildren()) {
      if (node.isHierarchical()) {
        graphQueue.push(child);
      }
    }
  }
  return visited;
}

const SUITE = { algorithm: LayeredOptions.ALGORITHM_ID, defaultConfiguration: true, graphs: GRAPHS } as const;

defineLayoutTest({
  ...SUITE,
  name: 'PartitionTest',
  afterLayout: {
    /** Each node needs to be placed to the left of nodes with higher partition IDs. */
    testPartitionOrder: (node: ElkNode): void => {
      for (const graph of visitedGraphs(node)) {
        testPartitionOrderInGraph(graph);
      }
    },
  },
});

/** Graphs whose partitioning is active with at least two partition IDs in use: the ones that compare coordinates. */
function comparedGraphCount(root: ElkNode): number {
  return visitedGraphs(root).filter((graph) => {
    const ids = new Set<number>();
    for (const child of graph.getChildren()) {
      if (child.hasProperty(LayeredOptions.PARTITIONING_PARTITION)) {
        ids.add(child.getProperty(LayeredOptions.PARTITIONING_PARTITION));
      }
    }
    return graph.getProperty(LayeredOptions.PARTITIONING_ACTIVATE) && ids.size >= 2;
  }).length;
}

let observedGraphs = 0;
let observedCompared = 0;
defineLayoutTest({
  ...SUITE,
  name: 'PartitionTest (non-vacuity graphs)',
  afterLayout: {
    countPartitions: (root: ElkNode): void => {
      observedGraphs += 1;
      observedCompared += comparedGraphCount(root);
    },
  },
});

describe('PartitionTest (non-vacuity)', () => {
  it('(non-vacuity)', () => {
    expect(observedGraphs).toBe(5);
    // the models have partitions in use: the ported check compares at least one pair of consecutive partitions
    expect(observedCompared).toBeGreaterThan(0);
  });
});
