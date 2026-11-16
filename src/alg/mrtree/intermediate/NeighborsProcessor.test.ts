// SPDX-License-Identifier: EPL-2.0
// Proof of NeighborsProcessor (mission 8a, T14): `process` from the recorded NodeOrderer stop to the recorded NeighborsProcessor stop for
// every row of the ref that runs it, plus Java-traced hand cases (NeighborsProcessor.java:42-127).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { NeighborsProcessor } from './NeighborsProcessor.js';

describe('NeighborsProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the NeighborsProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('NeighborsProcessor', () => new NeighborsProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    // no stops row holds a node that is its own right sibling (those rows are full/throws rows: the hand case below covers the branch)
    const sibling = replay.replayed.flatMap((r) =>
      r.graph
        .getNodes()
        .toArray()
        .map((n) => n.getProperty(InternalProperties.RIGHTSIBLING)),
    );
    expect(sibling.some((n) => n !== null)).toBe(true);
  });
});

describe('NeighborsProcessor hand cases', () => {
  it('links the neighbors of a level and the siblings only under one parent', () => {
    // root n0 -> n1, n2; n1 -> n3, n4; n2 -> n5
    const { g, nodes } = graphOf(6, [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [2, 5],
    ]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    runOn(new NeighborsProcessor(), g);
    const [, n1, n2, n3, n4, n5] = nodes;
    expect(n1!.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(n2);
    expect(n2!.getProperty(InternalProperties.LEFTNEIGHBOR)).toBe(n1);
    expect(n1!.getProperty(InternalProperties.RIGHTSIBLING)).toBe(n2);
    expect(n3!.getProperty(InternalProperties.RIGHTSIBLING)).toBe(n4);
    expect(n4!.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(n5);
    expect(n4!.getProperty(InternalProperties.RIGHTSIBLING)).toBeNull();
    expect(n5!.getProperty(InternalProperties.LEFTSIBLING)).toBeNull();
    expect(n5!.getProperty(InternalProperties.LEFTNEIGHBOR)).toBe(n4);
    expect(nodes[0]!.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBeNull();
  });

  it('a graph without a root is left unchanged', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    runOn(new NeighborsProcessor(), g);
    expect(nodes.map((n) => n.getProperty(InternalProperties.RIGHTNEIGHBOR))).toEqual([null, null]);
  });

  it('a node with two parents in one level becomes its own right sibling (oracle behaviour of BFS treeifying)', () => {
    // n0 -> n1, n0 -> n2, n1 -> n3, n2 -> n3: level 2 is [n3, n3]
    const { g, nodes } = graphOf(4, [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    runOn(new NeighborsProcessor(), g);
    expect(nodes[3]!.getProperty(InternalProperties.RIGHTSIBLING)).toBe(nodes[3]);
    expect(nodes[3]!.getProperty(InternalProperties.LEFTSIBLING)).toBe(nodes[3]);
  });
});
