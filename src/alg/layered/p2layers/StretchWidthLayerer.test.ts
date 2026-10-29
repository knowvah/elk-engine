// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump, type Expected } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { StretchWidthLayerer } from './StretchWidthLayerer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/StretchWidthLayerer/';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

interface Replayed {
  readonly expected: Expected;
  readonly layerer: ILayoutPhase<LayeredPhases, LGraph>;
}

/** Interprets the row's steps with `createLayerer` as the P2 phase and dumps the result. */
function replay(row: PhaseRow, createLayerer: () => ILayoutPhase<LayeredPhases, LGraph>): Replayed {
  let layerer: ILayoutPhase<LayeredPhases, LGraph> | null = null;
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P2_LAYERING', 'STRETCH_WIDTH']);
      layerer = createLayerer();
      return layerer;
    },
  };
  const graph = runSteps(row, factories);
  const dump = phaseDump(graph, importRow(row).importDump);
  return { expected: { ...dump, dump: dumpLGraph(graph) }, layerer: layerer! };
}

describe('StretchWidthLayerer on the oracle rows', () => {
  it('has the dag and the chain row', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}dag`, `${ROW_PREFIX}chain`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const { expected } = replay(row, () => LayeringStrategy.STRETCH_WIDTH.create());
    expect(compareExpected(expected, row.expected)).toEqual([]);
    expect(compareFullDump(expected, row.expected)).toEqual([]);
  });
});

describe('StretchWidthLayerer configuration', () => {
  it('declares the edge reverser before P1 and the layer constraint processors before P2 and P3', () => {
    const configuration = new StretchWidthLayerer().getLayoutProcessorConfiguration(new LGraph());
    const before = (phase: LayeredPhases): unknown[] => [...configuration.processorsBefore(phase)];
    expect(before(LayeredPhases.P1_CYCLE_BREAKING)).toEqual([
      IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER,
    ]);
    expect(before(LayeredPhases.P2_LAYERING)).toEqual([IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR]);
    expect(before(LayeredPhases.P3_NODE_ORDERING)).toEqual([
      IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR,
    ]);
  });
});

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11). */
const siteRows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));

function siteRow(id: string): PhaseRow {
  const row = siteRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return row;
}

describe('StretchWidthLayerer on the site rows', () => {
  it('leaves the external port dummies out of the node size average and layers them with the rest', () => {
    // oracle: sites/ModelOrderLayerers/externalPorts/STRETCH_WIDTH; StretchWidthLayerer.java:358
    const result = replay(siteRow('sites/ModelOrderLayerers/externalPorts/STRETCH_WIDTH'), () =>
      LayeringStrategy.STRETCH_WIDTH.create(),
    ).expected;
    expect(result.layers).toEqual([
      ['g0/n0'],
      ['g0/n2'],
      ['g0/n3', 'g0/n4', 'g0/n8'],
      ['g0/n5'],
      ['g0/n6'],
      ['g0/n7', 'g0/n1'],
    ]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('returns early on a graph without nodes', () => {
    // oracle: sites/Layerers/emptyGraph/STRETCH_WIDTH; StretchWidthLayerer.java:120
    const result = replay(siteRow('sites/Layerers/emptyGraph/STRETCH_WIDTH'), () =>
      LayeringStrategy.STRETCH_WIDTH.create(),
    ).expected;
    expect(result.layers).toEqual([]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });
});
