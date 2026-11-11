// SPDX-License-Identifier: EPL-2.0
// Proof of NodeOrderer (mission 8a, T12): `process` from the recorded LevelProcessor stop to the recorded NodeOrderer stop for every
// component of every stops row (all four weightings, position constraints in range and out of range), the phase configuration, and
// Java-traced hand cases for the monitor calls and the missing-root failure (L4: expectations from the rows and the Java source).
import { describe, expect, it } from 'vitest';
import { compareStop, dumpStop, formatDifferences } from '../../../../test/helpers/mrtree-replay-dump.js';
import { loadStopsRows, transitionsOfStep } from '../../../../test/helpers/mrtree-replay-rows.js';
import { buildBeforeGraphs } from '../../../../test/helpers/mrtree-replay-state.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { OrderWeighting } from '../options/OrderWeighting.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { NodeOrderer } from './NodeOrderer.js';

const STEP = 'NodeOrderer';
const rows = loadStopsRows();

class RecordingMonitor extends NullElkProgressMonitor {
  readonly calls: string[] = [];
  override begin(name: string, totalWork: number): boolean {
    this.calls.push(`begin ${name} ${String(totalWork)}`);
    return super.begin(name, totalWork);
  }
  override done(): void {
    this.calls.push('done');
  }
  override log(object: unknown): void {
    this.calls.push(`log ${String(object)}`);
  }
}

describe('NodeOrderer.process against the recorded stops (acceptance)', () => {
  it(
    'equals the NodeOrderer stop of every component of every row, from the LevelProcessor stop',
    { timeout: 60_000 },
    () => {
      const transitions = transitionsOfStep(STEP);
      expect(transitions.length).toBeGreaterThan(50);
      const weightings = new Set<OrderWeighting>();
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
        weightings.add(graph.getProperty(MrTreeOptions.WEIGHTING));
        new NodeOrderer().process(graph, new NullElkProgressMonitor());
        expect(formatDifferences(compareStop(transition.stop, dumpStop(STEP, transition.comp, [graph]))), rowId).toBe(
          '',
        );
      }
      expect(skipped).toBe(0);
      expect([...weightings].map((w) => w.toString()).sort()).toEqual([
        'CONSTRAINT',
        'DESCENDANTS',
        'FAN',
        'MODEL_ORDER',
      ]);
    },
  );
});

describe('NodeOrderer hand cases (NodeOrderer.java:65-100)', () => {
  /** A root with two leaf children, FAN set as FanProcessor would leave it. */
  function smallGraph(weighting: OrderWeighting, debug: boolean): TGraph {
    const g = new TGraph();
    g.setProperty(MrTreeOptions.WEIGHTING, weighting);
    g.setProperty(MrTreeOptions.DEBUG_MODE, debug);
    const nodes = [0, 1, 2].map((i) => new TNode(i, g, `n${String(i)}`));
    nodes.forEach((n) => g.getNodes().add(n));
    nodes[0]!.addChild(nodes[1]!);
    nodes[0]!.addChild(nodes[2]!);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    nodes[0]!.setProperty(InternalProperties.FAN, 2);
    nodes[0]!.setProperty(InternalProperties.DESCENDANTS, 2);
    return g;
  }

  it('throws NoSuchElementException (Optional.get) when no node is a root', () => {
    const g = new TGraph();
    g.getNodes().add(new TNode(0, g, 'n0'));
    expect(() => new NodeOrderer().process(g, new NullElkProgressMonitor())).toThrow(NoSuchElementException);
    expect(() => new NodeOrderer().process(g, new NullElkProgressMonitor())).toThrow('No value present');
  });

  it.each([
    [
      OrderWeighting.FAN,
      [
        'begin Processor arrange node 1',
        'begin Processor arrange level 1',
        'begin Processor arrange level 1',
        'done',
        'done',
        'done',
      ],
    ],
    [
      OrderWeighting.DESCENDANTS,
      [
        'begin Processor arrange node 1',
        'begin Processor arrange level 1',
        'begin Processor arrange level 1',
        'done',
        'done',
        'done',
      ],
    ],
    [
      OrderWeighting.CONSTRAINT,
      [
        'begin Processor arrange node 1',
        'begin Processor arrange level 1',
        'begin Processor arrange level 1',
        'done',
        'done',
        'done',
      ],
    ],
    [OrderWeighting.MODEL_ORDER, ['begin Processor arrange node 1', 'done']],
  ])('calls the monitor for weighting %s as the Java does', (weighting, expected) => {
    const monitor = new RecordingMonitor();
    new NodeOrderer().process(smallGraph(weighting, false), monitor);
    expect(monitor.calls).toEqual(expected);
  });

  it('logs "NodeOrderer!" in debug mode and "OrderLevelConstraint!" per constraint level', () => {
    const fan = new RecordingMonitor();
    new NodeOrderer().process(smallGraph(OrderWeighting.FAN, true), fan);
    expect(fan.calls.filter((c) => c.startsWith('log'))).toEqual(['log NodeOrderer!']);
    const constraint = new RecordingMonitor();
    new NodeOrderer().process(smallGraph(OrderWeighting.CONSTRAINT, true), constraint);
    // root level, then the level of the root's two children (the root has FAN 2)
    expect(constraint.calls.filter((c) => c.startsWith('log'))).toEqual([
      'log NodeOrderer!',
      'log OrderLevelConstraint!',
      'log OrderLevelConstraint!',
    ]);
  });

  it('CONSTRAINT: two children with the same in-bound constraint take the next free slots (priority 2), by the Java loop', () => {
    const g = smallGraph(OrderWeighting.CONSTRAINT, false);
    const [, a, b] = [...g.getNodes()];
    a!.setProperty(MrTreeOptions.POSITION_CONSTRAINT, 1);
    b!.setProperty(MrTreeOptions.POSITION_CONSTRAINT, 1);
    new NodeOrderer().process(g, new NullElkProgressMonitor());
    // level size 2: a takes slot 1 (priority 1), b finds slot 1 taken, then j=1 gives 2 (out of range) and 0
    expect([a!, b!].map((n) => n.getProperty(InternalProperties.POSITION))).toEqual([1, 0]);
    expect(
      [...g.getNodes()][0]!
        .getOutgoingEdges()
        .toArray()
        .map((e) => e.getTarget()),
    ).toEqual([b, a]);
  });
});

