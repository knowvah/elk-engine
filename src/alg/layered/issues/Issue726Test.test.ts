// SPDX-License-Identifier: EPL-2.0
// Port of Issue726Test (mission 7e, T10, R10): `testOrthogonalEdges`, run by the Java after `OrthogonalEdgeRouter`
// (`@TestAfterProcessor`, `:59`) on `tickets/layered/726_edgesMissingBendPoints.elkt` with the default configuration.
// Row selection: the one `models/ticket-726/root/P5/ORTHOGONAL` row of test/golden/refs/java/layered-routing.json (the
// vendored ticket at the default placement, the orthogonal router as the last plan entry).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue726Test.java
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { checkEdgeRouteIsOrthogonal } from '../../../../test/helpers/edge-route-orthogonal.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const TICKET_ROW_ID = 'models/ticket-726/root/P5/ORTHOGONAL';
const ONE_ROW = 1;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
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
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

const rows: RoutingRow[] = loadRoutingRows(ROWS_FILE)
  .filter(isGeometryRow)
  .filter((row) => row.id === TICKET_ROW_ID);

/** `testOrthogonalEdges` (`:60-65`): inspect each outgoing edge of each node of each layer. */
function testOrthogonalEdges(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      for (const edge of node.getOutgoingEdges()) {
        testOrthogonalEdge(edge);
      }
    }
  }
}

/** `testOrthogonalEdge` (`:67-75`): assemble the edge route, then check it. */
function testOrthogonalEdge(edge: LEdge): void {
  const route = new KVectorChain();
  route.add(edge.getSource()!.getAbsoluteAnchor());
  route.addAll(edge.getBendPoints());
  route.add(edge.getTarget()!.getAbsoluteAnchor());

  checkEdgeRouteIsOrthogonal(edge, route);
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('Issue726Test on the replayed row', () => {
  it('selects the one recorded P5/ORTHOGONAL row of the ticket', () => {
    expect(rows.map((row) => row.id)).toEqual([TICKET_ROW_ID]);
    expect(rows).toHaveLength(ONE_ROW);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testOrthogonalEdges', (_id, row) => {
    expect(() => testOrthogonalEdges(runRoutingPrefix(row, factories))).not.toThrow();
  });
});
