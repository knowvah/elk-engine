// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { randomLayeredGraph } from '../../../../../test/helpers/wrapping-graphs.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import { GraphStats } from './GraphStats.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

/** An input that drives the unclamped chunk count far above any generated layer count. */
const TINY_ASPECT_RATIO = 1e-6;

/** Twin: an independent transcription of Java `getChunkCount` (finite, in-range values only). */
function twinChunkCount(gs: GraphStats): number {
  const rowsd = Math.sqrt(gs.getSumWidth() / (gs.dar * gs.getMaxHeight()));
  let rows = Math.round(rowsd);
  rows = Math.min(rows, gs.longestPath);
  return rows;
}

/** Twin of Java `getCutIndexes`. */
function twinCuts(gs: GraphStats): number[] {
  const rows = twinChunkCount(gs);
  const cuts: number[] = [];
  const step = gs.longestPath / rows;
  for (let idx = 1; idx < rows; ++idx) {
    cuts.push(Math.round(idx * step));
  }
  return cuts;
}

describe('ARDCutIndexHeuristic', () => {
  it.each(SEEDS)('seed %i matches the twin', (seed) => {
    const g = randomLayeredGraph(seed);
    const gs = new GraphStats(g);
    expect(ARDCutIndexHeuristic.getChunkCount(gs)).toBe(twinChunkCount(gs));
    const cuts = new ARDCutIndexHeuristic().getCutIndexes(g, gs);
    expect(cuts).toEqual(twinCuts(gs));
    // Java contract: the number of cuts is one less than the number of rows
    expect(cuts.length).toBe(Math.max(ARDCutIndexHeuristic.getChunkCount(gs) - 1, 0));
  });

  it.each(SEEDS)('seed %i with a tiny aspect ratio cuts between every pair of layers like the twin', (seed) => {
    const g = randomLayeredGraph(seed);
    g.setProperty(LayeredOptions.ASPECT_RATIO, TINY_ASPECT_RATIO);
    const gs = new GraphStats(g);
    const cuts = new ARDCutIndexHeuristic().getCutIndexes(g, gs);
    expect(cuts).toEqual(twinCuts(gs));
    // rows is clamped to longestPath, so there is one cut per layer boundary
    expect(cuts.length).toBe(gs.longestPath - 1);
  });

  it('never asks for more chunks than there are layers', () => {
    for (const seed of SEEDS) {
      const g = randomLayeredGraph(seed);
      // a tiny aspect ratio drives the unclamped row count far above the layer count
      g.setProperty(LayeredOptions.ASPECT_RATIO, TINY_ASPECT_RATIO);
      const gs = new GraphStats(g);
      expect(ARDCutIndexHeuristic.getChunkCount(gs)).toBe(gs.longestPath);
    }
  });

  it('an infinite unclamped row count narrows long-to-int as Java does (saturated long wraps to -1)', () => {
    const g = randomLayeredGraph(1);
    g.setProperty(LayeredOptions.ASPECT_RATIO, 0);
    const gs = new GraphStats(g);
    // sumWidth / (0 * maxHeight) = +Infinity -> (long) saturates -> (int) low 32 bits
    expect(ARDCutIndexHeuristic.getChunkCount(gs)).toBe(-1);
    expect(new ARDCutIndexHeuristic().getCutIndexes(g, gs)).toEqual([]);
  });

  it('does not guarantee valid cuts', () => {
    expect(new ARDCutIndexHeuristic().guaranteeValid()).toBe(false);
  });
});
