// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import { CNode } from './CNode.js';
import { OneDimensionalCompactor } from './OneDimensionalCompactor.js';
import { ScanlineConstraintCalculator } from './ScanlineConstraintCalculator.js';

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));
const node = (graph: CGraph, x: number, y: number, w: number, h: number): CNode =>
  CNode.of()
    .hitbox(new ElkRectangle(x, y, w, h))
    .create(graph);
const withScanline = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph)
    .setConstraintAlgorithm(OneDimensionalCompactor.SCANLINE_CONSTRAINTS)
    .changeDirection(Direction.LEFT);

class ExposedSweep extends ScanlineConstraintCalculator {
  run(compactor: OneDimensionalCompactor, filter: (n: CNode) => boolean): void {
    this.compactor = compactor;
    this.sweep(filter);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScanlineConstraintCalculator', () => {
  it('constrains only direct neighbours (no transitive constraint)', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 10, 10);
    const b = node(graph, 20, 0, 10, 10);
    const c = node(graph, 40, 0, 10, 10);
    withScanline(graph);
    expect(a.constraints).toEqual([b]);
    expect(b.constraints).toEqual([c]);
    expect(c.constraints).toEqual([]);
  });

  it('adds no constraint for nodes that only share a y border', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 10, 10);
    const b = node(graph, 20, 10, 10, 10);
    withScanline(graph);
    expect([a.constraints, b.constraints]).toEqual([[], []]);
  });

  it('adds no constraint between nodes of the same group', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 10, 10);
    const b = node(graph, 20, 0, 10, 10);
    const c = node(graph, 40, 0, 10, 10);
    CGroup.of().nodes(a, b).create(graph);
    withScanline(graph);
    expect(a.constraints).toEqual([]);
    expect(b.constraints).toEqual([c]);
  });

  it('adds no constraint when the nodes have no group', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 10, 10);
    const b = node(graph, 20, 0, 10, 10);
    const calculator = new ScanlineConstraintCalculator();
    calculator.calculateConstraints({ cGraph: graph } as OneDimensionalCompactor);
    expect([a.constraints, b.constraints]).toEqual([[], []]);
    expect([a.id, b.id]).toEqual([0, 1]);
  });

  it('throws when two intervals share the same centre x', () => {
    const graph = newGraph();
    node(graph, 0, 0, 10, 10);
    node(graph, 0, 5, 10, 10);
    expect(() => withScanline(graph)).toThrow(IllegalStateException);
    expect(() => withScanline(graph)).toThrow('Invalid hitboxes for scanline constraint calculation.');
  });

  it('never reaches the overlap diagnostic: floor and ceiling of a member are the member itself', () => {
    // ScanlineConstraintCalculator.java:159 calls overlap(p.node, intervals.floor(p.node)) right after
    // adding p.node, so both neighbours are p.node and overlap(n, n) is false. The branch is kept (AC4).
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 10);
    const b = node(graph, 10, 5, 20, 10);
    withScanline(graph);
    expect(error).not.toHaveBeenCalled();
    expect(a.constraints).toEqual([b]);
  });

  it('overlap is false for null or identical nodes and fuzzy-true for touching boxes', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 10);
    const b = node(graph, 20.00005, 0, 20, 10);
    const c = node(graph, 25, 0, 20, 10);
    const calculator = new ScanlineConstraintCalculator();
    expect(calculator.overlap(null, a)).toBe(false);
    expect(calculator.overlap(a, null)).toBe(false);
    expect(calculator.overlap(a, a)).toBe(false);
    expect(calculator.overlap(a, b)).toBe(true);
    expect(calculator.overlap(b, a)).toBe(true);
    expect(calculator.overlap(a, c)).toBe(false);
  });

  it('sweep includes only the nodes that pass the filter', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 10, 10);
    const b = node(graph, 20, 0, 10, 10);
    const c = node(graph, 40, 0, 10, 10);
    const compactor = new OneDimensionalCompactor(graph);
    new ExposedSweep().run(compactor, (n) => n !== b);
    expect(a.constraints).toEqual([c]);
    expect(b.constraints).toEqual([]);
  });
});
