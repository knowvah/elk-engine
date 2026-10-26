// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { BowyerWatsonTriangulation } from './BowyerWatsonTriangulation.js';

const SQUARE_WITH_CENTER = [
  new KVector(0, 0),
  new KVector(100, 0),
  new KVector(100, 100),
  new KVector(0, 100),
  new KVector(50, 40),
];
const EDGES_OF_SQUARE_WITH_CENTER = 8;

const pairs = (vs: readonly KVector[]): string[] =>
  [...BowyerWatsonTriangulation.triangulate(vs, null)].map((e) => `${e.u.x},${e.u.y}-${e.v.x},${e.v.y}`);

describe('BowyerWatsonTriangulation.triangulate', () => {
  it('connects a point inside a square to its four corners and the corners to each other', () => {
    const edges = [...BowyerWatsonTriangulation.triangulate(SQUARE_WITH_CENTER)];
    expect(edges.length).toBe(EDGES_OF_SQUARE_WITH_CENTER);
    const touchingCenter = edges.filter((e) => e.u === SQUARE_WITH_CENTER[4] || e.v === SQUARE_WITH_CENTER[4]);
    expect(touchingCenter.length).toBe(4);
  });

  it('yields no edges for a single point', () => {
    expect(pairs([new KVector(1, 2)])).toEqual([]);
  });

  it('gives identical results with debug output enabled and disabled', () => {
    const enabled = [...BowyerWatsonTriangulation.triangulate(SQUARE_WITH_CENTER, 'bowyer-watson-test-never-written')];
    const disabled = [...BowyerWatsonTriangulation.triangulate(SQUARE_WITH_CENTER, null)];
    expect(enabled.map((e) => [e.u, e.v])).toEqual(disabled.map((e) => [e.u, e.v]));
  });
});
