// SPDX-License-Identifier: EPL-2.0
// Proof of NoCrossingMinimizer (mission 7c, T7): every row of layered-order.json whose last step runs
// `P3_NODE_ORDERING NONE`, replayed through `CrossingMinimizationStrategy.NONE.create()`, plus the five greedy-switch
// rows that run it before the processor under test. Expectations come only from the rows and the Java (L4).
import { describe, expect, it, vi } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { NoCrossingMinimizer } from './NoCrossingMinimizer.js';
import { GREEDY_SWITCH_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const ROW_NAMES: readonly string[] = [
  'scenarios/None/crossing',
  'scenarios/None/long-edges',
  'scenarios/None/external-ports',
  'scenarios/None/north-south',
];

const rows = loadOrderRows(ROWS_FILE).filter((row) => {
  const last = row.steps?.filter(([op]) => op === 'runPhase').at(-1);
  return last !== undefined && last[2] === 'NONE' && row.steps!.at(-2)?.[0] === 'runPhase';
});

describe('NoCrossingMinimizer (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual([...ROW_NAMES]);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = runSteps(row, GREEDY_SWITCH_FACTORIES);
    const actual = orderDump(graph, importRow(row).importDump);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    expect(compareOrderFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
  });

  it('leaves the graph exactly as the phase before it left it', () => {
    // oracle: scenarios/None/crossing; NoCrossingMinimizer.java:42-46 only opens and closes its monitor
    const row = rows.find((candidate) => candidate.id === 'scenarios/None/crossing')!;
    const before = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, GREEDY_SWITCH_FACTORIES);
    const beforeDump = orderDump(before, importRow(row).importDump);
    expect(compareOrder(beforeDump, row.expected)).toEqual([]);
  });
});

describe('NoCrossingMinimizer', () => {
  const names = (set: Set<{ create(): unknown }>): string[] =>
    [...set].map((factory) => (factory as unknown as { name(): string }).name());

  it('configures P3 as Java does and copies the shared configuration (NoCrossingMinimizer.java:49-67)', () => {
    const phase = new NoCrossingMinimizer();
    const configuration = phase.getLayoutProcessorConfiguration(new LGraph());
    expect(names(configuration.processorsBefore(LayeredPhases.P3_NODE_ORDERING))).toEqual([
      'LONG_EDGE_SPLITTER',
      'PORT_LIST_SORTER',
    ]);
    expect(names(configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT))).toEqual([
      'IN_LAYER_CONSTRAINT_PROCESSOR',
    ]);
    expect(names(configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING))).toEqual(['LONG_EDGE_JOINER']);
    const again = phase.getLayoutProcessorConfiguration(new LGraph());
    expect(again).not.toBe(configuration);
    expect(again.processorsBefore(LayeredPhases.P3_NODE_ORDERING).size).toBe(2);
  });

  it('names its task and finishes it', () => {
    const monitor = new NullElkProgressMonitor();
    const begin = vi.spyOn(monitor, 'begin');
    const done = vi.spyOn(monitor, 'done');
    new NoCrossingMinimizer().process(new LGraph(), monitor);
    expect(begin).toHaveBeenCalledWith('No crossing minimization', 1);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
