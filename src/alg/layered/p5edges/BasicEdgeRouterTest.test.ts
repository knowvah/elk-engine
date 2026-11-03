// SPDX-License-Identifier: EPL-2.0
// Port of BasicEdgeRouterTest (mission 7e, T10, R10): `testOrthogonalEdges`, which the Java runs with the one
// `@ConfiguratorProvider` that is not commented out, `orthogonalConfigurator` (`EdgeRouting.ORTHOGONAL`, `:48-52`; the
// polyline and spline providers are commented out upstream, `:54-62`). The test framework runs the whole layout and walks
// the ElkGraph; the replay has no ElkGraph back-transformation yet, so the check is applied per `LEdge` as
// `Issue726Test.testOrthogonalEdge` assembles the route (source absolute anchor, bend points, target absolute anchor),
// for every outgoing edge of every node of every layer.
//
// Row selection: the `models/*` rows of test/golden/refs/java/layered-routing.json that stop at `P5/ORTHOGONAL` at the
// default placement (the id ends with `/P5/ORTHOGONAL`; the option variants `P5/ORTHOGONAL-*`, the POLYLINE and SPLINES
// stops, and every `scenarios/*` and `calls/*` row are excluded). The Java reads only `realworld/ptolemy/**`; the rows
// of the other model families are replayed as well, as 7d's BasicNodePlacementTest does.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p5edges/BasicEdgeRouterTest.java
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
import { EdgeRouterFactory } from './EdgeRouterFactory.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const ORTHOGONAL_STOP_SUFFIX = '/P5/ORTHOGONAL';
const NO_ROWS = 0;

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
  .filter((row) => row.group === 'models' && row.id.endsWith(ORTHOGONAL_STOP_SUFFIX));

/** Assembles the route of `edge` as `Issue726Test.testOrthogonalEdge` does (`:67-72`) and checks it (`:73`). */
function testOrthogonalEdge(edge: LEdge): void {
  const route = new KVectorChain();
  route.add(edge.getSource()!.getAbsoluteAnchor());
  route.addAll(edge.getBendPoints());
  route.add(edge.getTarget()!.getAbsoluteAnchor());

  checkEdgeRouteIsOrthogonal(edge, route);
}

/** `testOrthogonalEdges`: every outgoing edge of every node of every layer (`Issue726Test.java:60-65`). */
function testOrthogonalEdges(graph: LGraph): number {
  let checked = 0;
  for (const layer of graph) {
    for (const node of layer) {
      for (const edge of node.getOutgoingEdges()) {
        testOrthogonalEdge(edge);
        checked++;
      }
    }
  }
  return checked;
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('BasicEdgeRouterTest on the replayed rows', () => {
  it('selects the recorded P5/ORTHOGONAL model rows', () => {
    expect(rows.length).toBeGreaterThan(NO_ROWS);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testOrthogonalEdges', (_id, row) => {
    expect(() => testOrthogonalEdges(runRoutingPrefix(row, factories))).not.toThrow();
  });
});
