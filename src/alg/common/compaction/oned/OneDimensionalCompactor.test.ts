// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { Pair } from '../../../../core/util/Pair.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
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
const scanline = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.SCANLINE_CONSTRAINTS);
const quadratic = (graph: CGraph): OneDimensionalCompactor =>
  new OneDimensionalCompactor(graph).setConstraintAlgorithm(OneDimensionalCompactor.QUADRATIC_CONSTRAINTS);

describe('OneDimensionalCompactor', () => {
  describe('construction', () => {
    it('wraps plain nodes into groups and remembers the original hitbox', () => {
      const graph = newGraph();
      const a = node(graph, 1, 2, 3, 4);
      new OneDimensionalCompactor(graph);
      expect(graph.cGroups).toHaveLength(1);
      expect([...(a.cGroup?.cNodes ?? [])]).toEqual([a]);
      a.hitbox.x = 99;
      expect(a.hitboxPreCompaction).toEqual(new ElkRectangle(1, 2, 3, 4));
      expect(a.hitboxPreCompaction).not.toBe(a.hitbox);
    });

    it('starts without a direction', () => {
      expect(new OneDimensionalCompactor(newGraph()).direction).toBe(Direction.UNDEFINED);
    });
  });

  describe('calculateGroupOffsets', () => {
    it('picks the left-most node as reference and derives non-negative x offsets', () => {
      const graph = newGraph();
      const a = node(graph, 10, 5, 1, 1);
      const b = node(graph, 4, 9, 1, 1);
      const group = CGroup.of().nodes(a, b).create(graph);
      new OneDimensionalCompactor(graph);
      expect(group.reference).toBe(b);
      expect([a.cGroupOffset.x, a.cGroupOffset.y]).toEqual([6, -4]);
      expect([b.cGroupOffset.x, b.cGroupOffset.y]).toEqual([0, 0]);
    });

    it('keeps the first node as reference on an x tie', () => {
      const graph = newGraph();
      const a = node(graph, 4, 5, 1, 1);
      const b = node(graph, 4, 9, 1, 1);
      const group = CGroup.of().nodes(b, a).create(graph);
      new OneDimensionalCompactor(graph);
      expect(group.reference).toBe(b);
    });

    it('returns the compactor so calls can be chained', () => {
      const compactor = new OneDimensionalCompactor(newGraph());
      expect(compactor.calculateGroupOffsets()).toBe(compactor);
    });
  });

  describe('state checks', () => {
    it('compact defaults the direction to LEFT', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 30, 0, 20, 20);
      const compactor = quadratic(graph).compact();
      expect(compactor.direction).toBe(Direction.LEFT);
      expect([a.hitbox.x, b.hitbox.x]).toEqual([0, 20]);
    });

    it('rejects compact and changeDirection after finish', () => {
      const compactor = quadratic(newGraph()).changeDirection(Direction.LEFT).compact().finish();
      expect(() => compactor.compact()).toThrow(IllegalStateException);
      expect(() => compactor.compact()).toThrow('The OneDimensionalCompactor instance has been finished already.');
      expect(() => compactor.changeDirection(Direction.UP)).toThrow(
        'The OneDimensionalCompactor instance has been finished already.',
      );
    });

    it('rejects a direction the graph does not support', () => {
      const compactor = new OneDimensionalCompactor(new CGraph(EnumSet.of(Direction.LEFT)));
      expect(() => compactor.changeDirection(Direction.UP)).toThrow(RuntimeException);
      expect(() => compactor.changeDirection(Direction.UP)).toThrow(
        'The direction UP is not supported by the CGraph instance.',
      );
    });

    it('short-circuits a change to the current direction', () => {
      const graph = newGraph();
      const a = node(graph, 5, 0, 20, 20);
      const compactor = quadratic(graph).changeDirection(Direction.RIGHT);
      const mirrored = a.hitbox.x;
      expect(compactor.changeDirection(Direction.RIGHT)).toBe(compactor);
      expect(a.hitbox.x).toBe(mirrored);
    });

    it('finish restores the original orientation', () => {
      const graph = newGraph();
      const a = node(graph, 5, 7, 20, 30);
      quadratic(graph).changeDirection(Direction.DOWN).finish();
      expect(a.hitbox).toEqual(new ElkRectangle(5, 7, 20, 30));
    });
  });

  describe('locks', () => {
    it('isLocked(node) is false without a lock function and delegates with one', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 1, 1);
      const compactor = new OneDimensionalCompactor(graph);
      expect(compactor.isLocked(a, Direction.LEFT)).toBe(false);
      compactor.setLockFunction({ isLocked: (n, d) => n === a && d === Direction.LEFT });
      expect(compactor.isLocked(a, Direction.LEFT)).toBe(true);
      expect(compactor.isLocked(a, Direction.RIGHT)).toBe(false);
      compactor.setLockFunction(null);
      expect(compactor.isLocked(a, Direction.LEFT)).toBe(false);
    });

    it('isLocked(group) is true as soon as one member is locked', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 1, 1);
      const b = node(graph, 5, 0, 1, 1);
      const group = CGroup.of().nodes(a, b).create(graph);
      const compactor = new OneDimensionalCompactor(graph).setLockFunction({ isLocked: (n) => n === b });
      expect(compactor.isLocked(group, Direction.LEFT)).toBe(true);
      compactor.setLockFunction({ isLocked: () => false });
      expect(compactor.isLocked(group, Direction.LEFT)).toBe(false);
    });
  });

  describe('constraints', () => {
    it('predefined horizontal constraints point from first to second when compacting LEFT', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 0, 100, 20, 20);
      graph.predefinedHorizontalConstraints.push(new Pair(a, b));
      scanline(graph).changeDirection(Direction.LEFT).compact();
      expect(a.constraints).toEqual([b]);
      expect([a.hitbox.x, b.hitbox.x]).toEqual([0, 20]);
    });

    it('predefined horizontal constraints are reversed when starting with RIGHT', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 0, 100, 20, 20);
      graph.predefinedHorizontalConstraints.push(new Pair(a, b));
      const compactor = scanline(graph).changeDirection(Direction.RIGHT).compact();
      expect(b.constraints).toEqual([a]);
      compactor.finish();
      expect([a.hitbox.x, b.hitbox.x]).toEqual([-20, 0]);
      // finish() flips back to LEFT by reversing the constraints
      expect(a.constraints).toEqual([b]);
    });

    it('predefined vertical constraints apply when compacting vertically', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 100, 0, 20, 20);
      graph.predefinedVerticalConstraints.push(new Pair(a, b));
      scanline(graph).changeDirection(Direction.UP).compact().finish();
      expect([a.hitbox.y, b.hitbox.y]).toEqual([0, 20]);
    });

    it('the quadratic algorithm discards predefined constraints (QuadraticConstraintCalculation.java:30-32)', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 0, 100, 20, 20);
      graph.predefinedHorizontalConstraints.push(new Pair(a, b));
      quadratic(graph).changeDirection(Direction.LEFT).compact();
      expect(a.constraints).toEqual([]);
      expect([a.hitbox.x, b.hitbox.x]).toEqual([0, 0]);
    });

    it('records the incoming constraints and out degrees of the groups', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 30, 0, 20, 20);
      const c = node(graph, 60, 0, 20, 20);
      quadratic(graph).changeDirection(Direction.LEFT);
      const [ga, gb, gc] = [a.cGroup, b.cGroup, c.cGroup] as [CGroup, CGroup, CGroup];
      expect(ga.incomingConstraints).toEqual(new Set([b, c]));
      expect(gb.incomingConstraints).toEqual(new Set([c]));
      expect(gc.incomingConstraints.size).toBe(0);
      expect([ga.outDegree, gb.outDegree, gc.outDegree]).toEqual([0, 1, 2]);
      expect([ga.outDegreeReal, gb.outDegreeReal, gc.outDegreeReal]).toEqual([0, 1, 2]);
    });

    it('reversing for the opposite direction yields the incoming constraints', () => {
      const graph = newGraph();
      const a = node(graph, 0, 0, 20, 20);
      const b = node(graph, 30, 0, 20, 20);
      const c = node(graph, 60, 0, 20, 20);
      quadratic(graph).changeDirection(Direction.LEFT).changeDirection(Direction.RIGHT);
      expect(a.constraints).toEqual([]);
      expect(b.constraints).toEqual([a]);
      expect(c.constraints).toEqual([a, b]);
      expect(a.startPos).toBe(Number.NEGATIVE_INFINITY);
    });

    it('the result does not depend on the order the nodes were created in (identity-hashed sites)', () => {
      const specs = [
        [0, 0],
        [25, 0],
        [0, 25],
        [25, 25],
        [50, 10],
      ] as const;
      const run = (order: readonly number[]): string[] => {
        const graph = newGraph();
        const byIndex = new Map<number, CNode>();
        for (const i of order) {
          const [x, y] = specs[i] as readonly [number, number];
          byIndex.set(i, node(graph, x, y, 20, 20));
        }
        quadratic(graph)
          .changeDirection(Direction.LEFT)
          .compact()
          .changeDirection(Direction.RIGHT)
          .compact()
          .changeDirection(Direction.UP)
          .compact()
          .changeDirection(Direction.DOWN)
          .compact()
          .finish();
        return specs.map((_, i) => {
          const h = (byIndex.get(i) as CNode).hitbox;
          return `${h.x},${h.y}`;
        });
      };
      const forward = run([0, 1, 2, 3, 4]);
      expect(run([4, 3, 2, 1, 0])).toEqual(forward);
      expect(run([2, 4, 0, 3, 1])).toEqual(forward);
    });
  });
});
