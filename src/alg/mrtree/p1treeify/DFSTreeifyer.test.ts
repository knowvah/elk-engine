// SPDX-License-Identifier: EPL-2.0
// Proof of DFSTreeifyer (mission 8a, T9): `process` from the recorded split component to the recorded DFSTreeifyer stop, for DFS and BFS rows
// (cyclic, multi-root and multi-parent inputs; BFS leaving a node with two parents is oracle behaviour), plus the phase configuration and
// Java-traced hand cases for what the rows do not distinguish (L4: expectations from the rows and the Java source).
import { describe, expect, it } from 'vitest';
import { compareStop, dumpStop, formatDifferences } from '../../../../test/helpers/mrtree-replay-dump.js';
import { loadStopsRows, transitionsOfStep } from '../../../../test/helpers/mrtree-replay-rows.js';
import { buildBeforeGraphs } from '../../../../test/helpers/mrtree-replay-state.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { TEdge } from '../graph/TEdge.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeifyingOrder } from '../options/TreeifyingOrder.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { DFSTreeifyer } from './DFSTreeifyer.js';

const STEP = 'DFSTreeifyer';
const rows = loadStopsRows();

describe('DFSTreeifyer.process against the recorded stops (acceptance)', () => {
  it('equals the DFSTreeifyer stop of every component of every row, for DFS and BFS, from the split graph', () => {
    const transitions = transitionsOfStep(STEP);
    expect(transitions.length).toBeGreaterThan(54);
    const orders = new Set<TreeifyingOrder>();
    let withRemoved = 0;
    for (const { rowId, transition } of transitions) {
      const built = buildBeforeGraphs(
        rows.find((r) => r.id === rowId)!,
        transition,
      );
      expect(built, `${rowId} comp ${String(transition.comp)} rebuilds`).not.toBeNull();
      const graph = built!.graphs[0]!;
      orders.add(graph.getProperty(MrTreeOptions.SEARCH_ORDER));
      new DFSTreeifyer().process(graph, new NullElkProgressMonitor());
      if (graph.getProperty(InternalProperties.REMOVABLE_EDGES).size() > 0) {
        withRemoved++;
      }
      expect(formatDifferences(compareStop(transition.stop, dumpStop(STEP, transition.comp, [graph]))), rowId).toBe('');
    }
    expect([...orders].map((o) => o.toString()).sort()).toEqual(['BFS', 'DFS']);
    expect(withRemoved).toBeGreaterThan(0);
  });
});

