// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { randomLayeredGraph } from '../../../../../test/helpers/wrapping-graphs.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { GraphStats } from './GraphStats.js';
import { ManualCutIndexCalculator } from './ICutIndexCalculator.js';

describe('ManualCutIndexCalculator', () => {
  it('returns the very list stored under WRAPPING_CUTTING_CUTS', () => {
    const g = randomLayeredGraph(1);
    const cuts = [g.getLayers().length - 1];
    g.setProperty(LayeredOptions.WRAPPING_CUTTING_CUTS, cuts);
    expect(new ManualCutIndexCalculator().getCutIndexes(g, new GraphStats(g))).toBe(cuts);
  });

  it('returns an empty list when the option is unset', () => {
    const g = randomLayeredGraph(2);
    expect(new ManualCutIndexCalculator().getCutIndexes(g, new GraphStats(g))).toEqual([]);
  });

  it('does not guarantee valid cuts', () => {
    expect(new ManualCutIndexCalculator().guaranteeValid()).toBe(false);
  });
});
