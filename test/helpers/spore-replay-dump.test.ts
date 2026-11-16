// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../src/core/math/KVector.js';
import { TEdge } from '../../src/alg/common/TEdge.js';
import { classifyHash, compareTo, HashModel, replayRow } from './spore-replay-dump.js';
import { encodeHex, loadSporeRows, stopsOf, STEP_TRIANGULATION } from './spore-replay-rows.js';

describe('compareTo (the AD-4 comparator of the spore replay)', () => {
  const one = encodeHex(1);

  it('counts identical hex doubles and accepts nothing else for equal text', () => {
    const tally = compareTo({ a: [one, one], id: 'n0', k: 3 }, { a: [one, one], id: 'n0', k: 3 });
    expect([tally.identical, tally.within, tally.differs, tally.first]).toEqual([2, 0, 0, null]);
  });

  it('counts a difference inside 1e-6 as within, one beyond it as a difference with its path', () => {
    const near = compareTo({ p: [one] }, { p: [encodeHex(1 + 1e-7)] });
    expect([near.identical, near.within, near.differs]).toEqual([0, 1, 0]);
    const far = compareTo({ p: [one] }, { p: [encodeHex(1 + 1e-5)] });
    expect([far.within, far.differs]).toEqual([0, 1]);
    expect(far.first).toContain('$.p[0]');
  });

  it('a different order, length, key set, integer or boolean is a difference', () => {
    expect(
      compareTo(
        {
          e: [
            [0, 1],
            [2, 3],
          ],
        },
        {
          e: [
            [2, 3],
            [0, 1],
          ],
        },
      ).differs,
    ).toBe(4);
    expect(compareTo({ e: [1, 2] }, { e: [1] }).differs).toBe(1);
    expect(compareTo({ a: 1 }, { a: 1, b: 2 }).differs).toBe(1);
    expect(compareTo({ a: 1 }, { b: 1 }).differs).toBe(2);
    expect(compareTo({ a: true }, { a: false }).differs).toBe(1);
    expect(compareTo({ a: 1 }, [1]).differs).toBe(1);
  });

  it('detects a swap of two edges in a recorded triangulation stop (the mutation the replay exists to catch)', () => {
    const row = loadSporeRows('stops')[0]!;
    const recorded = stopsOf(row, STEP_TRIANGULATION)[0]!;
    const edges = [...recorded.edges];
    [edges[0], edges[1]] = [edges[1]!, edges[0]!];
    expect(compareTo(recorded, { ...recorded, edges }).differs).toBeGreaterThan(0);
    expect(compareTo(recorded, recorded).first).toBeNull();
  });
});

describe("HashModel and classifyHash (the recorder's list-bin model)", () => {
  const edges = (n: number): TEdge[] =>
    Array.from({ length: n }, (_, i) => new TEdge(new KVector(i, i * 2), new KVector(i + 1, i * 3)));

  it('starts at capacity 16 and doubles once the size exceeds 12', () => {
    const model = new HashModel();
    edges(12).forEach((e) => model.add(e));
    expect(model.cap).toBe(16);
    model.add(edges(13)[12]!);
    expect(model.cap).toBe(32);
  });

  it('clear() keeps the grown capacity and forgets the entries', () => {
    const model = new HashModel();
    edges(13).forEach((e) => model.add(e));
    model.clear();
    expect([model.cap, model.order()]).toEqual([32, []]);
  });

  it('an equal edge (u, v against v, u) is a duplicate', () => {
    const model = new HashModel();
    const [e] = edges(1) as [TEdge];
    model.add(e);
    model.add(new TEdge(e.v, e.u));
    expect(model.order()).toHaveLength(1);
  });

  it('classifyHash of the modelled order reproduces the model capacity and a max bin of at least 1', () => {
    const model = new HashModel();
    edges(20).forEach((e) => model.add(e));
    const info = classifyHash(model.order());
    expect(info.capacity).toBe(model.cap);
    expect(info.maxBin).toBeGreaterThanOrEqual(1);
    expect(info.maxEqualHash).toBeGreaterThanOrEqual(1);
    expect(info.treeified).toBe(false);
  });
});

describe('replayRow', () => {
  it('runs a row once: the second call returns the same result object', () => {
    const row = loadSporeRows('stops')[0]!;
    expect(replayRow(row)).toBe(replayRow(row));
  });
});
