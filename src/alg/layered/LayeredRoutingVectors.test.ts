// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-routing.json (`models`) and layered-routing-steps.json
// (`scenarios`, `sites`, `calls`) through the whole 7e set the way the pipeline uses it (mission 7e, T10; recorded by
// tools/vectors/LayeredRoutingVectors.java from the source-built oracle): processors by `IntermediateProcessorStrategy`
// name, phases by `CycleBreakingStrategy` / `LayeringStrategy` / `CrossingMinimizationStrategy` /
// `NodePlacementStrategy` / `EdgeRouterFactory.factoryFor(EdgeRouting)`. Model rows replay their recorded `prefix`, step
// rows interpret their `steps`, `calls` rows call the named static method. Numbers within 1e-6 (AD-4), everything else
// exactly (the comparators of test/helpers/layered-routing-replay-compare.ts).
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../test/helpers/layered-phase-replay-rows.js';
import {
  compareCall,
  compareRouting,
  compareRoutingFullDump,
} from '../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../test/helpers/layered-routing-replay-dump.js';
import {
  runCall,
  runRoutingPrefix,
  runRoutingSteps,
  type CallerTable,
} from '../../../test/helpers/layered-routing-replay-ops.js';
import {
  isCallRow,
  loadRoutingRows,
  ROUTING_ROW_GROUPS,
  type RoutingFileRow,
  type RoutingRow,
} from '../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../test/helpers/layered-site-replay-dump.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../core/math/KVector.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import type { PortSide } from '../../core/options/PortSide.js';
import type { LNode } from './graph/LNode.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';
import { NubSpline } from './p5edges/splines/NubSpline.js';
import { NubsSelfLoop } from './p5edges/splines/NubsSelfLoop.js';
import { Rectangle } from './p5edges/splines/Rectangle.js';
import { SplinesMath } from './p5edges/splines/SplinesMath.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const INT_ROW_PREFIX = 'calls/SplinesMath/isBetween-int-';
const DOUBLE_ROW_PREFIX = 'calls/SplinesMath/isBetween-double-';

type RowCounts = Record<string, number>;
const rowCountsOf = (file: string): RowCounts =>
  (JSON.parse(readFileSync(file, 'utf8')) as { rowCounts: RowCounts }).rowCounts;

const rows = loadRoutingRows(MODELS_FILE, STEPS_FILE);
const rowCounts: RowCounts = { ...rowCountsOf(MODELS_FILE), ...rowCountsOf(STEPS_FILE) };

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      case ROUTING_PHASE:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** The static methods of the T6/T7 classes the `calls` rows name (the `isBetween` overloads are `isBetweenInt` and `isBetweenDouble`). */
const CALLERS: CallerTable = {
  'SplinesMath.intersect': SplinesMath.intersect as CallerTable[string],
  'SplinesMath.innerAngle': SplinesMath.innerAngle as CallerTable[string],
  'SplinesMath.lengthToOrthogonal': SplinesMath.lengthToOrthogonal,
  'SplinesMath.portSideToDirection': SplinesMath.portSideToDirection,
  'SplinesMath.distPortToNodeEdge': SplinesMath.distPortToNodeEdge,
  'SplinesMath.getMarginOnPortSide': SplinesMath.getMarginOnPortSide,
  'Rectangle.union': (rectangle: Rectangle, other: Rectangle | KVector | LNode): Rectangle => {
    if (other instanceof Rectangle) {
      return Rectangle.union(rectangle, other);
    }
    if (other instanceof KVector) {
      rectangle.union(other);
    } else {
      rectangle.union(other);
    }
    return rectangle;
  },
  'Rectangle.getHeight': (rectangle: Rectangle) => rectangle.getHeight(),
  'Rectangle.getWidth': (rectangle: Rectangle) => rectangle.getWidth(),
  'Rectangle.enlarge': (rectangle: Rectangle, enlargement: number): Rectangle => {
    rectangle.enlarge(enlargement);
    return rectangle;
  },
  'Rectangle.getFromPortSide': (rectangle: Rectangle, side: PortSide): number => rectangle.getFromPortSide(side),
  'Rectangle.toNodeMargins': (rectangle: Rectangle, node: LNode) => rectangle.toNodeMargins(node),
  'NubSpline.generateDerivedNUBS': NubSpline.generateDerivedNUBS,
  'NubSpline.generateInvertedNUBS': NubSpline.generateInvertedNUBS,
  'NubSpline.toBezier': (spline: NubSpline) => {
    spline.toBezier();
    return spline;
  },
  'NubSpline.getPointOnCurve': (spline: NubSpline, t: number, modify?: boolean) => spline.getPointOnCurve(t, modify),
  'NubSpline.getFirstVerticalPoint': NubSpline.getFirstVerticalPoint,
  'NubSpline.getLastVerticalPoint': NubSpline.getLastVerticalPoint,
  'NubSpline.getFirstHorizontalPoint': NubSpline.getFirstHorizontalPoint,
  'NubSpline.getLastHorizontalPoint': NubSpline.getLastHorizontalPoint,
  'NubSpline.generateNiceCurve': NubSpline.generateNiceCurve,
  ...Object.fromEntries(
    (
      [
        'createSideSelfLoop',
        'createCornerSelfLoop',
        'createAcrossSelfLoop',
        'createThreeSideSelfLoop',
        'createFourSideSelfLoop',
      ] as const
    ).map((name) => [`NubsSelfLoop.${name}`, NubsSelfLoop[name] as CallerTable[string]]),
  ),
} as CallerTable;

/** The row order of a `rectangle` argument is (top, right, bottom, left); the constructor takes (left, top, right, bottom). */
const CONSTRUCTORS = {
  rectangle: (top: number, right: number, bottom: number, left: number): Rectangle =>
    new Rectangle(left, top, right, bottom),
  nubs: (clamped: boolean, dim: number, points: KVector[]): NubSpline => new NubSpline(clamped, dim, points),
};

function callersOf(row: RoutingFileRow): CallerTable {
  if (row.id.startsWith(INT_ROW_PREFIX)) {
    return { 'SplinesMath.isBetween': SplinesMath.isBetweenInt };
  }
  return row.id.startsWith(DOUBLE_ROW_PREFIX) ? { 'SplinesMath.isBetween': SplinesMath.isBetweenDouble } : CALLERS;
}

function replay(
  row: RoutingRow,
): ReturnType<typeof routingDump> & { fullDump: ReturnType<typeof dumpWithPropertyValues> | undefined } {
  const graph = row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
  const actual = routingDump(graph, importRow(row).importDump);
  return { ...actual, fullDump: row.expected.dump === undefined ? undefined : dumpWithPropertyValues(graph) };
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('layered-routing replay', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded total row count', () => {
    expect(rows.length).toBe(Object.values(rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it.each(ROUTING_ROW_GROUPS)('has the recorded %s row count', (group) => {
    expect(rows.filter((row) => row.group === group).length).toBe(rowCounts[group] ?? 0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    if (isCallRow(row)) {
      const options = { constructors: CONSTRUCTORS };
      expect(compareCall(runCall(row, factories, callersOf(row), options), row.expected.result)).toEqual([]);
      return;
    }
    const { fullDump, ...actual } = replay(row);
    expect(compareRouting(actual, row.expected)).toEqual([]);
    if (fullDump !== undefined) {
      expect(compareRoutingFullDump({ ...actual, dump: fullDump }, row.expected)).toEqual([]);
    }
  });
});
