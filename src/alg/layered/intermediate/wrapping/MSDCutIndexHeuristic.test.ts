// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { randomLayeredGraph } from '../../../../../test/helpers/wrapping-graphs.js';
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { LGraph } from '../../graph/LGraph.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import { GraphStats } from './GraphStats.js';
import { MSDCutIndexHeuristic } from './MSDCutIndexHeuristic.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

/** Twin: an independent, single-function transcription of the Java `getCutIndexes`. */
function twinCuts(graph: LGraph, gs: GraphStats): number[] {
  const widths = gs.getWidths();
  const heights = gs.getHeights();
  const widthAtIndex: number[] = [];
  widthAtIndex[0] = widths[0]!;
  let total = widths[0]!;
  for (let i = 1; i < widths.length; i++) {
    widthAtIndex[i] = widthAtIndex[i - 1]! + widths[i]!;
    total += widths[i]!;
  }
  const cutCnt = ARDCutIndexHeuristic.getChunkCount(gs) - 1;
  const freedom = graph.getProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM);
  let bestMaxScale = Number.NEGATIVE_INFINITY;
  let bestCuts: number[] = [];
  for (let m = Math.max(0, cutCnt - freedom); m <= Math.min(gs.longestPath - 1, cutCnt + freedom); m++) {
    const rowSum = total / (m + 1);
    let sumSoFar = 0;
    let index = 1;
    const cuts: number[] = [];
    let width = Number.NEGATIVE_INFINITY;
    let lastCutWidth = 0;
    let height = 0;
    let rowHeightMax = heights[0]!;
    if (m === 0) {
      width = total;
      height = gs.getMaxHeight();
    } else {
      while (index < gs.longestPath) {
        if (widthAtIndex[index - 1]! - sumSoFar >= rowSum) {
          cuts.push(index);
          width = Math.max(width, widthAtIndex[index - 1]! - lastCutWidth);
          height += rowHeightMax;
          sumSoFar += widthAtIndex[index - 1]! - sumSoFar;
          lastCutWidth = widthAtIndex[index - 1]!;
          rowHeightMax = heights[index]!;
        }
        rowHeightMax = Math.max(rowHeightMax, heights[index]!);
        index++;
      }
      height += rowHeightMax;
    }
    const maxScale = Math.min(1 / width, 1 / gs.dar / height);
    if (maxScale > bestMaxScale) {
      bestMaxScale = maxScale;
      bestCuts = cuts;
    }
  }
  return bestCuts;
}

describe('MSDCutIndexHeuristic', () => {
  it.each(SEEDS)('seed %i matches the twin (default freedom)', (seed) => {
    const g = randomLayeredGraph(seed);
    const gs = new GraphStats(g);
    expect(new MSDCutIndexHeuristic().getCutIndexes(g, gs)).toEqual(twinCuts(g, gs));
  });

  it.each(SEEDS)('seed %i matches the twin for freedom 0 and for a freedom covering every layer', (seed) => {
    for (const freedom of [0, randomLayeredGraph(seed).getLayers().length]) {
      const g = randomLayeredGraph(seed);
      g.setProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM, freedom);
      const gs = new GraphStats(g);
      expect(new MSDCutIndexHeuristic().getCutIndexes(g, gs)).toEqual(twinCuts(g, gs));
    }
  });

  it.each(SEEDS)('seed %i matches the twin when the initial guess is the maximum number of cuts', (seed) => {
    const g = randomLayeredGraph(seed);
    // an input that makes the chunk count clamp to the layer count
    g.setProperty(LayeredOptions.ASPECT_RATIO, 1e-6);
    const gs = new GraphStats(g);
    expect(new MSDCutIndexHeuristic().getCutIndexes(g, gs)).toEqual(twinCuts(g, gs));
  });

  it('returns the initial empty list when no candidate m is tried (cutCnt + freedom < 0)', () => {
    const g = randomLayeredGraph(3);
    // a huge aspect ratio drives the chunk count to 0, hence cutCnt to -1; freedom 0 leaves max(0, -1) > -1
    g.setProperty(LayeredOptions.ASPECT_RATIO, Number.MAX_VALUE);
    g.setProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM, 0);
    const gs = new GraphStats(g);
    expect(ARDCutIndexHeuristic.getChunkCount(gs)).toBe(0);
    expect(new MSDCutIndexHeuristic().getCutIndexes(g, gs)).toEqual([]);
  });

  it('an empty layering fails on widths[0] with ArrayIndexOutOfBoundsException', () => {
    const g = new LGraph();
    expect(() => new MSDCutIndexHeuristic().getCutIndexes(g, new GraphStats(g))).toThrow(
      ArrayIndexOutOfBoundsException,
    );
  });

  it('does not guarantee valid cuts', () => {
    expect(new MSDCutIndexHeuristic().guaranteeValid()).toBe(false);
  });
});
