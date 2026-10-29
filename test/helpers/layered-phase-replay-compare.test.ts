// SPDX-License-Identifier: EPL-2.0
// Tests of the phase comparer: equal dumps, and one difference of every kind it reports, at the AD-4 bar.
import { describe, expect, it } from 'vitest';
import { compareExpected, compareFullDump } from './layered-phase-replay-compare.js';
import { dumpLGraph, type LGraphDump } from './layered-framework-replay.js';
import type { ChangedEntry, Expected } from './layered-phase-replay-dump.js';
import { importRow, loadRows } from './layered-phase-replay-rows.js';

const EDGE = { path: 'g0/e0', src: 'g0/n0/p0', tgt: 'g0/n1/p0', reversed: false };
const double = (v: string): ChangedEntry['props'][string] => ({ t: 'double', v });
const BASE: Expected = {
  layers: [['g0/n0'], ['g0/n1']],
  layerless: [],
  hidden: ['g0/n2'],
  edges: [EDGE],
  changed: [
    { path: 'g0/n0', props: { weight: double('1.5'), gone: null } },
    { path: 'g0/e0', props: { reversed: { t: 'bool', v: true } } },
  ],
};

describe('compareExpected', () => {
  it('reports no difference for equal dumps, whatever the order of changed', () => {
    expect(compareExpected(BASE, { ...BASE, changed: [...BASE.changed].reverse() })).toEqual([]);
  });

  it('accepts doubles within 1e-6 and rejects ones beyond', () => {
    const near = {
      ...BASE,
      changed: [{ path: 'g0/n0', props: { weight: double('1.5000000001'), gone: null } }, BASE.changed[1]!],
    };
    expect(compareExpected(near, BASE)).toEqual([]);
    const far = {
      ...BASE,
      changed: [{ path: 'g0/n0', props: { weight: double('1.6'), gone: null } }, BASE.changed[1]!],
    };
    const diffs = compareExpected(far, BASE);
    expect(diffs.map((d) => d.where)).toEqual(['changed g0/n0']);
    expect(diffs[0]?.message).toMatch(/expected 1.5, got 1.6/);
  });

  it('reports a layer, layerless and hidden mismatch by member', () => {
    const actual = { ...BASE, layers: [['g0/n1'], ['g0/n0']], layerless: ['g0/n3'], hidden: [] };
    expect(compareExpected(actual, BASE).map((d) => d.where)).toEqual(['layers', 'layerless', 'hidden']);
  });

  it('reports a flipped reversed flag, a missing edge and an unexpected edge', () => {
    const flipped = { ...BASE, edges: [{ ...EDGE, reversed: true }] };
    expect(compareExpected(flipped, BASE).map((d) => d.where)).toEqual(['edges g0/e0']);
    expect(compareExpected({ ...BASE, edges: [] }, BASE)).toEqual([{ where: 'edges g0/e0', message: 'missing' }]);
    const extra = { ...BASE, edges: [EDGE, { ...EDGE, path: 'new/e0' }] };
    expect(compareExpected(extra, BASE)).toEqual([{ where: 'edges new/e0', message: 'unexpected' }]);
  });

  it('reports missing, unexpected and differing changed entries', () => {
    const [first, second] = BASE.changed;
    const missing = compareExpected({ ...BASE, changed: [first!] }, BASE);
    expect(missing.map((d) => d.where)).toEqual(['changed g0/e0']);
    const extra = compareExpected({ ...BASE, changed: [...BASE.changed, { path: 'g0/n1', props: {} }] }, BASE);
    expect(extra.map((d) => d.where)).toEqual(['changed g0/n1']);
    const differing = compareExpected(
      { ...BASE, changed: [first!, { path: 'g0/e0', props: { reversed: { t: 'bool', v: false } } }] },
      BASE,
    );
    expect(differing.map((d) => d.where)).toEqual(['changed g0/e0']);
    expect(second?.path).toBe('g0/e0');
  });
});

describe('compareFullDump', () => {
  const { graph } = importRow({
    id: 'scenarios/compare',
    group: 'scenarios',
    input: { elk: { id: 'root', children: [{ id: 'a', width: 5, height: 5 }] } },
    target: null,
    options: {},
    steps: [],
    prefix: null,
    expected: BASE,
  });
  const dump = dumpLGraph(graph);

  it('has nothing to compare when the row stores no full dump', () => {
    expect(compareFullDump(BASE, BASE)).toEqual([]);
  });

  it('reports a replay that produced no full dump', () => {
    expect(compareFullDump(BASE, { ...BASE, dump })).toEqual([
      { where: 'dump', message: 'the replay produced no full dump' },
    ]);
  });

  it('delegates to the 7a comparer when both sides have a dump', () => {
    expect(compareFullDump({ ...BASE, dump }, { ...BASE, dump })).toEqual([]);
    const other = { graphs: dump.graphs.map((g) => ({ ...g, path: 'g7' })) };
    expect(compareFullDump({ ...BASE, dump: other }, { ...BASE, dump }).length).toBeGreaterThan(0);
  });
});

describe('compareFullDump element collections', () => {
  const HIDDEN = 'layerConstraints.hiddenNodes';
  const rows = loadRows(new URL('../golden/refs/java/layered-phases.json', import.meta.url).pathname);
  const recorded = (id: string): LGraphDump => rows.find((r) => r.id === id)!.expected.dump as LGraphDump;
  const withHidden = (dump: LGraphDump, value: unknown): Expected => ({
    ...BASE,
    dump: {
      graphs: dump.graphs.map((g, i) => (i === 0 ? { ...g, properties: { ...g.properties, [HIDDEN]: value } } : g)),
    } as LGraphDump,
  });
  const tagged = (items: unknown[]): unknown => ({ t: 'list', c: 'List', items });

  it.each([
    ['scenarios/LayerConstraintPreprocessor/separate', [{ class: 'LNode' }, { class: 'LNode' }]],
    ['scenarios/LayerConstraintPostprocessor/separate', [{ ref: 'g0/n4' }, { ref: 'g0/n5' }]],
  ])('%s: the dumper tagged list equals the recorded bare array', (id, items) => {
    const expected = { ...BASE, dump: recorded(id) };
    expect(compareFullDump(withHidden(recorded(id), tagged(items)), expected)).toEqual([]);
  });

  it('still reports a different element, a different class and a different length', () => {
    const id = 'scenarios/LayerConstraintPostprocessor/separate';
    const expected = { ...BASE, dump: recorded(id) };
    expect(
      compareFullDump(withHidden(recorded(id), tagged([{ ref: 'g0/n4' }, { ref: 'g0/n1' }])), expected),
    ).not.toEqual([]);
    expect(compareFullDump(withHidden(recorded(id), tagged([{ ref: 'g0/n4' }])), expected)).not.toEqual([]);
    const pre = 'scenarios/LayerConstraintPreprocessor/separate';
    const preExpected = { ...BASE, dump: recorded(pre) };
    expect(
      compareFullDump(withHidden(recorded(pre), tagged([{ class: 'LNode' }, { class: 'LPort' }])), preExpected),
    ).not.toEqual([]);
  });
});
