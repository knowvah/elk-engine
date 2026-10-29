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
import { GreedyCycleBreaker } from './GreedyCycleBreaker.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/GreedyCycleBreaker/';
const TIE_ROW = `${ROW_PREFIX}tie`;
const RANDOM_SEED_ID = 'org.eclipse.elk.randomSeed';
/**
 * Seeds 1 and 2 pick the same nodes on the tie row (`new Random(s).nextInt(4)` and `nextInt(2)` coincide for adjacent
 * seeds); seed 3 is the smallest seed whose draws pick the other node of a pair.
 */
const OTHER_SEED = 3;
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', 'GREEDY']);
      return CycleBreakingStrategy.GREEDY.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('GreedyCycleBreaker on the oracle rows', () => {
  it('has the cycle, chain and tie rows', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}cycle`, `${ROW_PREFIX}chain`, TIE_ROW]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('the tie row differs under another random seed: the seeded Random shim decides the tie', () => {
    const tie = rows.find((row) => row.id === TIE_ROW)!;
    const reseeded: PhaseRow = { ...tie, options: { ...tie.options, [RANDOM_SEED_ID]: OTHER_SEED } };
    expect(compareExpected(replay(reseeded), tie.expected).length).toBeGreaterThan(0);
  });
});

describe('GreedyCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new GreedyCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});
