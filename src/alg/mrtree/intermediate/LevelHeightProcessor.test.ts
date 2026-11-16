// SPDX-License-Identifier: EPL-2.0
// Proof of LevelHeightProcessor (mission 8a, T14): `process` from the recorded NeighborsProcessor stop to the recorded LevelHeightProcessor stop
// for every row of the ref that runs it (vertical and horizontal directions), plus Java-traced hand cases (LevelHeightProcessor.java:42-132).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { Direction } from '../../../core/options/Direction.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { LevelHeightProcessor } from './LevelHeightProcessor.js';

describe('LevelHeightProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the LevelHeightProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('LevelHeightProcessor', () => new LevelHeightProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    const directions = new Set(replay.replayed.map((r) => r.graph.getProperty(MrTreeOptions.DIRECTION).toString()));
    expect(directions.has('LEFT') || directions.has('RIGHT')).toBe(true);
    expect(directions.has('DOWN')).toBe(true);
  });
});

describe('LevelHeightProcessor hand cases', () => {
  const build = (direction: Direction): ReturnType<typeof graphOf> => {
    // root n0 (size 10x1) -> n1 (3x8), n2 (4x2); n1 -> n3 (5x5)
    const built = graphOf(4, [
      [0, 1],
      [0, 2],
      [1, 3],
    ]);
    const sizes: [number, number][] = [
      [10, 1],
      [3, 8],
      [4, 2],
      [5, 5],
    ];
    built.nodes.forEach((n, i) => {
      n.getSize().x = sizes[i]![0];
      n.getSize().y = sizes[i]![1];
    });
    built.nodes[0]!.setProperty(InternalProperties.ROOT, true);
    built.g.setProperty(MrTreeOptions.DIRECTION, direction);
    return built;
  };

  it('uses the tallest height of each level for a vertical direction', () => {
    const { g, nodes } = build(Direction.DOWN);
    runOn(new LevelHeightProcessor(), g);
    expect(nodes.map((n) => n.getProperty(InternalProperties.LEVELHEIGHT))).toEqual([1, 8, 8, 5]);
  });

  it('uses the widest width of each level for a horizontal direction', () => {
    const { g, nodes } = build(Direction.LEFT);
    runOn(new LevelHeightProcessor(), g);
    expect(nodes.map((n) => n.getProperty(InternalProperties.LEVELHEIGHT))).toEqual([10, 4, 4, 5]);
  });

  it('a graph without a root is left unchanged', () => {
    const { g, nodes } = graphOf(1, []);
    runOn(new LevelHeightProcessor(), g);
    expect(nodes[0]!.getProperty(InternalProperties.LEVELHEIGHT)).toBe(0);
  });
});
