// SPDX-License-Identifier: EPL-2.0
// Replays every `stops` row of test/golden/refs/java/disco.json (mission 8b, T7; recorder tools/vectors/DiscoVectors.java): the DCGraph is
// rebuilt from the row's `import` stop, the grid cell sizes come from its `cellSizes` stop, one DCPolyomino is built per component the way
// DisCoPolyominoCompactor.createPolyominoes does (`new DCPolyomino(comp, cellSizeX, cellSizeY)`), and each is compared with the `polys` stop
// (recorded after createPolyominoes, before packPolyominoes: no ProfileFill, no ids, x = y = 0) at the AD-4 bar. The two out-of-grid
// throws rows have no import stop; their geometry is the neighbouring `InRange` row's with the extension moved half a unit.
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import {
  compareJson,
  dumpDCPolyomino,
  formatDifferences,
  rebuildDCGraph,
  type Comparison,
} from '../../../../test/helpers/disco-replay-dump.js';
import {
  createPolyominoes,
  rebuildImport,
  runPolys,
  shiftExtensions,
} from '../../../../test/helpers/disco-replay-run.js';
import {
  discoRefExists,
  loadDiscoRows,
  STEP_CELL_SIZES,
  STEP_IMPORT,
  STEP_POLYS,
  stopOf,
  type PolyEntry,
} from '../../../../test/helpers/disco-replay-rows.js';
import { DCComponent } from '../graph/DCComponent.js';
import { DCDirection } from '../graph/DCDirection.js';
import { DCElement } from '../graph/DCElement.js';
import { DCExtension } from '../graph/DCExtension.js';
import { DCGraph } from '../graph/DCGraph.js';
import { DCPolyomino } from './DCPolyomino.js';

const HEAVY = { timeout: 60_000 } as const;
const OUT_OF_GRID_HALF_UNIT = 0.5;
const THROWS_PREFIX = 'throws/extOutOfGrid';
const IN_RANGE_PREFIX = 'stops/extBoundary';
const IN_RANGE_SUFFIX = 'InRange/default';
const INT_MIN = -2147483648;

const ref = discoRefExists();
const rows = ref ? loadDiscoRows('stops') : [];
const throwsRows = ref ? loadDiscoRows('throws') : [];

