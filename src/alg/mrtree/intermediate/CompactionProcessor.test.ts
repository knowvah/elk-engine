// SPDX-License-Identifier: EPL-2.0
// Proof of CompactionProcessor (mission 8a, T16): `process` from the recorded NodePlacer-era state to the recorded
// CompactionProcessor stop for every row of the ref that runs it, plus Java-traced hand cases (CompactionProcessor.java).
import { describe, expect, it, vi } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { loadStopsRows, mrTreeExtraRefPath } from '../../../../test/helpers/mrtree-replay-rows.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { TreeSet } from '../../common/compaction/oned/ScanlineConstraintCalculatorTreeSet.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { EdgeRoutingMode } from '../options/EdgeRoutingMode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { CompactionProcessor } from './CompactionProcessor.js';

const STEP = 'CompactionProcessor';

/** Transitions of the second ref, those the dump cannot rebuild, and those with compaction on (measured on the first run). */
const EXTRA_TOTAL = 82;
const EXTRA_REFUSED = 0;
const EXTRA_COMPACTING = 45;

describe('CompactionProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the CompactionProcessor stop of every transition of mrtree.json', { timeout: 60_000 }, () => {
    const replay = replayStep(STEP, () => new CompactionProcessor());
    const compacting = replay.replayed.filter((r) => r.graph.getProperty(MrTreeOptions.COMPACTION));
    expect([replay.total, replay.refused, replay.replayed.length, compacting.length]).toEqual([88, 0, 88, 7]);
  });

  it('equals the CompactionProcessor stop of every transition of mrtree-extra.json', { timeout: 60_000 }, () => {
    const replay = replayStep(STEP, () => new CompactionProcessor(), loadStopsRows(mrTreeExtraRefPath()));
    const compacting = replay.replayed.filter((r) => r.graph.getProperty(MrTreeOptions.COMPACTION));
    expect([replay.total, replay.refused, compacting.length]).toEqual([EXTRA_TOTAL, EXTRA_REFUSED, EXTRA_COMPACTING]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Hand cases for what no oracle row reaches (branch coverage of the two replays alone, see the T16 journal row): the UP arm of the
// dependent-node placement whose parent lies beyond the dependent node (java:95-97), a parentless non-root node (java:108), an UNDEFINED
// direction (no switch case; the pipeline never leaves it UNDEFINED after NodePlacer, java:78, :110) and the semantics the Java relies on
// in the TreeSet and in the stream reductions. Expectations read off the cited Java arithmetic, not oracle-recorded.
// Geometry: every node is 10 x 10, the spacing is the default 20, so `computeNodeConstraints` runs with 5.
// ---------------------------------------------------------------------------------------------------------------------------------

const SIZE = 10;
const FAR = 1000;

/** Compaction on with `dir`; the routing mode is aggressive (not AVOID_OVERLAP, MrTreeOptions' default). */
function aggressiveGraph(g: TGraph, dir: Direction): void {
  g.setProperty(MrTreeOptions.COMPACTION, true);
  g.setProperty(MrTreeOptions.DIRECTION, dir);
  g.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.MIDDLE_TO_MIDDLE);
}

describe('aggressive compaction, hand cases', () => {
  it('UP, a chain a <- b whose parent lies beyond the dependent node: b goes beside the parent (java:93-99, inner if true)', () => {
    // r -> a, c -> b with c a second root; on y: r 0, a -100, c -200, b -300; a lands at -30, b beside c at -230
    const { g, nodes } = graphOf(4, [
      [0, 1],
      [3, 2],
    ]);
    const [r, a, b, c] = nodes as [TNode, TNode, TNode, TNode];
    r.setProperty(InternalProperties.ROOT, true);
    c.setProperty(InternalProperties.ROOT, true);
    [
      [r, 0, 0],
      [a, 0, -100],
      [b, 0, -300],
      [c, FAR, -200],
    ].forEach(([n, x, y]) => {
      const node = n as TNode;
      node.getPosition().x = x as number;
      node.getPosition().y = y as number;
      node.getSize().x = SIZE;
      node.getSize().y = SIZE;
    });
    aggressiveGraph(g, Direction.UP);
    runOn(new CompactionProcessor(), g);
    expect(b.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([a]);
    expect([a.getPosition().y, b.getPosition().y]).toEqual([-30, -230]);
  });

  it('a parentless non-root node without dependents keeps newPos at 0 (java:74, :108): it goes to 0 on the layout axis', () => {
    const { g, nodes } = graphOf(2, []);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    nodes[1]!.getPosition().x = 33;
    nodes[1]!.getPosition().y = 44;
    aggressiveGraph(g, Direction.DOWN);
    runOn(new CompactionProcessor(), g);
    expect([nodes[1]!.getPosition().x, nodes[1]!.getPosition().y]).toEqual([33, 0]);
  });

  it('an UNDEFINED direction has no switch case: a node with a parent is placed at 0 on y (java:78, :110)', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    nodes[1]!.getPosition().x = 7;
    nodes[1]!.getPosition().y = 99;
    aggressiveGraph(g, Direction.UNDEFINED);
    runOn(new CompactionProcessor(), g);
    expect([nodes[1]!.getPosition().x, nodes[1]!.getPosition().y]).toEqual([7, 0]);
  });
});

describe('process with COMPACTION off (CompactionProcessor.java:53-55)', () => {
  it('begins the monitor, leaves the graph alone and never calls done (the Java returns before done)', () => {
    const { g, nodes } = graphOf(2, [[0, 1]]);
    nodes[1]!.getPosition().y = 77;
    const monitor = { begin: vi.fn(), done: vi.fn() } as unknown as IElkProgressMonitor;
    new CompactionProcessor().process(g, monitor);
    expect(monitor.begin).toHaveBeenCalledWith('Process compaction', 1);
    expect(monitor.done).not.toHaveBeenCalled();
    expect(nodes[1]!.getPosition().y).toBe(77);
  });
});

describe('computeNodeConstraints: the scanline over a comparator-based TreeSet (CompactionProcessor.java:246-279)', () => {
  /** u (0, 50), v (2, vy) narrower than u, t (3, 100) below them; direction DOWN, spacing 5. */
  function scan(vy: number): { u: TNode; v: TNode; t: TNode } {
    const { g, nodes } = graphOf(3, []);
    const [u, v, t] = nodes as [TNode, TNode, TNode];
    const set = (n: TNode, x: number, y: number, w: number): void => {
      n.getPosition().x = x;
      n.getPosition().y = y;
      n.getSize().x = w;
      n.getSize().y = SIZE;
    };
    set(u, 0, 50, 10);
    set(v, 2, vy, 2);
    set(t, 3, 100, 3);
    g.setProperty(MrTreeOptions.DIRECTION, Direction.DOWN);
    new CompactionProcessor().computeNodeConstraints(g, 5);
    return { u, v, t };
  }

  it('records the node directly above as a constraint when no two nodes compare equal', () => {
    const { u, v, t } = scan(60);
    expect(u.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([]);
    expect(v.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([u]);
    expect(t.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([v]);
  });

  it('add of a node that compares 0 to a member is a no-op and its removal evicts that member, losing the constraint of t', () => {
    // v compares equal to u (same y): add(v) fails, remove(v) at v's end removes u while t still needs it
    const { u, v, t } = scan(50);
    expect(u.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([]);
    expect(v.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([]);
    expect(t.getProperty(InternalProperties.COMPACT_CONSTRAINTS)).toEqual([]);
  });

  it('getRightElement throws a NullPointerException (a TypeError, D10) when the tail set has no second element', () => {
    const { g, nodes } = graphOf(1, []);
    const set = new TreeSet<TNode>((x, y) => x.getPosition().y - y.getPosition().y);
    set.add(nodes[0]!);
    expect(g.getNodes().size()).toBe(1);
    expect(() => new CompactionProcessor().getRightElement(set, nodes[0]!)).toThrow(TypeError);
    expect(() => new CompactionProcessor().getRightElement(new TreeSet<TNode>(() => 0), nodes[0]!)).toThrow(TypeError);
  });
});

describe('getLowestDependentNode (CompactionProcessor.java:306-339)', () => {
  function constrained(positions: readonly (readonly [number, number])[]): { n: TNode; cons: TNode[] } {
    const { nodes } = graphOf(positions.length + 1, []);
    const [n, ...cons] = nodes as [TNode, ...TNode[]];
    cons.forEach((x, i) => {
      x.getPosition().x = positions[i]![0];
      x.getPosition().y = positions[i]![1];
      x.getSize().x = SIZE;
      x.getSize().y = SIZE;
    });
    n.setProperty(InternalProperties.COMPACT_CONSTRAINTS, cons);
    return { n, cons };
  }
  const processor = new CompactionProcessor();

  it('is null without constraints and the only constraint when there is one', () => {
    const none = constrained([]);
    expect(processor.getLowestDependentNode(none.n, Direction.DOWN)).toBeNull();
    const one = constrained([[3, 4]]);
    expect(processor.getLowestDependentNode(one.n, Direction.DOWN)).toBe(one.cons[0]);
  });

  it.each([
    { dir: Direction.LEFT, pick: 1, note: 'the smallest x (min)' },
    { dir: Direction.RIGHT, pick: 0, note: 'the largest x + width (max)' },
    { dir: Direction.UP, pick: 2, note: 'the smallest y (min)' },
    { dir: Direction.DOWN, pick: 1, note: 'the largest y + height (max)' },
  ])('$dir picks $note', ({ dir, pick }) => {
    const { n, cons } = constrained([
      [50, 10],
      [5, 90],
      [20, 1],
    ]);
    expect(processor.getLowestDependentNode(n, dir)).toBe(cons[pick]);
  });

  it.each([Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN])(
    '%s: the first of equal candidates wins a tie',
    (dir) => {
      const { n, cons } = constrained([
        [10, 10],
        [10, 10],
      ]);
      expect(processor.getLowestDependentNode(n, dir)).toBe(cons[0]);
    },
  );

  it('is null for an UNDEFINED direction with several constraints (no switch case)', () => {
    const { n } = constrained([
      [1, 1],
      [2, 2],
    ]);
    expect(processor.getLowestDependentNode(n, Direction.UNDEFINED)).toBeNull();
  });
});
