// SPDX-License-Identifier: EPL-2.0
// The graph model of alg.disco (mission 8b, T7). The rebuild of a DCGraph from every `import` stop of test/golden/refs/java/disco.json is
// dumped again in the recorder's shape and compared with the stop (components, elements, polygons, extensions, bounds, minCorner, ids,
// offsets, inset, dimensions, props); the unit tests read the Java (DCGraph, DCComponent, DCElement, DCExtension, DCDirection).
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { compareJson, formatDifferences, type Comparison } from '../../../../test/helpers/disco-replay-dump.js';
import { runImportRebuild } from '../../../../test/helpers/disco-replay-run.js';
import { discoRefExists, loadDiscoRows, STEP_IMPORT, stopOf } from '../../../../test/helpers/disco-replay-rows.js';
import { DCComponent } from './DCComponent.js';
import { DCDirection } from './DCDirection.js';
import { DCElement } from './DCElement.js';
import { DCExtension } from './DCExtension.js';
import { DCGraph } from './DCGraph.js';

const HEAVY = { timeout: 60_000 } as const;
const ref = discoRefExists();

const square = (x: number, y: number, size: number): DCElement =>
  new DCElement(
    new KVectorChain(
      new KVector(x, y),
      new KVector(x, y + size),
      new KVector(x + size, y + size),
      new KVector(x + size, y),
    ),
  );

describe.skipIf(!ref)('the DCGraph rebuilt from the import stops of disco.json', () => {
  it('dumps back to the recorded import stop for every stops row', HEAVY, () => {
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    for (const row of loadDiscoRows('stops')) {
      compareJson(stopOf(row, STEP_IMPORT), runImportRebuild(row), undefined, row.id, total);
    }
    expect(formatDifferences(total)).toBe('');
    expect(total.hexClose).toBe(0);
  });
});

describe('DCDirection (DCDirection.java)', () => {
  it('lists NORTH, EAST, SOUTH, WEST in order with horizontal = EAST, WEST', () => {
    expect(DCDirection.values().map((d) => d.name())).toEqual(['NORTH', 'EAST', 'SOUTH', 'WEST']);
    expect(DCDirection.values().map((d) => d.isHorizontal())).toEqual([false, true, false, true]);
    expect(DCDirection.values().map((d) => d.ordinal())).toEqual([0, 1, 2, 3]);
    expect(String(DCDirection.SOUTH)).toBe('SOUTH');
    expect(DCDirection.WEST.compareTo(DCDirection.NORTH)).toBe(3);
  });

  it('valueOf resolves a name and rejects an unknown one with the Java message', () => {
    expect(DCDirection.valueOf('EAST')).toBe(DCDirection.EAST);
    expect(() => DCDirection.valueOf('UP')).toThrow(IllegalArgumentException);
    expect(() => DCDirection.valueOf('UP')).toThrow('No enum constant org.eclipse.elk.alg.disco.graph.DCDirection.UP');
  });
});

describe('DCElement (DCElement.java)', () => {
  it('computes the bounding box of the polygon (java:62-72)', () => {
    const b = new DCElement(new KVectorChain(new KVector(4, 7), new KVector(1, 9), new KVector(6, 2))).getBounds();
    expect([b.x, b.y, b.width, b.height]).toEqual([1, 2, 5, 7]);
  });

  it('getCoords flattens the polygon once and returns the same array (java:97-110)', () => {
    const element = new DCElement(new KVectorChain(new KVector(4, 7), new KVector(1, 9)));
    const coords = element.getCoords();
    expect(coords).toEqual([4, 7, 1, 9]);
    expect(element.getCoords()).toBe(coords);
  });

  it('getOffset (java:91-93) dereferences a null component before the element is added to one', () => {
    expect(() => square(0, 0, 1).getOffset()).toThrow(TypeError);
    const component = new DCComponent();
    const element = square(0, 0, 1);
    component.addElement(element);
    component.setOffset(new KVector(3, 4));
    expect(element.getOffset()).toBe(component.getOffset());
  });

  it('keeps the parent coordinates (null until set, java:57,163) and the extensions in insertion order', () => {
    const element = square(0, 0, 10);
    expect(element.getParentcoords()).toBeNull();
    const coords = new KVector(1, 2);
    element.setParentCoords(coords);
    expect(element.getParentcoords()).toBe(coords);
    const first = new DCExtension(element, DCDirection.EAST, new KVector(10, 5), 2);
    const second = new DCExtension(element, DCDirection.NORTH, new KVector(5, 0), 2);
    expect(element.getExtensions()).toEqual([first, second]);
  });

  it('intersects (java:187-189): a crossing rectangle, a containing one, and a distant one', () => {
    const element = square(0, 0, 10);
    expect(element.intersects(new ElkRectangle(5, 5, 10, 10))).toBe(true);
    expect(element.intersects(new ElkRectangle(-5, -5, 30, 30))).toBe(true);
    expect(element.intersects(new ElkRectangle(20, 20, 1, 1))).toBe(false);
  });
});

