// SPDX-License-Identifier: EPL-2.0
// Proof of DirectionProcessor (mission 8a, T14): `process` from the recorded NodePlacer stop to the recorded DirectionProcessor stop for every
// row of the ref that runs it (each of UP, DOWN, LEFT and RIGHT), plus Java-traced hand cases (DirectionProcessor.java:31-72).
import { describe, expect, it } from 'vitest';
import { dumpTGraph } from '../../../../test/helpers/mrtree-replay-dump.js';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { Direction } from '../../../core/options/Direction.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { DirectionProcessor } from './DirectionProcessor.js';

describe('DirectionProcessor.process against the recorded stops (acceptance)', () => {
  it(
    'equals the DirectionProcessor stop of every transition; state changes for UP, LEFT and RIGHT only',
    { timeout: 60_000 },
    () => {
      const replay = replayStep('DirectionProcessor', () => new DirectionProcessor());
      expect(replay.total).toBe(88);
      expect(replay.refused).toBe(0);
      const counts = new Map<string, { n: number; changed: number }>();
      for (const r of replay.replayed) {
        const d = r.graph.getProperty(MrTreeOptions.DIRECTION).toString();
        const entry = counts.get(d) ?? { n: 0, changed: 0 };
        entry.n++;
        if (JSON.stringify(dumpTGraph(r.graph)) !== r.beforeText) {
          entry.changed++;
        }
        counts.set(d, entry);
      }
      for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
        expect(counts.get(d)?.n, d).toBeGreaterThan(0);
        // 'changed' compares the dump before and after the replayed step
        expect(counts.get(d)!.changed > 0, d).toBe(d !== 'DOWN');
      }
    },
  );
});

describe('DirectionProcessor hand cases', () => {
  const coordsOf = (direction: Direction): number[][] => {
    const { g, nodes } = graphOf(2, []);
    g.setProperty(MrTreeOptions.DIRECTION, direction);
    nodes[0]!.setProperty(InternalProperties.XCOOR, 3);
    nodes[0]!.setProperty(InternalProperties.YCOOR, 7);
    nodes[1]!.setProperty(InternalProperties.XCOOR, -2);
    nodes[1]!.setProperty(InternalProperties.YCOOR, 0);
    runOn(new DirectionProcessor(), g);
    return nodes.map((n) => [n.getProperty(InternalProperties.XCOOR), n.getProperty(InternalProperties.YCOOR)]);
  };

  it('DOWN leaves the coordinates alone', () => {
    expect(coordsOf(Direction.DOWN)).toEqual([
      [3, 7],
      [-2, 0],
    ]);
  });

  it('UNDEFINED passes the loop but no case matches: the values stay', () => {
    expect(coordsOf(Direction.UNDEFINED)).toEqual([
      [3, 7],
      [-2, 0],
    ]);
  });

  it('UP negates y, with +0 (not -0) for a zero y (int arithmetic)', () => {
    const result = coordsOf(Direction.UP);
    expect(result).toEqual([
      [3, -7],
      [-2, 0],
    ]);
    expect(Object.is(result[1]![1], 0)).toBe(true);
  });

  it('RIGHT swaps x and y', () => {
    expect(coordsOf(Direction.RIGHT)).toEqual([
      [7, 3],
      [0, -2],
    ]);
  });

  it('LEFT sets x = -y and y = x, with +0 for a zero y', () => {
    const result = coordsOf(Direction.LEFT);
    expect(result).toEqual([
      [-7, 3],
      [0, -2],
    ]);
    expect(Object.is(result[1]![0], 0)).toBe(true);
  });
});
