// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { rowsWithStepPair, radialRefPath } from '../../../../../test/helpers/radial-replay-rows.js';
import { RadialUtil } from '../../RadialUtil.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { RadiusExtensionOverlapRemoval } from './RadiusExtensionOverlapRemoval.js';

const STEP = 'RadiusExtensionOverlapRemoval';
const pairs = rowsWithStepPair(STEP);

interface I30Entry {
  readonly id: string;
  readonly treeified: boolean;
}

/** The header `i30` array of the ref: rows whose next-level node set spans several parents (ids without group prefix). */
const i30: readonly I30Entry[] = (JSON.parse(readFileSync(radialRefPath(), 'utf8')) as { i30: I30Entry[] }).i30;
const i30Ids = new Map(i30.map((entry) => [entry.id, entry.treeified]));
const i30Of = (rowId: string): boolean | undefined => i30Ids.get(rowId.slice(rowId.indexOf('/') + 1));

type Mismatch = readonly string[];

function run(row: (typeof pairs)[number][0], pair: (typeof pairs)[number][1], order: 'java' | 'reversed'): Mismatch {
  const graph = buildStopState(row, pair.beforeIndex);
  const processor = new RadiusExtensionOverlapRemoval();
  processor.nextLevelOrder = order;
  processor.process(graph, new BasicProgressMonitor());
  return compareStop(pair.after, dumpRadial(graph, pair.after.step)).map((d) => d.path);
}

describe('RadiusExtensionOverlapRemoval', () => {
  it('has recorded stop pairs around the step, among them I30 rows and the three treeified ones', () => {
    expect(pairs.length).toBeGreaterThan(100);
    expect(pairs.filter(([row]) => i30Of(row.id) !== undefined).length).toBeGreaterThan(50);
    expect([...i30Ids.values()].filter(Boolean)).toHaveLength(3);
  });

  // acceptance: the recorded "before" stop run through the TS processor equals the recorded "after" stop (1e-6)
  it.each(pairs.filter(([row]) => i30Of(row.id) !== true).map(([r, p]) => [r.id, r, p] as const))(
    'turns the recorded before state into the recorded after state: %s',
    (_id, row, pair) => {
      expect(run(row, pair, 'java')).toEqual([]);
    },
  );

  it('logs the graph around the overlap removal and the child movement', () => {
    const [row, pair] = pairs.find(([r]) => i30Of(r.id) === false) as (typeof pairs)[number];
    const graph = buildStopState(row, pair.beforeIndex);
    const monitor = { begin: vi.fn(() => true), logGraph: vi.fn() };
    new RadiusExtensionOverlapRemoval().process(graph, monitor as never);
    expect(monitor.begin).toHaveBeenCalledWith('Remove overlaps', 1);
    const tags = monitor.logGraph.mock.calls.map((call) => (call as unknown[])[1]);
    expect(tags[0]).toBe('Before');
    expect(tags.at(-1)).toBe('After');
    expect(tags).toContain('Before removing overlaps');
    expect(tags).toContain('After removing overlaps');
  });
});

describe('I30 twin (TR3): insertion order against reversed order', () => {
  const classified = pairs.map(([row, pair]) => ({
    id: row.id,
    i30: i30Of(row.id),
    java: run(row, pair, 'java').length === 0,
    reversed: run(row, pair, 'reversed').length === 0,
  }));
  const ids = (rows: typeof classified): string[] => rows.map((r) => r.id);

  it('reaches the site on 152 rows, 85 of them I30 rows (several parents), 3 of those treeified', () => {
    expect(classified).toHaveLength(152);
    expect(classified.filter((r) => r.i30 !== undefined)).toHaveLength(85);
    expect(classified.filter((r) => r.i30 === true)).toHaveLength(3);
  });

  it('insertion order matches the oracle on every row except one treeified row', () => {
    expect(ids(classified.filter((r) => !r.java))).toEqual(['stops/i30/rand-chain-big']);
  });

  it('reversed order differs from the oracle on exactly one row: it is order-observable only on shapes/binary4-sym', () => {
    expect(ids(classified.filter((r) => r.java && !r.reversed))).toEqual(['stops/shapes/binary4-sym']);
    // the 82 non-treeified I30 rows and the 67 rows without several parents are order-unobservable
    expect(classified.filter((r) => r.i30 !== true && r.java && r.reversed)).toHaveLength(149);
  });

  // rand-chain-big: neither insertion nor reversed order reproduces the oracle; a treeified bin (two sets of 12 identity-hashed
  // nodes under -XX:hashCode=2) iterates in tree order. Some order of each set reproduces the stop (needs-ruling, TR3).
  it('rand-chain-big: some order of the treeified sets reproduces the oracle stop', () => {
    const [row, pair] = pairs.find(([r]) => r.id === 'stops/i30/rand-chain-big') as (typeof pairs)[number];
    const original = RadialUtil.getNextLevelNodeSet.bind(RadialUtil);
    let seed = 12345;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let found = false;
    for (let attempt = 0; attempt < 200 && !found; attempt++) {
      const spy = vi.spyOn(RadialUtil, 'getNextLevelNodeSet').mockImplementation((nodes) => {
        const shuffled = [...original(nodes)];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [shuffled[i], shuffled[j]] = [
            shuffled[j] as (typeof shuffled)[number],
            shuffled[i] as (typeof shuffled)[number],
          ];
        }
        return new Set(shuffled);
      });
      const graph = buildStopState(row, pair.beforeIndex);
      new RadiusExtensionOverlapRemoval().process(graph, new BasicProgressMonitor());
      spy.mockRestore();
      found = compareStop(pair.after, dumpRadial(graph, pair.after.step)).length === 0;
    }
    expect(found).toBe(true);
  });
});
