// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { Random } from '../../../java/util/Random.js';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';
import { NetworkSimplex } from './NetworkSimplex.js';

/**
 * Port of the JUnit test.
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplexTest.java
 */

const GRAPH_COUNT = 5;
const REPETITIONS = 5;
const NODE_COUNT = 4000;
const EDGE_COUNT = 8000;
const MAX_DELTA = 50;
const MAX_WEIGHT = 50;
/** Random with a fixed seed for determinism. */
const SEED = 1;

function generateRandomGraph(random: Random): NGraph {
  const graph = new NGraph();

  const n = NODE_COUNT;
  const e = EDGE_COUNT;

  // create nodes
  for (let i = 0; i < n; ++i) {
    NNode.of().id(i).create(graph);
  }

  // create edges
  for (let i = 0; i < e; ++i) {
    const src = random.nextInt(n);
    let tgt = random.nextInt(n);
    // no self loops
    while (src === tgt) {
      tgt = random.nextInt(n);
    }

    NEdge.of()
      .delta(random.nextInt(MAX_DELTA))
      .weight(random.nextDouble() * MAX_WEIGHT)
      .source(graph.nodes[src] as NNode)
      .target(graph.nodes[tgt] as NNode)
      .create();
  }

  // assert connectedness
  for (let i = 0; i < n - 1; ++i) {
    NEdge.of()
      .delta(random.nextInt(MAX_DELTA))
      .weight(random.nextDouble() * MAX_WEIGHT)
      .source(graph.nodes[i] as NNode)
      .target(graph.nodes[i + 1] as NNode)
      .create();
  }

  // assert acyclic
  for (const node of graph.nodes) {
    for (const edge of [...node.getOutgoingEdges()]) {
      if ((edge.source as NNode).id > (edge.target as NNode).id) {
        edge.reverse();
      }
    }
  }

  return graph;
}

describe('NetworkSimplexTest', () => {
  it('testDeltas', () => {
    const random = new Random(SEED);
    for (let j = 0; j < REPETITIONS; ++j) {
      for (let i = 0; i < GRAPH_COUNT; ++i) {
        const graph = generateRandomGraph(random);

        expect(graph.isAcyclic()).toBe(true);

        NetworkSimplex.forGraph(graph).execute(new BasicProgressMonitor());

        for (const node of graph.nodes) {
          for (const e of node.getOutgoingEdges()) {
            // Valid delta
            expect((e.getTarget() as NNode).layer - (e.getSource() as NNode).layer).toBeGreaterThanOrEqual(e.delta);
          }
        }
      }
    }
  });
});