describe('DFSTreeifyer hand cases (DFSTreeifyer.java:62-192)', () => {
  /** A graph of `n` nodes labelled n0..; `edges` are index pairs; ids start scrambled so that `init` is visible. */
  function graphOf(
    n: number,
    edges: [number, number][],
    order: TreeifyingOrder,
  ): { g: TGraph; nodes: TNode[]; es: TEdge[] } {
    const g = new TGraph();
    g.setProperty(MrTreeOptions.SEARCH_ORDER, order);
    const nodes = Array.from({ length: n }, (_, i) => new TNode(99 - i, g, `n${String(i)}`));
    nodes.forEach((node) => g.getNodes().add(node));
    const es = edges.map(([s, t]) => {
      const e = new TEdge(nodes[s]!, nodes[t]!);
      nodes[s]!.getOutgoingEdges().add(e);
      nodes[t]!.getIncomingEdges().add(e);
      g.getEdges().add(e);
      return e;
    });
    return { g, nodes, es };
  }
  const run = (g: TGraph): TEdge[] => {
    new DFSTreeifyer().process(g, new NullElkProgressMonitor());
    return [...g.getProperty(InternalProperties.REMOVABLE_EDGES)];
  };

  it('renumbers the ids in graph order and removes the back edge of a cycle from both edge lists (DFS)', () => {
    const { g, nodes, es } = graphOf(
      3,
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
      TreeifyingOrder.DFS,
    );
    expect(run(g)).toEqual([es[2]]);
    expect(nodes.map((n) => n.id)).toEqual([0, 1, 2]);
    expect([...nodes[2]!.getOutgoingEdges()]).toEqual([]);
    expect([...nodes[0]!.getIncomingEdges()]).toEqual([]);
    expect([...nodes[1]!.getIncomingEdges()]).toEqual([es[0]]);
  });

  it('a start node reached from a later start node loses its root mark and no edge is removed', () => {
    // n1 -> n0: the search from n0 ends with n0 marked 2 (root); the search from n1 meets it, unmarks it and removes nothing
    const { g, nodes } = graphOf(2, [[1, 0]], TreeifyingOrder.DFS);
    expect(run(g)).toEqual([]);
    expect([...nodes[0]!.getIncomingEdges()]).toHaveLength(1);
  });

  it.each([TreeifyingOrder.DFS, TreeifyingOrder.BFS])(
    'the root mark is removed once: a second later start node reaching it finds visited 1 and its edge is removed (%s)',
    (order) => {
      // n1 -> n0, n2 -> n0: n0 is marked 2 after its own search, the search from n1 sets it to 1, the one from n2 eliminates n2 -> n0
      const { g, nodes, es } = graphOf(
        3,
        [
          [1, 0],
          [2, 0],
        ],
        order,
      );
      expect(run(g)).toEqual([es[1]]);
      expect([...nodes[0]!.getIncomingEdges()]).toEqual([es[0]]);
    },
  );

  it('an inner node reached again from a later start node (visited 1) has that edge removed', () => {
    // n0 -> n1, n2 -> n1: after the search from n0, n1 is marked 1; the search from n2 sees visited 1 and eliminates n2 -> n1
    const { g, nodes, es } = graphOf(
      3,
      [
        [0, 1],
        [2, 1],
      ],
      TreeifyingOrder.DFS,
    );
    expect(run(g)).toEqual([es[1]]);
    expect([...nodes[1]!.getIncomingEdges()]).toEqual([es[0]]);
  });

  it('BFS marks a node when it is dequeued, so a diamond keeps both parents of the sink (oracle behaviour) and a cycle edge is removed', () => {
    const diamond = graphOf(
      4,
      [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ],
      TreeifyingOrder.BFS,
    );
    expect(run(diamond.g)).toEqual([]);
    expect([...diamond.nodes[3]!.getIncomingEdges()]).toHaveLength(2);
    const cycle = graphOf(
      3,
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
      TreeifyingOrder.BFS,
    );
    expect(run(cycle.g)).toEqual([cycle.es[2]]);
  });

  it('starts one search per unvisited node and leaves the graph unchanged when it is already a tree', () => {
    const { g, es } = graphOf(
      4,
      [
        [0, 1],
        [2, 3],
      ],
      TreeifyingOrder.DFS,
    );
    expect(run(g)).toEqual([]);
    expect([...g.getEdges()]).toEqual(es);
  });

  it('keeps a self-loop out of the tree: visited[target] is 1 for the node itself', () => {
    const { g, nodes, es } = graphOf(1, [[0, 0]], TreeifyingOrder.DFS);
    expect(run(g)).toEqual([es[0]]);
    expect([...nodes[0]!.getOutgoingEdges()]).toEqual([]);
  });

  it('reports the monitor calls begin("DFS Treeifying phase", 1) and done()', () => {
    const calls: string[] = [];
    const monitor = new (class extends NullElkProgressMonitor {
      override begin(name: string, totalWork: number): boolean {
        calls.push(`begin ${name} ${String(totalWork)}`);
        return super.begin(name, totalWork);
      }
      override done(): void {
        calls.push('done');
      }
    })();
    new DFSTreeifyer().process(graphOf(1, [], TreeifyingOrder.DFS).g, monitor);
    expect(calls).toEqual(['begin DFS Treeifying phase 1', 'done']);
  });
});

describe('DFSTreeifyer.getLayoutProcessorConfiguration (DFSTreeifyer.java:45-50)', () => {
  it('asks for the DETREEIFYING_PROC after phase 3 only, the same object for every graph', () => {
    const config = new DFSTreeifyer().getLayoutProcessorConfiguration(new TGraph());
    expect([...config.processorsAfter(TreeLayoutPhases.P3_NODE_PLACEMENT)]).toEqual([
      IntermediateProcessorStrategy.DETREEIFYING_PROC,
    ]);
    for (const phase of TreeLayoutPhases.values()) {
      // `addAfter(P3)` is the slot before P4 (the Java LayoutProcessorConfiguration keeps one slot per phase boundary)
      expect(config.processorsBefore(phase).size).toBe(phase === TreeLayoutPhases.P4_EDGE_ROUTING ? 1 : 0);
      if (phase !== TreeLayoutPhases.P3_NODE_PLACEMENT) {
        expect(config.processorsAfter(phase).size).toBe(0);
      }
    }
    expect(new DFSTreeifyer().getLayoutProcessorConfiguration(new TGraph())).toBe(config);
  });
});
