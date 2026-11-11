// SPDX-License-Identifier: EPL-2.0
// Proof of OrderBalance (mission 8a, T12). No whole-pipeline ref row runs this phase: the assembler never selects it (only the
// NodeOrderer is the P2 factory; nothing in the bundle references OrderBalance). Its expected values are the `orderBalance` group of
// test/golden/refs/java/mrtree-units.json (tools/vectors/MrTreeUnitVectors.java): the oracle's own RootProcessor, FanProcessor,
// LevelProcessor and NeighborsProcessor run over six seeded random trees (java.util.Random(12)), then OrderBalance.process. A row
// holds the properties the phase reads after those four processors ([FAN, DESCENDANTS, LEFTNEIGHBOR, RIGHTNEIGHBOR] per node,
// -1 = null), the resulting children order of every node and whether the four neighbor and sibling properties are null afterwards
// (OrderBalance.java:99-106).
import { describe, expect, it } from 'vitest';
import {
  buildOrderBalanceGraph,
  ORDER_BALANCE_GROUP,
  unitRowsOf,
  type OrderBalanceRow,
} from '../../../../test/helpers/mrtree-unit-vectors.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { OrderWeighting } from '../options/OrderWeighting.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { OrderBalance } from './OrderBalance.js';

type Row = OrderBalanceRow;

const ROWS = unitRowsOf<Row['input'], Row['expected']>(ORDER_BALANCE_GROUP) as Row[];

/** The state the recorder read before the phase: `buildOrderBalanceGraph` over a row. */
function build(row: Row): { g: TGraph; nodes: readonly TNode[] } {
  const { graph, nodes } = buildOrderBalanceGraph(row.input, row.expected);
  return { g: graph, nodes };
}

const childIndices = (node: TNode, nodes: readonly TNode[]): number[] =>
  node
    .getOutgoingEdges()
    .toArray()
    .map((e) => nodes.indexOf(e.getTarget()!));

describe('OrderBalance.process against the JVM (OrderBalance.java:70-135, 150-205)', () => {
  it.each(ROWS.map((r) => [r.id, r] as const))(
    'reorders the children of every level like the oracle: %s',
    (_id, row) => {
      const { g, nodes } = build(row);
      new OrderBalance().process(g, new NullElkProgressMonitor());
      expect(nodes.map((n) => childIndices(n, nodes))).toEqual(row.expected.out);
      expect(row.expected.reset).toBe(true);
      for (const node of nodes) {
        expect(node.getProperty(InternalProperties.LEFTNEIGHBOR)).toBeNull();
        expect(node.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBeNull();
        expect(node.getProperty(InternalProperties.LEFTSIBLING)).toBeNull();
        expect(node.getProperty(InternalProperties.RIGHTSIBLING)).toBeNull();
      }
    },
  );

  it('covers all three weightings, 18 rows, balanced lists with leaves and trees deeper than three levels', () => {
    expect(ROWS.length).toBe(18);
    expect(new Set(ROWS.map((r) => r.input.weighting))).toEqual(new Set(['FAN', 'DESCENDANTS', 'MODEL_ORDER']));
    expect(
      ROWS.some((r) =>
        r.expected.out.some(
          (o, i) =>
            o.length > 1 && o.join() !== r.input.parents.flatMap((p, k) => (k > 0 && p === i ? [k] : [])).join(),
        ),
      ),
    ).toBe(true);
  });

  it('leaves a graph without a root untouched (the root null test)', () => {
    const g = new TGraph();
    const a = new TNode(0, g, 'a');
    const b = new TNode(1, g, 'b');
    g.getNodes().add(a);
    g.getNodes().add(b);
    a.addChild(b);
    a.setProperty(InternalProperties.RIGHTNEIGHBOR, b);
    new OrderBalance().process(g, new NullElkProgressMonitor());
    expect(a.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(b);
    expect(childIndices(a, [a, b])).toEqual([1]);
  });

  it('does nothing for a root with no children or with one level of children (leftmost parent is the root)', () => {
    const single = build({
      id: 'hand/single',
      group: 'orderBalance',
      input: { parents: [0], weighting: 'FAN' },
      expected: { props: [[0, 1, -1, -1]], out: [[]], reset: true },
    });
    single.nodes[0]!.setProperty(InternalProperties.RIGHTNEIGHBOR, single.nodes[0]!);
    new OrderBalance().process(single.g, new NullElkProgressMonitor());
    expect(single.nodes[0]!.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(single.nodes[0]);
    const flat = build({
      id: 'hand/flat',
      group: 'orderBalance',
      input: { parents: [0, 0, 0], weighting: 'FAN' },
      expected: {
        props: [
          [2, 3, -1, -1],
          [0, 1, -1, 2],
          [0, 1, 1, -1],
        ],
        out: [[1, 2], [], []],
        reset: true,
      },
    });
    new OrderBalance().process(flat.g, new NullElkProgressMonitor());
    expect(childIndices(flat.nodes[0]!, flat.nodes)).toEqual([1, 2]);
    expect(flat.nodes[1]!.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(flat.nodes[2]);
  });

  it('logs "OrderBalance!" in debug mode and does not call done() (OrderBalance.java:70-85, kept)', () => {
    const calls: string[] = [];
    const monitor = new (class extends NullElkProgressMonitor {
      override begin(name: string, totalWork: number): boolean {
        calls.push(`begin ${name} ${String(totalWork)}`);
        return true;
      }
      override done(): void {
        calls.push('done');
      }
      override log(object: unknown): void {
        calls.push(`log ${String(object)}`);
      }
    })();
    const g = new TGraph();
    g.setProperty(MrTreeOptions.DEBUG_MODE, true);
    new OrderBalance().process(g, monitor);
    expect(calls).toEqual(['begin Processor arrange node 1', 'log OrderBalance!']);
  });

  it('SortTEdgeTargetProperty compares target property values as t2 - t1 (descending, int subtraction)', () => {
    const g = new TGraph();
    const [p, x, y] = [0, 1, 2].map((i) => new TNode(i, g, `n${String(i)}`)) as [TNode, TNode, TNode];
    p.addChild(x);
    p.addChild(y);
    x.setProperty(InternalProperties.FAN, 2);
    y.setProperty(InternalProperties.FAN, 5);
    const [ex, ey] = p.getOutgoingEdges().toArray() as [never, never];
    const comparator = new OrderBalance.SortTEdgeTargetProperty(InternalProperties.FAN);
    expect(comparator.compare(ex, ey)).toBe(3);
    expect(comparator.compare(ey, ex)).toBe(-3);
    expect(comparator.compare(ex, ex)).toBe(0);
  });
});

describe('OrderBalance.getLayoutProcessorConfiguration (OrderBalance.java:55-60)', () => {
  it('asks for ROOT_PROC, FAN_PROC and NEIGHBORS_PROC before phase 2, the same object for every graph', () => {
    const config = new OrderBalance().getLayoutProcessorConfiguration(new TGraph());
    expect([...config.processorsBefore(TreeLayoutPhases.P2_NODE_ORDERING)]).toEqual([
      IntermediateProcessorStrategy.ROOT_PROC,
      IntermediateProcessorStrategy.FAN_PROC,
      IntermediateProcessorStrategy.NEIGHBORS_PROC,
    ]);
    expect(new OrderBalance().getLayoutProcessorConfiguration(new TGraph())).toBe(config);
  });
});