describe.skipIf(!ref)('DCPolyomino against the polys stops of disco.json', () => {
  it('the ref holds 88 stops rows', () => {
    expect(rows.length).toBe(88);
  });

  it('builds every polyomino of every stops row as the oracle recorded it', HEAVY, () => {
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    let polys = 0;
    let identicalPolys = 0;
    for (const row of rows) {
      const expected = stopOf(row, STEP_POLYS).polys;
      const actual = runPolys(row);
      const one: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
      compareJson(expected, actual, undefined, row.id, one);
      total.differences.push(...one.differences);
      total.hexExact += one.hexExact;
      total.hexClose += one.hexClose;
      polys += expected.length;
      identicalPolys += one.differences.length === 0 && one.hexClose === 0 ? expected.length : 0;
    }
    expect(formatDifferences(total)).toBe('');
    // every polyomino was compared (the count is the sum of the recorded polys stops)
    expect(polys).toBe(rows.reduce((sum, row) => sum + stopOf(row, STEP_POLYS).polys.length, 0));
    expect(identicalPolys).toBeLessThanOrEqual(polys);
    process.stdout.write(
      `DCPolyomino replay: ${String(polys)} polyominoes, ${String(identicalPolys)} raw-bit identical rows-wise, ` +
        `${String(total.hexExact)} hex fields exact, ${String(total.hexClose)} within 1e-6\n`,
    );
  });

  it('records one polyomino per component and the recorded cell sizes', () => {
    for (const row of rows) {
      const rebuilt = rebuildImport(row);
      const polys = createPolyominoes(rebuilt, stopOf(row, STEP_CELL_SIZES));
      expect(polys.length).toBe(stopOf(row, STEP_POLYS).polys.length);
      expect(polys.length).toBe(stopOf(row, STEP_IMPORT).components.length);
      polys.forEach((poly, i) => expect(poly.getRepresentee()).toBe(rebuilt.components[i]));
    }
  });

  it.each(['West', 'North'])(
    'throws IndexOutOfBoundsException for extOutOfGrid%s (geometry of the InRange row, half a unit on)',
    (side) => {
      const inRange = rows.find(
        (row) => row.id === `${IN_RANGE_PREFIX}${side === 'West' ? 'West' : 'North'}${IN_RANGE_SUFFIX}`,
      )!;
      const thrown = throwsRows.find((row) => row.id === `${THROWS_PREFIX}${side}`)!.expected.throws;
      const [dx, dy] = side === 'West' ? [0, OUT_OF_GRID_HALF_UNIT] : [OUT_OF_GRID_HALF_UNIT, 0];
      const rebuilt = rebuildDCGraph(shiftExtensions(stopOf(inRange, STEP_IMPORT), dx, dy));
      let error: unknown = null;
      try {
        createPolyominoes(rebuilt, stopOf(inRange, STEP_CELL_SIZES));
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(IndexOutOfBoundsException);
      expect(thrown.class).toBe('java.lang.IndexOutOfBoundsException');
      expect((error as Error).message).toBe(thrown.message);
    },
  );

  it('the in-range rows of the same geometry build the recorded polyomino (all cells empty but the weak ones)', () => {
    for (const side of ['West', 'North']) {
      const row = rows.find((r) => r.id === `${IN_RANGE_PREFIX}${side}${IN_RANGE_SUFFIX}`)!;
      expect(compareJson(stopOf(row, STEP_POLYS).polys, runPolys(row)).differences).toEqual([]);
    }
  });
});

const lone = (width: number, height: number): DCComponent => {
  const chain = new KVectorChain(
    new KVector(0, 0),
    new KVector(0, height),
    new KVector(width, height),
    new KVector(width, 0),
  );
  return new DCGraph([[new DCElement(chain)]]).getComponents().values().next().value!;
};

describe('DCPolyomino (unit; expectations read from DCPolyomino.java)', () => {
  const lowRes = (dim: number, cellSize: number): number =>
    (
      DCPolyomino.prototype as unknown as { computeLowResDimension(d: number, c: number): number }
    ).computeLowResDimension.call(undefined, dim, cellSize);

  it('computeLowResDimension, java:169-171: truncates, then rounds up a fraction', () => {
    expect(lowRes(25, 10)).toBe(3);
    expect(lowRes(20, 10)).toBe(2);
    expect(lowRes(0, 10)).toBe(0);
  });

  it('computeLowResDimension, java:169: (int) NaN is 0, and 0 > 0 is false', () => {
    expect(lowRes(0, 0)).toBe(0);
  });

  it('computeLowResDimension, java:169-171: (int) saturates, and fitTruncated++ wraps to Integer.MIN_VALUE', () => {
    expect(lowRes(Infinity, 1)).toBe(INT_MIN);
  });

  it('getId and setId (java:134) go to the represented component, default -1 (DCComponent.java:45)', () => {
    const component = lone(10, 10);
    const poly = new DCPolyomino(component, 10, 10);
    expect(poly.getId()).toBe(-1);
    poly.setId(7);
    expect(component.getId()).toBe(7);
    expect(poly.getRepresentee()).toBe(component);
  });

  it('a 10x10 component on a 10x10 grid blocks no cell (the cell only touches the border): the grid is 1x1 and empty', () => {
    const poly = new DCPolyomino(lone(10, 10), 10, 10);
    expect(dumpDCPolyomino(poly, 0)).toMatchObject({ w: 1, h: 1, cells: ['1_'], extensions: [] });
  });

  it('getMinCornerOnCanvas (java:105) is the component corner minus the polyomino offset', () => {
    const poly = new DCPolyomino(lone(25, 10), 10, 10);
    // offset = (dims - size) * -0.5 = ((25,10) - (30,10)) * -0.5 = (2.5, -0)
    expect(poly.getOffset().x).toBe(2.5);
    expect(poly.getMinCornerOnCanvas().x).toBe(-2.5);
    expect(poly.getCellSizeX()).toBe(10);
    expect(poly.getCellSizeY()).toBe(10);
  });

  it('adds an EAST and a SOUTH extension to the grid (java:236-259) with their weakly blocked areas', () => {
    const component = lone(30, 30);
    const element = component.getElements().values().next().value!;
    new DCExtension(element, DCDirection.EAST, new KVector(30, 15), 10);
    new DCExtension(element, DCDirection.SOUTH, new KVector(15, 30), 10);
    const poly = dumpDCPolyomino(new DCPolyomino(component, 10, 10), 0);
    expect(poly.extensions).toEqual([
      { dir: 'EAST', offset: 1, width: 2 },
      { dir: 'SOUTH', offset: 1, width: 2 },
    ]);
  });
});