describe('DCExtension (DCExtension.java)', () => {
  it('a horizontal extension offsets the attachment point by minus the bounds and half the width vertically (java:41-55)', () => {
    const element = square(10, 20, 10);
    const ext = new DCExtension(element, DCDirection.WEST, new KVector(10, 25), 4);
    expect([ext.getOffset().x, ext.getOffset().y]).toEqual([0, 3]);
    expect(ext.getParent()).toBe(element);
    expect(ext.getDirection()).toBe(DCDirection.WEST);
    expect(ext.getWidth()).toBe(4);
  });

  it('a vertical extension subtracts half the width horizontally', () => {
    const ext = new DCExtension(square(10, 20, 10), DCDirection.SOUTH, new KVector(15, 30), 4);
    expect([ext.getOffset().x, ext.getOffset().y]).toEqual([3, 10]);
  });
});

describe('DCComponent and DCGraph (DCComponent.java, DCGraph.java)', () => {
  it('starts empty with offset (0,0) and id -1 (java:45,57-60)', () => {
    const component = new DCComponent();
    expect(component.getElements().size).toBe(0);
    expect([component.getOffset().x, component.getOffset().y]).toEqual([0, 0]);
    expect(component.getId()).toBe(-1);
    component.setId(4);
    expect(component.getId()).toBe(4);
  });

  it('computes bounds and min corner from the elements, extensions included, and refreshes after changes (java:140-176)', () => {
    const component = new DCComponent();
    const element = square(10, 20, 10);
    component.addElements([element]);
    new DCExtension(element, DCDirection.EAST, new KVector(20, 25), 4);
    new DCExtension(element, DCDirection.NORTH, new KVector(15, 20), 20);
    const bounds = component.getDimensionsOfBoundingRectangle();
    expect([bounds.x, bounds.y]).toEqual([20, 10]);
    expect([component.getMinCorner().x, component.getMinCorner().y]).toEqual([5, 20]);
    component.setOffset(new KVector(100, 200));
    expect([component.getMinCorner().x, component.getMinCorner().y]).toEqual([105, 220]);
    component.addElement(square(40, 40, 10));
    const grown = component.getDimensionsOfBoundingRectangle();
    expect([grown.x, grown.y]).toEqual([45, 30]);
  });

  it('intersects any element (java:112-119)', () => {
    const component = new DCComponent();
    component.addElements([square(0, 0, 10), square(50, 50, 10)]);
    expect(component.intersects(new ElkRectangle(55, 55, 10, 10))).toBe(true);
    expect(component.intersects(new ElkRectangle(20, 20, 2, 2))).toBe(false);
    // ElkMath.java:922-923, :1161: a rectangle strictly inside the polygon crosses no segment and contains no shape
    expect(component.intersects(new ElkRectangle(52, 52, 2, 2))).toBe(false);
  });

  it('builds one component per inner collection in order and sets the element parents (DCGraph java:50-56)', () => {
    const a = square(0, 0, 1);
    const b = square(5, 5, 1);
    const c = square(9, 9, 1);
    const graph = new DCGraph([[a, b], [c]]);
    const components = [...graph.getComponents()];
    expect(components.map((component) => [...component.getElements()])).toEqual([[a, b], [c]]);
    components[0]!.setOffset(new KVector(2, 3));
    expect(b.getOffset()).toBe(components[0]!.getOffset());
  });

  it('inset defaults to 0.0 and takes the second constructor argument; dimensions start null (java:42-44,98-105)', () => {
    expect(new DCGraph([]).getInset()).toBe(0);
    expect(new DCGraph([], 12).getInset()).toBe(12);
    const graph = new DCGraph([]);
    expect(graph.getDimensions()).toBeNull();
    const dims = new KVector(3, 4);
    graph.setDimensions(dims);
    expect(graph.getDimensions()).toBe(dims);
  });
});
