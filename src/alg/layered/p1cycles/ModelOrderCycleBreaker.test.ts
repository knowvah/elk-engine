// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { ModelOrderCycleBreaker } from './ModelOrderCycleBreaker.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/ModelOrderCycleBreaker/';
const STRATEGY = 'MODEL_ORDER';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', STRATEGY]);
      return CycleBreakingStrategy.MODEL_ORDER.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('ModelOrderCycleBreaker on the oracle rows', () => {
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
    expect(CycleBreakingStrategy.MODEL_ORDER.create()).toBeInstanceOf(ModelOrderCycleBreaker);
  });
});

describe('ModelOrderCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new ModelOrderCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

/**
 * A nested graph under `hierarchyHandling: INCLUDE_CHILDREN` never gets `MAX_MODEL_ORDER_NODES`
 * (`ElkGraphImporter.java:385` sets it on the top-level graph only), so `ModelOrderCycleBreaker.java:70` unboxes null.
 * The expected message is the oracle's at `e7eaea57`, from the sweep row of
 * `native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking` (verdict `throws`,
 * `java.lang.NullPointerException`; mission ts-parity-dashboard, T6). A NullPointerException is a `TypeError` in the port.
 * Since eclipse-elk/elk#1241 the importer refuses that configuration first (`ensureNoModelOrderStrategies`,
 * `NestedModelOrderConfigurationTest`); the processor itself is unchanged and still unboxes null when called on such a graph.
 */
describe('ModelOrderCycleBreaker on a graph without MAX_MODEL_ORDER_NODES', () => {
  const ORACLE_MESSAGE =
    'Cannot invoke "java.lang.Integer.intValue()" because the return value of ' +
    '"org.eclipse.elk.alg.layered.graph.LGraph.getProperty(org.eclipse.elk.graph.properties.IProperty)" is null';

  it('throws the unboxing NullPointerException of the oracle', () => {
    const graph = new LGraph();
    expect(graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES)).toBeNull();
    let thrown: unknown;
    try {
      new ModelOrderCycleBreaker().process(graph, new NullElkProgressMonitor());
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as TypeError).message).toBe(ORACLE_MESSAGE);
  });
});
