// SPDX-License-Identifier: EPL-2.0
// Anchored case for the equal-coordinate branch of HyperEdgeSegment.insertSorted that only the T13
// `sites/HyperEdgeSegment/equalPortPositions` row reaches (mission 7e, T14a, unreached.md Sc3). The routed edges of the row
// are the same with and without the branch (OrthogonalEdgeRouter.sites.test.ts asserts them), because a duplicate
// coordinate in a lone segment's list changes no bend point; the field the branch decides is the segment's list of
// connection coordinates (HyperEdgeSegment.java:146-160). The case replays the row up to the router, builds the segment
// of the source port with the west-to-east strategy and asserts both lists. Literals are the row's bend points
// `expected.geometry.edges['g0/e0']`: the source port at y 15 and the two target ports, both at y 70.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LPort } from '../../graph/LPort.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { WestToEastRoutingStrategy } from './direction/WestToEastRoutingStrategy.js';
import { HyperEdgeSegment } from './HyperEdgeSegment.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROW_ID = 'sites/HyperEdgeSegment/equalPortPositions';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums up to P4; the plan is cut before the router. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return IntermediateProcessorStrategy.valueOf(name).create();
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
        throw new Error(`the plan of this case stops before ${phase}`);
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const row: RoutingRow = loadRoutingRows(STEPS_FILE)
  .filter(isGeometryRow)
  .find((candidate) => candidate.id === ROW_ID)!;

/** The graph of the row just before the router runs (the steps without `P5_EDGE_ROUTING` and the final `dump`). */
function graphBeforeRouter(): LGraph {
  const steps = row.steps!.filter(([op, phase]) => op !== 'dump' && !(op === 'runPhase' && phase === ROUTING_PHASE));
  return runSteps({ ...row, steps }, factories);
}

describe('HyperEdgeSegment.insertSorted site row (T14a)', () => {
  it('Sc3: two target ports at the same offset leave one outgoing coordinate', () => {
    // oracle: sites/HyperEdgeSegment/equalPortPositions; HyperEdgeSegment.java:150-152 (an exactly equal value is
    // already present in the list, so it is not inserted again)
    const graph = graphBeforeRouter();
    const source: LPort = graph.getLayers()[0]!.getNodes()[0]!.getPorts()[0]!;
    const segment = new HyperEdgeSegment(new WestToEastRoutingStrategy());
    segment.addPortPositions(source, new Map());

    expect(segment.getPorts()).toHaveLength(3);
    const incoming = segment.getIncomingConnectionCoordinates().toArray();
    const outgoing = segment.getOutgoingConnectionCoordinates().toArray();
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toBeCloseTo(15, COORDINATE_DIGITS);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]).toBeCloseTo(70, COORDINATE_DIGITS);
  });
});
