// SPDX-License-Identifier: EPL-2.0
/*
 * Port of RandomSeedTest: the SPOrE algorithms shift nodes with identical centers apart reproducibly, controlled by the
 * random seed option (CoreOptions.RANDOM_SEED).
 *
 * @see org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test/RandomSeedTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { SporeCompactionOptions } from './options/SporeCompactionOptions.js';
import { SporeMetaDataProvider } from './options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from './options/SporeOverlapRemovalOptions.js';

/** How often each graph is laid out to check that the result does not change. */
const RUNS = 5;
/** Number of nodes that share one center point. */
const COINCIDENT_NODES = 3;
/** Width and height of each node. */
const NODE_SIZE = 30;

/**
 * Lays out a graph whose nodes all have the same center and returns their resulting positions.
 *
 * @param algorithmId
 *            the SPOrE algorithm to apply.
 * @param seed
 *            the random seed to set, or `null` to leave the option at its default.
 * @return the position of each node, in the order of the graph's children.
 */
function layoutCoincidentNodes(algorithmId: string, seed: number | null): KVector[] {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(CoreOptions.ALGORITHM, algorithmId);
  if (seed !== null) {
    graph.setProperty(CoreOptions.RANDOM_SEED, seed);
  }
  for (let i = 0; i < COINCIDENT_NODES; i++) {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(NODE_SIZE, NODE_SIZE);
  }

  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());

  const positions: KVector[] = [];
  for (const node of graph.getChildren()) {
    positions.push(new KVector(node.getX(), node.getY()));
  }
  return positions;
}

/** `List<KVector>.equals`: the same length and `KVector.equals` at every index. */
function listEquals(a: readonly KVector[], b: readonly KVector[]): boolean {
  return a.length === b.length && a.every((vector, index) => vector.equals(b[index]!));
}

/**
 * Lays out the same graph several times and asserts that every run places the nodes at the same positions.
 */
function assertReproducible(algorithmId: string, seed: number | null): void {
  const first = layoutCoincidentNodes(algorithmId, seed);
  for (let run = 1; run < RUNS; run++) {
    expect(listEquals(first, layoutCoincidentNodes(algorithmId, seed)), `run ${String(run)}`).toBe(true);
  }
}

describe('RandomSeedTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new SporeMetaDataProvider());
  });

  it('overlapRemovalIsReproducibleWithDefaultSeed', () => {
    assertReproducible(SporeOverlapRemovalOptions.ALGORITHM_ID, null);
  });

  it('overlapRemovalIsReproducibleWithExplicitSeed', () => {
    assertReproducible(SporeOverlapRemovalOptions.ALGORITHM_ID, 42);
  });

  it('compactionIsReproducibleWithDefaultSeed', () => {
    assertReproducible(SporeCompactionOptions.ALGORITHM_ID, null);
  });

  it('compactionIsReproducibleWithExplicitSeed', () => {
    assertReproducible(SporeCompactionOptions.ALGORITHM_ID, 42);
  });

  it('defaultSeedIsOne', () => {
    expect(
      listEquals(
        layoutCoincidentNodes(SporeOverlapRemovalOptions.ALGORITHM_ID, 1),
        layoutCoincidentNodes(SporeOverlapRemovalOptions.ALGORITHM_ID, null),
      ),
    ).toBe(true);
  });

  it('seedSelectsTheShift', () => {
    expect(
      listEquals(
        layoutCoincidentNodes(SporeOverlapRemovalOptions.ALGORITHM_ID, 1),
        layoutCoincidentNodes(SporeOverlapRemovalOptions.ALGORITHM_ID, 2),
      ),
    ).toBe(false);
  });
});
