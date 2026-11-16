// SPDX-License-Identifier: EPL-2.0
// Proof of NodePlacer (mission 8a, T12): `process` from the recorded LevelHeightProcessor/NeighborsProcessor stop to the recorded
// NodePlacer stop for every component of every stops row (all four directions), the two oracle failures inside it reproduced from the
// recorded state before them (StackOverflowError -> RangeError, NullPointerException -> TypeError), the phase configuration and
// Java-traced hand cases (L4: expectations from the rows and the Java source).
import { describe, expect, it } from 'vitest';
import { compareStop, dumpStop, formatDifferences } from '../../../../test/helpers/mrtree-replay-dump.js';
import { loadStopsRows, loadThrowsRows, transitionsOfStep } from '../../../../test/helpers/mrtree-replay-rows.js';
import { buildBeforeGraphs } from '../../../../test/helpers/mrtree-replay-state.js';
import { Direction } from '../../../core/options/Direction.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { NodePlacer } from './NodePlacer.js';

const STEP = 'NodePlacer';
const NPE_CLASS = 'java.lang.NullPointerException';
const rows = loadStopsRows();

describe('NodePlacer.process against the recorded stops (acceptance)', () => {
  it(
    'equals the NodePlacer stop of every component of every row, from the recorded state before it',
    { timeout: 60_000 },
    () => {
      const transitions = transitionsOfStep(STEP);
      expect(transitions.length).toBeGreaterThan(50);
      const directions = new Set<Direction>();
      let skipped = 0;
      for (const { rowId, transition } of transitions) {
        const built = buildBeforeGraphs(
          rows.find((r) => r.id === rowId)!,
          transition,
        );
        if (built === null) {
          skipped++;
          continue;
        }
        const graph = built.graphs[0]!;
        new NodePlacer().process(graph, new NullElkProgressMonitor());
        directions.add(graph.getProperty(MrTreeOptions.DIRECTION));
        expect(formatDifferences(compareStop(transition.stop, dumpStop(STEP, transition.comp, [graph]))), rowId).toBe(
          '',
        );
      }
      expect(skipped).toBe(0);
      // UNDEFINED is replaced by DOWN on the graph (NodePlacer.java:82-85)
      expect([...directions].map((d) => d.toString()).sort()).toEqual(['DOWN', 'LEFT', 'RIGHT', 'UP']);
    },
  );
});

describe('NodePlacer throws where the oracle throws', () => {
  it('the ref records one NodePlacer failure, a NullPointerException at NodePlacer.java:219, in a throws row without stops twin', () => {
    const placer = loadThrowsRows().filter((r) => r.expected.throws.frame?.startsWith('NodePlacer.java') === true);
    expect(placer.map((r) => [r.expected.throws.class, r.expected.throws.frame])).toEqual([
      [NPE_CLASS, 'NodePlacer.java:219'],
    ]);
    // no stops row stops inside the placer, so no recorded state precedes a throw: T17's whole-pipeline replay runs that row
    expect(rows.filter((row) => row.expected.throwsAt === STEP)).toEqual([]);
  });

  it('NullPointerException (NodePlacer.java:219) is a TypeError: a left neighbour on a shallower level has no grandparent', () => {
    // R -> A, B; B -> C -> D; D.LEFTNEIGHBOR = A (a multi-parent state). apportion(B): at depth 1 the move distance is
    // 0 + 0 + 20 + 10 - 0 - 30 = 0, so the loop goes on; at depth 2 A's parent R has no parent: ancestorNeighbor is null
    const g = new TGraph();
    const [r, a, b, c, d] = ['R', 'A', 'B', 'C', 'D'].map((label, i) => new TNode(i, g, label)) as [
      TNode,
      TNode,
      TNode,
      TNode,
      TNode,
    ];
    for (const n of [r, a, b, c, d]) {
      g.getNodes().add(n);
      n.getSize().x = 10;
    }
    r.addChild(a);
    r.addChild(b);
    b.addChild(c);
    c.addChild(d);
    r.setProperty(InternalProperties.ROOT, true);
    a.setProperty(InternalProperties.RIGHTSIBLING, b);
    b.setProperty(InternalProperties.LEFTSIBLING, a);
    d.setProperty(InternalProperties.LEFTNEIGHBOR, a);
    c.setProperty(InternalProperties.LEFTNEIGHBOR, a);
    expect(() => {
      new NodePlacer().process(g, new NullElkProgressMonitor());
    }).toThrow(TypeError);
  });

  it('StackOverflowError (NodePlacer.java:341, a node that is its own right sibling) is a RangeError', () => {
    const g = new TGraph();
    const [r, a] = ['R', 'A'].map((label, i) => new TNode(i, g, label)) as [TNode, TNode];
    g.getNodes().add(r);
    g.getNodes().add(a);
    r.addChild(a);
    r.setProperty(InternalProperties.ROOT, true);
    a.setProperty(InternalProperties.RIGHTSIBLING, a);
    expect(() => {
      new NodePlacer().process(g, new NullElkProgressMonitor());
    }).toThrow(RangeError);
  });
});

