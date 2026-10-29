// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { GreedyModelOrderCycleBreaker } from './GreedyModelOrderCycleBreaker.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/GreedyModelOrderCycleBreaker/';
const STRATEGY = 'GREEDY_MODEL_ORDER';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', STRATEGY]);
      return CycleBreakingStrategy.GREEDY_MODEL_ORDER.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('GreedyModelOrderCycleBreaker on the oracle rows', () => {
  it('has the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(
      ['cycle', 'chain', 'enforced-groups'].map((name) => `${ROW_PREFIX}${name}`),
    );
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('creates the class through its strategy arm', () => {
    expect(CycleBreakingStrategy.GREEDY_MODEL_ORDER.create()).toBeInstanceOf(GreedyModelOrderCycleBreaker);
  });
});

describe('GreedyModelOrderCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new GreedyModelOrderCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

describe('GreedyModelOrderCycleBreaker on the site row', () => {
  it('dummies without MODEL_ORDER are skipped and the fallback picks the node', () => {
    // oracle: sites/GroupModelOrder/cycleBreakers/GREEDY_MODEL_ORDER; GreedyModelOrderCycleBreaker.java:45 (node without MODEL_ORDER skipped), :55 (fallback to the max-outflow choice)
    const row = loadRows(ROWS_FILE).find(
      (candidate) => candidate.id === 'sites/GroupModelOrder/cycleBreakers/GREEDY_MODEL_ORDER',
    )!;
    const actual = replay(row);
    expect(actual.edges.filter((edge) => edge.reversed).map((edge) => edge.path)).toEqual([
      'g0/e1',
      'g0/e3',
      'g0/e5',
      'g0/e11',
      'g0/e15',
    ]);
    expect(
      actual.changed
        .filter((entry) => entry.props.reversed !== undefined)
        .map((entry) => entry.path)
        .sort(),
    ).toEqual(['g0/e1', 'g0/e3', 'g0/e5', 'g0/e11', 'g0/e15'].sort());
    expect(actual.changed.some((entry) => entry.path === 'g0' && entry.props.cyclic !== undefined)).toBe(true);
  });
});
