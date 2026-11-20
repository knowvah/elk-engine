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
import { importRow } from '../../../test/helpers/layered-phase-replay-rows.js';
import { STRICT_ROUTING_PHASE_FACTORIES } from '../../../test/helpers/layered-replay-factories.js';
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
import {
  NUB_SPLINE_CALLERS,
  NUBS_SELF_LOOP_CALLERS,
  RECTANGLE_CALLERS,
  SPLINES_MATH_CALLERS,
} from '../../../test/helpers/layered-spline-callers.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../core/math/KVector.js';
import { NubSpline } from './p5edges/splines/NubSpline.js';
import { Rectangle } from './p5edges/splines/Rectangle.js';
import { SplinesMath } from './p5edges/splines/SplinesMath.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const INT_ROW_PREFIX = 'calls/SplinesMath/isBetween-int-';
const DOUBLE_ROW_PREFIX = 'calls/SplinesMath/isBetween-double-';

type RowCounts = Record<string, number>;
const rowCountsOf = (file: string): RowCounts =>
  (JSON.parse(readFileSync(file, 'utf8')) as { rowCounts: RowCounts }).rowCounts;

const rows = loadRoutingRows(MODELS_FILE, STEPS_FILE);
const rowCounts: RowCounts = { ...rowCountsOf(MODELS_FILE), ...rowCountsOf(STEPS_FILE) };

/** The static methods of the T6/T7 classes the `calls` rows name (the `isBetween` overloads are `isBetweenInt` and `isBetweenDouble`). */
const CALLERS: CallerTable = {
  ...SPLINES_MATH_CALLERS,
  ...RECTANGLE_CALLERS,
  ...NUB_SPLINE_CALLERS,
  ...NUBS_SELF_LOOP_CALLERS,
};

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
  const graph =
    row.steps === null
      ? runRoutingPrefix(row, STRICT_ROUTING_PHASE_FACTORIES)
      : runRoutingSteps(row, STRICT_ROUTING_PHASE_FACTORIES);
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
      expect(
        compareCall(runCall(row, STRICT_ROUTING_PHASE_FACTORIES, callersOf(row), options), row.expected.result),
      ).toEqual([]);
      return;
    }
    const { fullDump, ...actual } = replay(row);
    expect(compareRouting(actual, row.expected)).toEqual([]);
    if (fullDump !== undefined) {
      expect(compareRoutingFullDump({ ...actual, dump: fullDump }, row.expected)).toEqual([]);
    }
  });
});