describe('NodePlacer hand cases (NodePlacer.java:75-345)', () => {
  /** A tree given by parent indices, children in index order; every node 10 wide and 6 high, each level 6 high. */
  function tree(
    parents: number[],
    direction: Direction = Direction.DOWN,
    spacing?: number,
  ): { g: TGraph; nodes: TNode[] } {
    const g = new TGraph();
    g.setProperty(MrTreeOptions.DIRECTION, direction);
    if (spacing !== undefined) {
      g.setProperty(MrTreeOptions.SPACING_NODE_NODE, spacing);
    }
    const nodes = parents.map((_, i) => {
      const node = new TNode(i, g, `n${String(i)}`);
      node.getSize().x = 10;
      node.getSize().y = 6;
      node.setProperty(InternalProperties.LEVELHEIGHT, 6);
      return node;
    });
    nodes.forEach((n) => g.getNodes().add(n));
    for (let i = 1; i < nodes.length; i++) {
      nodes[parents[i]!]!.addChild(nodes[i]!);
    }
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    // siblings: consecutive children of one parent
    for (let i = 1; i < nodes.length; i++) {
      for (let k = i + 1; k < nodes.length; k++) {
        if (parents[k] === parents[i]) {
          nodes[i]!.setProperty(InternalProperties.RIGHTSIBLING, nodes[k]!);
          nodes[k]!.setProperty(InternalProperties.LEFTSIBLING, nodes[i]!);
          break;
        }
      }
    }
    return { g, nodes };
  }
  const run = (g: TGraph): void => {
    new NodePlacer().process(g, new NullElkProgressMonitor());
  };

  it('a leaf is placed at x = 0 (prelim 0, modifier 0) and y = half its level height', () => {
    const { g, nodes } = tree([0]);
    run(g);
    expect([InternalProperties.XCOOR, InternalProperties.YCOOR].map((p) => nodes[0]!.getProperty(p))).toEqual([0, 0]);
    expect(nodes[0]!.getProperty(InternalProperties.MODIFIER)).toBe(0);
    expect(nodes[0]!.getProperty(InternalProperties.PRELIM)).toBe(0);
  });

  it('two sibling leaves are one node width plus the spacing apart; the parent sits at their midpoint, one level lower', () => {
    // prelim(second) = 0 + 20 + (5 + 5) = 30 (default spacing 20), the parent at (0 + 30) / 2 = 15
    const { g, nodes } = tree([0, 0, 0]);
    run(g);
    const xs = nodes.map((n) => n.getProperty(InternalProperties.XCOOR));
    const ys = nodes.map((n) => n.getProperty(InternalProperties.YCOOR));
    expect(xs).toEqual([15, 0, 30]);
    // root y = -6/2 + 3 = 0; children y = 0 - ... per secondWalk: (yTop - h/2) + h/2 = 0, then (-3) + 6 + 20 + 3 = 26
    expect(ys).toEqual([0, 26, 26]);
  });

  it('LEFT and RIGHT measure the mean node width with the heights (vertical direction false)', () => {
    const { g, nodes } = tree([0, 0, 0], Direction.LEFT, 4);
    run(g);
    // mean width 3 + 3 = 6, spacing 4: second child at 10, parent at 5
    expect(nodes.map((n) => n.getProperty(InternalProperties.XCOOR))).toEqual([5, 0, 10]);
  });

  it('UNDEFINED becomes DOWN on the graph and is used', () => {
    const { g } = tree([0, 0, 0], Direction.UNDEFINED);
    run(g);
    expect(g.getProperty(MrTreeOptions.DIRECTION)).toBe(Direction.DOWN);
  });

  it('throws NoSuchElementException when the graph has no root (LinkedList.getFirst)', () => {
    const g = new TGraph();
    g.getNodes().add(new TNode(0, g, 'n0'));
    expect(() => {
      run(g);
    }).toThrow(NoSuchElementException);
  });

  it('calls the monitor begin("Processor order nodes", 2), worked twice and done', () => {
    const calls: string[] = [];
    const monitor = new (class extends NullElkProgressMonitor {
      override begin(name: string, totalWork: number): boolean {
        calls.push(`begin ${name} ${String(totalWork)}`);
        return true;
      }
      override worked(work: number): void {
        calls.push(`worked ${String(work)}`);
      }
      override done(): void {
        calls.push('done');
      }
    })();
    new NodePlacer().process(tree([0]).g, monitor);
    expect(calls).toEqual(['begin Processor order nodes 2', 'worked 1', 'worked 1', 'done']);
  });
});

describe('NodePlacer.getLayoutProcessorConfiguration (NodePlacer.java:75-85)', () => {
  it('asks for ROOT_PROC before phase 2, LEVEL_HEIGHT and NEIGHBORS_PROC before phase 3, DIRECTION_PROC and NODE_POSITION_PROC before phase 4', () => {
    const config = new NodePlacer().getLayoutProcessorConfiguration(new TGraph());
    expect([...config.processorsBefore(TreeLayoutPhases.P2_NODE_ORDERING)]).toEqual([
      IntermediateProcessorStrategy.ROOT_PROC,
    ]);
    expect([...config.processorsBefore(TreeLayoutPhases.P3_NODE_PLACEMENT)]).toEqual([
      IntermediateProcessorStrategy.LEVEL_HEIGHT,
      IntermediateProcessorStrategy.NEIGHBORS_PROC,
    ]);
    expect([...config.processorsBefore(TreeLayoutPhases.P4_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.DIRECTION_PROC,
      IntermediateProcessorStrategy.NODE_POSITION_PROC,
    ]);
    expect(config.processorsBefore(TreeLayoutPhases.P1_TREEIFICATION).size).toBe(0);
    expect(new NodePlacer().getLayoutProcessorConfiguration(new TGraph())).toBe(config);
  });
});