describe('NodeOrderer CONSTRAINT priorities 2 and 3 (NodeOrderer.java:193-244), traced by hand from the Java loops', () => {
  /** A root over three leaf children with the given position constraints; returns the POSITION of each child. */
  function positionsFor(constraints: [number, number, number]): number[] {
    const g = new TGraph();
    g.setProperty(MrTreeOptions.WEIGHTING, OrderWeighting.CONSTRAINT);
    const nodes = [0, 1, 2, 3].map((i) => new TNode(i, g, `n${String(i)}`));
    nodes.forEach((n) => g.getNodes().add(n));
    for (const child of nodes.slice(1)) {
      nodes[0]!.addChild(child);
    }
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    nodes[0]!.setProperty(InternalProperties.FAN, 3);
    constraints.forEach((c, i) => nodes[i + 1]!.setProperty(MrTreeOptions.POSITION_CONSTRAINT, c));
    new NodeOrderer().process(g, new NullElkProgressMonitor());
    return nodes.slice(1).map((n) => n.getProperty(InternalProperties.POSITION));
  }

  it('three equal in-bound constraints: the first keeps slot 1, the second takes slot 2 (targetPos + j), the third slot 0 (targetPos - j)', () => {
    expect(positionsFor([1, 1, 1])).toEqual([1, 2, 0]);
  });

  it('out-of-bound constraints fill the free slots from the end, the largest constraint last', () => {
    // 7, 9, 99 are all >= level size 3: sorted descending 99, 9, 7 go to slots 2, 1, 0
    expect(positionsFor([7, 9, 99])).toEqual([0, 1, 2]);
  });

  it('an unconstrained node fills the remaining slot after in-bound and out-of-bound ones', () => {
    // 2 is in bound and takes slot 2; 9 is out of bound and takes the last free slot (1); the undefined (-1) node gets slot 0
    expect(positionsFor([2, 9, -1])).toEqual([2, 1, 0]);
  });
});

describe('NodeOrderer.getLayoutProcessorConfiguration (NodeOrderer.java:53-58)', () => {
  it('asks for ROOT_PROC, FAN_PROC and LEVEL_PROC before phase 2 only, the same object for every graph', () => {
    const config = new NodeOrderer().getLayoutProcessorConfiguration(new TGraph());
    expect([...config.processorsBefore(TreeLayoutPhases.P2_NODE_ORDERING)]).toEqual([
      IntermediateProcessorStrategy.ROOT_PROC,
      IntermediateProcessorStrategy.FAN_PROC,
      IntermediateProcessorStrategy.LEVEL_PROC,
    ]);
    for (const phase of TreeLayoutPhases.values()) {
      // the Java configuration keeps one slot per phase boundary: "after P1" is the slot "before P2"
      expect(config.processorsAfter(phase).size).toBe(phase === TreeLayoutPhases.P1_TREEIFICATION ? 3 : 0);
      expect(config.processorsBefore(phase).size).toBe(phase === TreeLayoutPhases.P2_NODE_ORDERING ? 3 : 0);
    }
    expect(new NodeOrderer().getLayoutProcessorConfiguration(new TGraph())).toBe(config);
  });
});
