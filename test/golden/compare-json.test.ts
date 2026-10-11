// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { compareLayout, formatDiffs } from './compare-json.js';
import type { Diff } from './compare-json.js';

const BASE_TOL = 2e-6;
const WITHIN_TOL = 5e-7;

function graph(): Record<string, unknown> {
  return {
    id: 'root',
    children: [
      { id: 'n1', x: 10, y: 20, width: 30, height: 40, ports: [{ id: 'p1', x: 0, y: 5 }] },
      { id: 'n2', x: 100, y: 20, width: 30, height: 40, labels: [{ text: 'a' }] },
    ],
    edges: [
      {
        id: 'e1',
        sources: ['p1'],
        targets: ['n2'],
        sections: [
          {
            id: 's1',
            startPoint: { x: 1, y: 2 },
            endPoint: { x: 3, y: 4 },
            bendPoints: [{ x: 2, y: 2 }],
          },
        ],
      },
    ],
  };
}

function nodeAt(g: Record<string, unknown>, i: number): Record<string, unknown> {
  return (g['children'] as Record<string, unknown>[])[i] as Record<string, unknown>;
}

describe('compareLayout', () => {
  it('reports identical graphs as ok with no diffs', () => {
    expect(compareLayout(graph(), graph())).toEqual({ ok: true, diffs: [] });
  });

  it('flags an x difference of 2e-6 as a single value diff', () => {
    const actual = graph();
    nodeAt(actual, 0)['x'] = 10 + BASE_TOL;
    const r = compareLayout(graph(), actual);
    expect(r.ok).toBe(false);
    expect(r.diffs).toEqual([
      { path: 'children[id=n1].x', kind: 'value', expected: 10, actual: 10 + BASE_TOL },
    ]);
  });

  it('accepts an x difference of 5e-7', () => {
    const actual = graph();
    nodeAt(actual, 0)['x'] = 10 + WITHIN_TOL;
    expect(compareLayout(graph(), actual)).toEqual({ ok: true, diffs: [] });
  });

  it('honours a custom tolerance', () => {
    const actual = graph();
    nodeAt(actual, 0)['x'] = 10.5;
    expect(compareLayout(graph(), actual, { tol: 1 }).ok).toBe(true);
    expect(compareLayout(graph(), actual, { tol: 0.1 }).diffs).toHaveLength(1);
  });

  it('ignores child order when ids match', () => {
    const actual = graph();
    (actual['children'] as unknown[]).reverse();
    expect(compareLayout(graph(), actual)).toEqual({ ok: true, diffs: [] });
  });

  it('reports a missing edge section as structure even with infinite tolerance', () => {
    const actual = graph();
    const edge = (actual['edges'] as Record<string, unknown>[])[0] as Record<string, unknown>;
    edge['sections'] = [];
    const r = compareLayout(graph(), actual, { tol: Infinity });
    expect(r.diffs.map((d) => [d.path, d.kind])).toEqual([
      ['edges[id=e1].sections[id=s1]', 'structure'],
    ]);
  });

  it('reports an extra edge section as structure', () => {
    const actual = graph();
    const edge = (actual['edges'] as Record<string, unknown>[])[0] as Record<string, unknown>;
    (edge['sections'] as unknown[]).push({ id: 's2' });
    const r = compareLayout(graph(), actual);
    expect(r.diffs.map((d) => [d.path, d.kind])).toEqual([
      ['edges[id=e1].sections[id=s2]', 'structure'],
    ]);
  });

  it('reports a bend-point count mismatch as structure with infinite tolerance', () => {
    const actual = graph();
    const edge = (actual['edges'] as Record<string, unknown>[])[0] as Record<string, unknown>;
    const section = (edge['sections'] as Record<string, unknown>[])[0] as Record<string, unknown>;
    section['bendPoints'] = [{ x: 2, y: 2 }, { x: 5, y: 5 }];
    const r = compareLayout(graph(), actual, { tol: Infinity });
    expect(r.diffs).toEqual([
      {
        path: 'edges[id=e1].sections[id=s1].bendPoints',
        kind: 'structure',
        expected: 1,
        actual: 2,
      },
    ]);
  });

  it('compares positional arrays element by element', () => {
    const actual = graph();
    const edge = (actual['edges'] as Record<string, unknown>[])[0] as Record<string, unknown>;
    edge['targets'] = ['other'];
    const r = compareLayout(graph(), actual);
    expect(r.diffs).toEqual([
      { path: 'edges[id=e1].targets[0]', kind: 'value', expected: 'n2', actual: 'other' },
    ]);
  });

  it('matches unidentified labels positionally', () => {
    const actual = graph();
    nodeAt(actual, 1)['labels'] = [{ text: 'b' }];
    expect(compareLayout(graph(), actual).diffs).toEqual([
      { path: 'children[id=n2].labels[0].text', kind: 'value', expected: 'a', actual: 'b' },
    ]);
  });

  it('treats NaN as equal to NaN only', () => {
    expect(compareLayout({ x: NaN }, { x: NaN })).toEqual({ ok: true, diffs: [] });
    expect(compareLayout({ x: NaN }, { x: 1 }).diffs).toEqual([
      { path: 'x', kind: 'value', expected: NaN, actual: 1 },
    ]);
    expect(compareLayout({ x: 1 }, { x: NaN }).diffs).toHaveLength(1);
  });

  it('treats equal infinities as equal', () => {
    expect(compareLayout({ x: Infinity }, { x: Infinity }).ok).toBe(true);
    expect(compareLayout({ x: Infinity }, { x: -Infinity }, { tol: Infinity }).ok).toBe(false);
  });

  it('reports type mismatches', () => {
    expect(compareLayout({ x: 1 }, { x: '1' }).diffs).toEqual([
      { path: 'x', kind: 'type', expected: 1, actual: '1' },
    ]);
    expect(compareLayout({ x: null }, { x: {} }).diffs[0]?.kind).toBe('type');
    expect(compareLayout({ x: [] }, { x: {} }).diffs[0]?.kind).toBe('type');
    expect(compareLayout({ x: true }, { x: 'true' }).diffs[0]?.kind).toBe('type');
  });

  it('reports missing and extra keys', () => {
    const r = compareLayout({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(r.diffs).toEqual([
      { path: 'b', kind: 'missing', expected: 2 },
      { path: 'c', kind: 'extra', actual: 3 },
    ]);
  });

  it('compares strings, booleans and null exactly', () => {
    expect(compareLayout({ s: 'a', b: true, n: null }, { s: 'a', b: true, n: null }).ok).toBe(true);
    expect(compareLayout({ s: 'a' }, { s: 'b' }).diffs[0]?.kind).toBe('value');
    expect(compareLayout({ b: true }, { b: false }).diffs[0]?.kind).toBe('value');
  });

  it('compares top-level primitives with an empty path', () => {
    expect(compareLayout(1, 'x').diffs).toEqual([
      { path: '', kind: 'type', expected: 1, actual: 'x' },
    ]);
  });

  it('falls back to positional comparison for id arrays with mixed shape', () => {
    const r = compareLayout({ a: [{ id: 'x' }] }, { a: [{ y: 1 }] });
    expect(r.diffs.map((d) => [d.path, d.kind])).toEqual([
      ['a[0].id', 'missing'],
      ['a[0].y', 'extra'],
    ]);
  });

  it('falls back to positional comparison for duplicate ids', () => {
    const dup = { a: [{ id: 'x', v: 1 }, { id: 'x', v: 2 }] };
    expect(compareLayout(dup, dup).ok).toBe(true);
    expect(compareLayout(dup, { a: [{ id: 'x', v: 1 }, { id: 'x', v: 3 }] }).diffs).toEqual([
      { path: 'a[1].v', kind: 'value', expected: 2, actual: 3 },
    ]);
  });
});

describe('formatDiffs', () => {
  const many: Diff[] = Array.from({ length: 100 }, (_, i) => ({
    path: `p${String(i)}`,
    kind: 'value' as const,
    expected: i,
    actual: i + 1,
  }));

  it('truncates to max lines plus a remainder line', () => {
    const lines = formatDiffs(many, 10).split('\n');
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe('value p0: expected 0, actual 1');
    expect(lines[10]).toBe('… 90 more');
  });

  it('defaults to 20 lines', () => {
    expect(formatDiffs(many).split('\n')).toHaveLength(21);
  });

  it('omits the remainder line when everything fits', () => {
    const out = formatDiffs(many.slice(0, 2), 10);
    expect(out).toBe('value p0: expected 0, actual 1\nvalue p1: expected 1, actual 2');
  });

  it('returns an empty string for no diffs', () => {
    expect(formatDiffs([])).toBe('');
  });

  it('renders missing and extra sides', () => {
    const out = formatDiffs([
      { path: 'a', kind: 'missing', expected: 'x' },
      { path: 'b', kind: 'extra', actual: [1] },
      { path: 'c', kind: 'structure', expected: 1, actual: 2 },
    ]);
    expect(out).toBe(
      'missing a: expected "x"\nextra b: actual [1]\nstructure c: expected 1, actual 2',
    );
  });
});
