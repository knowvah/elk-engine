// SPDX-License-Identifier: EPL-2.0
// The three `BestCandidateFilter`s keep every candidate whose measure EQUALS the computed best (AreaFilter.java:43,
// ScaleMeasureFilter.java:48, AspectRatioFilter.java:46), so an empty candidate list and NaN measures give an empty result.
import { describe, expect, it } from 'vitest';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { DrawingData } from '../util/DrawingData.js';
import { DrawingDataDescriptor } from '../util/DrawingDataDescriptor.js';
import { AreaFilter } from './AreaFilter.js';
import { AspectRatioFilter } from './AspectRatioFilter.js';
import type { BestCandidateFilter } from './BestCandidateFilter.js';
import { ScaleMeasureFilter } from './ScaleMeasureFilter.js';

const NO_PADDING = new ElkPadding(0);
const data = (width: number, height: number, dar = 1): DrawingData =>
  new DrawingData(dar, width, height, DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT);

const FILTERS: readonly (readonly [string, BestCandidateFilter])[] = [
  ['AreaFilter', new AreaFilter()],
  ['ScaleMeasureFilter', new ScaleMeasureFilter()],
  ['AspectRatioFilter', new AspectRatioFilter()],
];

describe.each(FILTERS)('%s', (_name, filter) => {
  it('returns an empty list for no candidates', () => {
    expect(filter.filterList([], 1, NO_PADDING)).toEqual([]);
  });

  it('keeps all candidates that tie, in order', () => {
    const a = data(10, 20);
    const b = data(10, 20);
    expect(filter.filterList([a, b], 1, NO_PADDING)).toEqual([a, b]);
  });

  it('drops every candidate when the measure is NaN (equality against the computed best never holds)', () => {
    expect(filter.filterList([data(Number.NaN, 5)], 1, NO_PADDING)).toEqual([]);
  });
});

describe('filter order of preference', () => {
  const wide = data(40, 10);
  const square = data(20, 20);

  it('AreaFilter keeps the smallest area', () => {
    const small = data(30, 10);
    expect(new AreaFilter().filterList([wide, square, small], 1, NO_PADDING)).toEqual([small]);
    expect(new AreaFilter().filterList([wide, square], 1, NO_PADDING)).toEqual([wide, square]);
  });

  it('AspectRatioFilter keeps the aspect ratio closest to the desired one', () => {
    expect(new AspectRatioFilter().filterList([wide, square], 1, NO_PADDING)).toEqual([square]);
    expect(new AspectRatioFilter().filterList([wide, square], 4, NO_PADDING)).toEqual([wide]);
  });

  it('ScaleMeasureFilter keeps the largest scale measure (min(dar / w, 1 / h))', () => {
    expect(new ScaleMeasureFilter().filterList([wide, square], 1, NO_PADDING)).toEqual([square]);
  });

  it('padding is added to the drawing size before measuring', () => {
    const thin = data(10, 50);
    const flat = data(50, 10);
    // 50 x 10 and 10 x 50 tie without padding; padding (left+right 40, top+bottom 0) makes the flat one smaller (90 x 10 against 50 x 50).
    expect(new AreaFilter().filterList([thin, flat], 1, new ElkPadding(0, 20, 0, 20))).toEqual([flat]);
  });
});
