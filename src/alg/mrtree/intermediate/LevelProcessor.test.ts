// SPDX-License-Identifier: EPL-2.0
// Proof of LevelProcessor (mission 8a, T14): `process` from the recorded RootProcessor/FanProcessor state to the recorded LevelProcessor stop
// for every row of the ref that runs it, plus Java-traced hand cases (LevelProcessor.java:41-78). `gloLevelMap` is lookup-only (TR3).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { LevelProcessor } from './LevelProcessor.js';

describe('LevelProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the LevelProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('LevelProcessor', () => new LevelProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    const maxLevel = Math.max(
      ...replay.replayed.flatMap((r) =>
        r.graph
          .getNodes()
          .toArray()
          .map((n) => n.getProperty(MrTreeOptions.TREE_LEVEL)),
      ),
    );
    expect(maxLevel).toBeGreaterThanOrEqual(3);
  });
});

describe('LevelProcessor hand cases', () => {
  it('numbers the levels from the roots down and gives a node outside the root subtree level 0', () => {
    // n0 -> n1 -> n2, n0 -> n3; n4 is not reachable from the root
    const { g, nodes } = graphOf(5, [
      [0, 1],
      [1, 2],
      [0, 3],
    ]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    runOn(new LevelProcessor(), g);
    expect(nodes.map((n) => n.getProperty(MrTreeOptions.TREE_LEVEL))).toEqual([0, 1, 2, 1, 0]);
  });

  it('a graph without a root leaves every node at level 0 (the root list is empty)', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    runOn(new LevelProcessor(), g);
    expect(nodes.map((n) => n.getProperty(MrTreeOptions.TREE_LEVEL))).toEqual([0, 0]);
  });
});
