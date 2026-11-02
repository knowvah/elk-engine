// SPDX-License-Identifier: EPL-2.0
// Structural tests of the order-row loader (L4: no hand-derived numbers).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadOrderRows } from './layered-order-replay-rows.js';

const PORTS = { 'g0/n0': ['g0/n0/p1', 'g0/n0/p0'] };
const EXPECTED = { layers: [], layerless: ['g0/n0'], hidden: [], edges: [], changed: [] };

function row(id: string, expected: object): object {
  return { id, group: 'scenarios', input: { elk: {} }, target: null, options: {}, steps: [], prefix: null, expected };
}

function fileOf(rows: object[]): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'order-rows-')), 'rows.json');
  writeFileSync(file, JSON.stringify({ rows }));
  return file;
}

describe('loadOrderRows', () => {
  it('loads a row with its port order', () => {
    const [loaded] = loadOrderRows(fileOf([row('scenarios/ok', { ...EXPECTED, ports: PORTS })]));
    expect(loaded?.id).toBe('scenarios/ok');
    expect(loaded?.expected.ports).toEqual(PORTS);
  });

  it('rejects a row without ports, naming the row', () => {
    expect(() => loadOrderRows(fileOf([row('scenarios/bare', EXPECTED)]))).toThrow(
      /row scenarios\/bare: expected\.ports/,
    );
  });

  it('rejects ports that are not path lists, naming the row', () => {
    const bad = { ...EXPECTED, ports: { 'g0/n0': [1] } };
    expect(() => loadOrderRows(fileOf([row('scenarios/bad', bad)]))).toThrow(/row scenarios\/bad/);
    expect(() => loadOrderRows(fileOf([row('scenarios/arr', { ...EXPECTED, ports: [] })]))).toThrow(
      /row scenarios\/arr/,
    );
  });

  it('still applies the 7b structural checks', () => {
    expect(() => loadOrderRows(fileOf([{ id: 'x' }]))).toThrow(/row 0 is malformed/);
  });
});
