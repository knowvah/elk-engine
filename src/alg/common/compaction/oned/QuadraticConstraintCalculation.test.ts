// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import { CNode } from './CNode.js';
import type { ISpacingsHandler } from './ISpacingsHandler.js';
import { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));
const node = (graph: CGraph, x: number, y: number, w: number, h: number): CNode =>
  CNode.of()
    .hitbox(new ElkRectangle(x, y, w, h))
    .create(graph);
const compactor = (graph: CGraph, direction: Direction, handler?: ISpacingsHandler): OneDimensionalCompactor => {
  const c = new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);
  if (handler) c.setSpacingsHandler(handler);
  return c.changeDirection(direction);
};

describe('QuadraticConstraintCalculation', () => {
  it('constrains a node to every node to its right that overlaps its band', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 20);
    const b = node(graph, 30, 10, 20, 20);
    const c = node(graph, 60, 15, 20, 20);
    compactor(graph, Direction.LEFT);
    expect(a.constraints).toEqual([b, c]);
    expect(b.constraints).toEqual([c]);
    expect(c.constraints).toEqual([]);
  });

  it('adds no constraint between nodes that only touch in y, unless spacing is required', () => {
    const touching = newGraph();
    const a = node(touching, 0, 0, 20, 20);
    node(touching, 30, 20, 20, 20);
    compactor(touching, Direction.LEFT);
    expect(a.constraints).toEqual([]);

    const spaced = newGraph();
    const a2 = node(spaced, 0, 0, 20, 20);
    const b2 = node(spaced, 30, 20, 20, 20);
    compactor(spaced, Direction.LEFT, { getVerticalSpacing: () => 5, getHorizontalSpacing: () => 0 });
    expect(a2.constraints).toEqual([b2]);
  });

  it('breaks an x tie by width: the narrower node constrains the wider one only', () => {
    const graph = newGraph();
    const narrow = node(graph, 0, 0, 10, 20);
    const wide = node(graph, 0, 10, 20, 20);
    compactor(graph, Direction.LEFT);
    expect(narrow.constraints).toEqual([wide]);
    expect(wide.constraints).toEqual([]);
  });

  it('adds no constraint when x and width tie', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 20);
    const b = node(graph, 0, 10, 20, 20);
    compactor(graph, Direction.LEFT);
    expect([a.constraints, b.constraints]).toEqual([[], []]);
  });

  it('adds no constraint between nodes of the same group', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 20);
    const b = node(graph, 30, 10, 20, 20);
    CGroup.of().nodes(a, b).create(graph);
    compactor(graph, Direction.LEFT);
    expect([a.constraints, b.constraints]).toEqual([[], []]);
  });

  it('resets old constraints before recalculating', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 20);
    const b = node(graph, 30, 10, 20, 20);
    const c = compactor(graph, Direction.LEFT);
    b.hitbox.y = 100;
    c.forceConstraintsRecalculation();
    expect(a.constraints).toEqual([]);
  });

  it('uses the vertical spacing when compacting horizontally and the horizontal one otherwise', () => {
    const handler: ISpacingsHandler = { getVerticalSpacing: () => 0, getHorizontalSpacing: () => 10 };
    const horizontal = newGraph();
    const a = node(horizontal, 0, 0, 20, 20);
    node(horizontal, 30, 25, 20, 20);
    compactor(horizontal, Direction.LEFT, handler);
    expect(a.constraints).toEqual([]);

    // original b at x = 25 becomes y = 25 after the transposition for UP
    const vertical = newGraph();
    const a2 = node(vertical, 0, 0, 20, 20);
    const b2 = node(vertical, 25, 30, 20, 20);
    compactor(vertical, Direction.UP, handler);
    expect(a2.constraints).toEqual([b2]);
  });
});
