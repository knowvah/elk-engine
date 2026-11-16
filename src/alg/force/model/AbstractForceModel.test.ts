// SPDX-License-Identifier: EPL-2.0
// Branches of AbstractForceModel.java that no recorded row reaches (the two concrete models never return null from calcDisplacement, and the
// recorder never cancels). Each expectation is read off the Java, the line is named in the test.
import { describe, expect, it, vi } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { Random } from '../../../java/util/Random.js';
import { FGraph } from '../graph/FGraph.js';
import { FNode } from '../graph/FNode.js';
import type { FParticle } from '../graph/FParticle.js';
import { ForceOptions } from '../options/ForceOptions.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { AbstractForceModel } from './AbstractForceModel.js';

const ITERATIONS = 2;
const PUSH = 1;

/** A model whose force is a constant push, or no force (null) when `push` is null. */
class ConstantModel extends AbstractForceModel {
  constructor(private readonly push: KVector | null) {
    super();
  }

  protected override moreIterations(count: number): boolean {
    return count < ITERATIONS;
  }

  protected override calcDisplacement(_forcer: FParticle, _forcee: FParticle): KVector | null {
    return this.push === null ? null : this.push.clone();
  }
}

/** Two interactive nodes at (0, 0) and (10, 0): no random draw, no bend point. */
function twoNodes(): FGraph {
  const graph = new FGraph();
  graph.setProperty(ForceOptions.INTERACTIVE, true);
  graph.setProperty(InternalProperties.RANDOM, new Random(1));
  for (const x of [0, 10]) {
    const node = new FNode('n');
    node.id = graph.getNodes().length;
    node.getPosition().x = x;
    graph.getNodes().push(node);
  }
  return graph;
}

const positions = (graph: FGraph): number[][] => graph.getNodes().map((n) => [n.getPosition().x, n.getPosition().y]);

describe('AbstractForceModel.layout', () => {
  it('applies each displacement once per iteration and resets it (AbstractForceModel.java:121-136)', () => {
    const graph = twoNodes();
    new ConstantModel(new KVector(PUSH, 0)).layout(graph, new BasicProgressMonitor());
    expect(positions(graph)).toEqual([
      [ITERATIONS * PUSH, 0],
      [10 + ITERATIONS * PUSH, 0],
    ]);
    expect(graph.getNodes().map((n) => [n.getDisplacement().x, n.getDisplacement().y])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('adds nothing for a null displacement (AbstractForceModel.java:125)', () => {
    const graph = twoNodes();
    new ConstantModel(null).layout(graph, new BasicProgressMonitor());
    expect(positions(graph)).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });

  it('runs no iteration once the monitor is cancelled (AbstractForceModel.java:117)', () => {
    const graph = twoNodes();
    const monitor = new BasicProgressMonitor();
    vi.spyOn(monitor, 'isCanceled').mockReturnValue(true);
    new ConstantModel(new KVector(PUSH, 0)).layout(graph, monitor);
    expect(positions(graph)).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });
});
