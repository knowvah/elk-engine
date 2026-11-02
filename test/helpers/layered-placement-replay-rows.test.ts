// SPDX-License-Identifier: EPL-2.0
// Structural tests of the placement-row loader (L4: no hand-derived numbers).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEOMETRY_KEY, loadPlacementRows } from './layered-placement-replay-rows.js';

const ZERO = '0000000000000000';
const GEOMETRY = {
  nodes: { 'g0/n0': { pos: [ZERO, ZERO], size: [ZERO, ZERO], margin: [ZERO, ZERO, ZERO, ZERO] } },
  layers: [[ZERO, ZERO]],
};
const ORDER = { layers: [], layerless: ['g0/n0'], hidden: [], edges: [], changed: [], ports: { 'g0/n0': [] } };

function row(id: string, expected: object): object {
  return { id, group: 'scenarios', input: { elk: {} }, target: null, options: {}, steps: [], prefix: null, expected };
}

function fileOf(rows: object[]): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'placement-rows-')), 'rows.json');
  writeFileSync(file, JSON.stringify({ rows }));
  return file;
}

describe('loadPlacementRows', () => {
  it('loads a row with its geometry', () => {
    const [loaded] = loadPlacementRows(fileOf([row('scenarios/ok', { ...ORDER, [GEOMETRY_KEY]: GEOMETRY })]));
    expect(loaded?.id).toBe('scenarios/ok');
    expect(loaded?.expected.geometry).toEqual(GEOMETRY);
    expect(loaded?.expected.ports).toEqual(ORDER.ports);
  });

  it('rejects a row without geometry, naming the row', () => {
    expect(() => loadPlacementRows(fileOf([row('scenarios/bare', ORDER)]))).toThrow(
      /row scenarios\/bare: expected\.geometry/,
    );
  });

  it('rejects a geometry without a nodes map or a layers list, naming the row', () => {
    const noNodes = { ...ORDER, [GEOMETRY_KEY]: { layers: [] } };
    const noLayers = { ...ORDER, [GEOMETRY_KEY]: { nodes: {} } };
    expect(() => loadPlacementRows(fileOf([row('scenarios/nonodes', noNodes)]))).toThrow(/row scenarios\/nonodes/);
    expect(() => loadPlacementRows(fileOf([row('scenarios/nolayers', noLayers)]))).toThrow(/row scenarios\/nolayers/);
  });

  it('still applies the 7c ports check and the 7b structural checks', () => {
    const { ports: _ports, ...noPorts } = ORDER;
    expect(() =>
      loadPlacementRows(fileOf([row('scenarios/noports', { ...noPorts, [GEOMETRY_KEY]: GEOMETRY })])),
    ).toThrow(/row scenarios\/noports: expected\.ports/);
    expect(() => loadPlacementRows(fileOf([{ id: 'x' }]))).toThrow(/row 0 is malformed/);
  });
});
