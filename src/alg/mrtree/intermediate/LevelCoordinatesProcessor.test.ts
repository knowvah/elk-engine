// SPDX-License-Identifier: EPL-2.0
// Proof of LevelCoordinatesProcessor (mission 8a, T14): `process` from the recorded CompactionProcessor stop to the recorded
// LevelCoordinatesProcessor stop for every row of the ref that runs it, plus Java-traced hand cases (LevelCoordinatesProcessor.java:38-74).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { Direction } from '../../../core/options/Direction.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { LevelCoordinatesProcessor } from './LevelCoordinatesProcessor.js';

describe('LevelCoordinatesProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the LevelCoordinatesProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('LevelCoordinatesProcessor', () => new LevelCoordinatesProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    const directions = new Set(replay.replayed.map((r) => r.graph.getProperty(MrTreeOptions.DIRECTION).toString()));
    expect(directions.has('LEFT') || directions.has('RIGHT')).toBe(true);
    expect(directions.has('DOWN')).toBe(true);
  });
});

describe('LevelCoordinatesProcessor hand cases', () => {
  const build = (direction: Direction): ReturnType<typeof graphOf> => {
    const built = graphOf(3, []);
    const levels = [0, 1, 1];
    const pos: [number, number][] = [
      [5, 1],
      [2, 20],
      [9, 30],
    ];
    built.nodes.forEach((n, i) => {
      n.setProperty(MrTreeOptions.TREE_LEVEL, levels[i]!);
      n.getPosition().x = pos[i]![0];
      n.getPosition().y = pos[i]![1];
      n.getSize().x = 4;
      n.getSize().y = 6;
    });
    built.g.setProperty(MrTreeOptions.DIRECTION, direction);
    return built;
  };
  const minMax = (nodes: ReturnType<typeof graphOf>['nodes']): number[][] =>
    nodes.map((n) => [n.getProperty(InternalProperties.LEVELMIN), n.getProperty(InternalProperties.LEVELMAX)]);

  it('records the y extent of each level for a vertical direction', () => {
    const { g, nodes } = build(Direction.DOWN);
    runOn(new LevelCoordinatesProcessor(), g);
    expect(minMax(nodes)).toEqual([
      [1, 7],
      [20, 36],
      [20, 36],
    ]);
  });

  it('records the x extent of each level for a horizontal direction', () => {
    const { g, nodes } = build(Direction.RIGHT);
    runOn(new LevelCoordinatesProcessor(), g);
    expect(minMax(nodes)).toEqual([
      [5, 9],
      [2, 13],
      [2, 13],
    ]);
  });
});
