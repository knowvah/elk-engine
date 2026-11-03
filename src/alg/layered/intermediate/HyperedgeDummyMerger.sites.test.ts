// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the branches of HyperedgeDummyMerger that only the T13 `sites/EmptyLayer/merger` and
// `sites/HyperedgeMerger/parallelLongEdges/merger` rows reach (mission 7e, T14a, unreached.md S11/S12). Each case replays
// one row with the merger injected and asserts the fields the branch decides, the layers, the edge endpoints and the
// long edge properties of the merged dummy (HyperedgeDummyMerger.java:79,:213-219), never the whole row
// (HyperedgeDummyMerger.test.ts replays that). Literals are the row's `expected.layers`, `edges` and `changed`.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingExpected,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { HyperedgeDummyMerger } from './HyperedgeDummyMerger.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums, `HyperedgeDummyMerger` injected for HYPEREDGE_DUMMY_MERGER. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return name === 'HYPEREDGE_DUMMY_MERGER'
      ? new HyperedgeDummyMerger()
      : IntermediateProcessorStrategy.valueOf(name).create();
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        throw new Error(`the plan of this row stops before ${phase}`);
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

/** Replays the row with the class under test injected and dumps the resulting state (the recorder's shape). */
function replayed(id: string): RoutingExpected {
  const row = rows.find((candidate) => candidate.id === id)!;
  return routingDump(runRoutingSteps(row, factories), importRow(row).importDump);
}

/** The recorded edge endpoints by path (the comparators treat `edges` as a map, not as a list). */
function edgesByPath(actual: RoutingExpected): Record<string, Omit<RoutingExpected['edges'][number], 'path'>> {
  return Object.fromEntries(actual.edges.map(({ path, ...endpoints }) => [path, endpoints]));
}

describe('HyperedgeDummyMerger site rows (T14a)', () => {
  it('S11: an empty layer is skipped and nothing changes', () => {
    // oracle: sites/EmptyLayer/merger; HyperedgeDummyMerger.java:79 (nodes.isEmpty() continues with the next layer)
    const actual = replayed('sites/EmptyLayer/merger');
    expect(actual.layers).toEqual([['g0/n0'], [], ['g0/n1']]);
    expect(edgesByPath(actual)).toEqual({ 'g0/e0': { src: 'g0/n0/p0', tgt: 'g0/n1/p0', reversed: false } });
    expect(actual.changed).toEqual([]);
  });

  it('S12: two parallel long edges merge into one dummy that keeps its long edge source and target', () => {
    // oracle: sites/HyperedgeMerger/parallelLongEdges/merger; HyperedgeDummyMerger.java:217 (both merged dummies
    // share the non-null LONG_EDGE_TARGET, so keepTargetPort holds and the property is not reset to null)
    const actual = replayed('sites/HyperedgeMerger/parallelLongEdges/merger');
    expect(actual.layers).toEqual([['g0/n0'], ['new/n0', 'g0/n1'], ['g0/n2']]);
    expect(edgesByPath(actual)).toEqual({
      'g0/e0': { src: 'g0/n0/p0', tgt: 'g0/n1/p0', reversed: false },
      'g0/e1': { src: 'g0/n0/p0', tgt: 'new/p1', reversed: false },
      'g0/e2': { src: 'g0/n0/p0', tgt: 'new/p1', reversed: false },
      'new/e0': { src: 'new/p0', tgt: 'g0/n2/p0', reversed: false },
      'new/e1': { src: 'new/p0', tgt: 'g0/n2/p0', reversed: false },
      'g0/e3': { src: 'g0/n1/p1', tgt: 'g0/n2/p0', reversed: false },
    });
    const merged = actual.changed.find((entry) => entry.path === 'new/n0')!;
    expect(merged.props.longEdgeSource).toEqual({ ref: 'g0/n0/p0' });
    expect(merged.props.longEdgeTarget).toEqual({ ref: 'g0/n2/p0' });
  });
});
