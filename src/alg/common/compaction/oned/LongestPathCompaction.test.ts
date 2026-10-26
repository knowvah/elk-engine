// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import { CNode } from './CNode.js';
import { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));
const node = (graph: CGraph, x: number, y: number, w: number, h: number): CNode =>
  CNode.of()
    .hitbox(new ElkRectangle(x, y, w, h))
    .create(graph);
const quadratic = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);

describe('LongestPathCompaction', () => {
  it('records delta and a direction-normalized delta for the moved group', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 0, 20, 20);
    quadratic(graph).changeDirection(Direction.LEFT).compact();
    expect([left.hitbox.x, right.hitbox.x]).toEqual([0, 20]);
    expect([left.cGroup?.delta, left.cGroup?.deltaNormalized]).toEqual([0, 0]);
    expect([right.cGroup?.delta, right.cGroup?.deltaNormalized]).toEqual([10, -10]);
  });

  it('adds the normalized delta (not subtracts) for RIGHT', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const right = node(graph, 30, 0, 20, 20);
    quadratic(graph).changeDirection(Direction.RIGHT).compact().finish();
    expect([left.hitbox.x, right.hitbox.x]).toEqual([10, 30]);
    expect([left.cGroup?.delta, left.cGroup?.deltaNormalized]).toEqual([10, 10]);
    expect([right.cGroup?.delta, right.cGroup?.deltaNormalized]).toEqual([0, 0]);
  });

  it('keeps a locked node where it is and pushes its successors against it', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const mid = node(graph, 50, 0, 20, 20);
    const right = node(graph, 100, 0, 20, 20);
    quadratic(graph)
      .setLockFunction({ isLocked: (n, d) => n === mid && d === Direction.LEFT })
      .changeDirection(Direction.LEFT)
      .compact();
    expect([left.hitbox.x, mid.hitbox.x, right.hitbox.x]).toEqual([0, 50, 70]);
    expect(mid.cGroup?.delta).toBe(0);
  });

  it('moves a locked node whose fixed position would violate its constraints', () => {
    const graph = newGraph();
    const left = node(graph, 0, 0, 20, 20);
    const mid = node(graph, 10, 0, 20, 20);
    quadratic(graph)
      .setLockFunction({ isLocked: (n) => n === mid })
      .changeDirection(Direction.LEFT)
      .compact();
    expect([left.hitbox.x, mid.hitbox.x]).toEqual([0, 20]);
  });

  it('keeps the offsets inside a group', () => {
    const graph = newGraph();
    const a = node(graph, 0, 0, 20, 20);
    const b = node(graph, 25, 100, 20, 20);
    CGroup.of().nodes(a, b).create(graph);
    const blocker = node(graph, 0, 100, 10, 20);
    quadratic(graph).changeDirection(Direction.LEFT).compact();
    expect([a.hitbox.x, b.hitbox.x, blocker.hitbox.x]).toEqual([0, 25, 0]);
  });
});
