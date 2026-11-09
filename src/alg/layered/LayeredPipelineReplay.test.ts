// SPDX-License-Identifier: EPL-2.0
// SC4 of mission 7f (F5, T10): every `models/*` row of the four landed refs (layered-phases, layered-order,
// layered-placement, layered-routing) replayed through the real driver instead of the 7b-7e hand-walked `prefix`:
// import with the row's options, `ElkLayered.prepareLayoutTest`, plan equality against the row's `prefix`
// (`GraphConfigurator` decides the plan; no `normalise` mirror), `runLayoutTestStep` once per prefix entry, then the
// dump and comparator of the row's own mission (full-dump twin where the row carries a `dump`).
import { beforeAll, describe, expect, it } from 'vitest';
import { PINNED_PHASE_ROWS } from '../../../test/helpers/layered-pipeline-pinned-rows.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../test/helpers/layered-framework-replay.js';
import { compareOrder, compareOrderFullDump } from '../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows } from '../../../test/helpers/layered-order-replay-rows.js';
import { compareExpected, compareFullDump } from '../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../test/helpers/layered-phase-replay-dump.js';
import { loadRows } from '../../../test/helpers/layered-phase-replay-rows.js';
import { runStopRow } from '../../../test/helpers/layered-pipeline-replay-ops.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { comparePlacement, comparePlacementFullDump } from '../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../test/helpers/layered-placement-replay-dump.js';
import { loadPlacementRows } from '../../../test/helpers/layered-placement-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../test/helpers/layered-routing-replay-dump.js';
import {
  isGeometryRow,
  loadRoutingRows,
  registerRoutingEnums,
} from '../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../test/helpers/layered-site-replay-dump.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import type { LGraph } from './graph/LGraph.js';
import { ElkLayered } from './ElkLayered.js';

const REFS = `${repoRoot()}/test/golden/refs/java`;
const MODELS = 'models';
const FULL_DUMP_TWIN_KEY = 'dump';

interface Family<R extends PipelineStopRow, E> {
  readonly name: string;
  readonly rows: readonly R[];
  readonly dump: (graph: LGraph, importDump: Parameters<typeof phaseDump>[1], row: R) => E;
  readonly compare: (actual: E, row: R) => readonly unknown[];
}

const asStop = <R>(rows: readonly R[]): PipelineStopRow[] =>
  (rows as unknown as readonly (PipelineStopRow & { group: string })[]).filter((row) => row.group === MODELS);

function replayOf<R extends PipelineStopRow, E>(family: Family<R, E>, row: R): readonly unknown[] {
  return runStopRow(row, {
    driver: new ElkLayered(),
    dump: (graph, importDump) => family.dump(graph, importDump, row),
    compare: (actual, _expected) => family.compare(actual, row),
  });
}

const hasDump = (row: PipelineStopRow): boolean =>
  (row.expected as unknown as Record<string, unknown>)[FULL_DUMP_TWIN_KEY] !== undefined;

type Phase = ReturnType<typeof phaseDump>;
type Order = ReturnType<typeof orderDump>;
type Placement = ReturnType<typeof placementDump>;
type Routing = ReturnType<typeof routingDump> & { fullDump?: ReturnType<typeof dumpWithPropertyValues> };

const phaseRows = asStop(loadRows(`${REFS}/layered-phases.json`));
const orderRows = asStop(loadOrderRows(`${REFS}/layered-order.json`));
const placementRows = asStop(loadPlacementRows(`${REFS}/layered-placement.json`));
const routingRows = asStop(loadRoutingRows(`${REFS}/layered-routing.json`).filter(isGeometryRow));

const families: readonly Family<PipelineStopRow, unknown>[] = [
  {
    name: 'layered-phases.json',
    rows: phaseRows,
    dump: (graph, importDump, row): Phase & { dump?: unknown } => {
      const actual = phaseDump(graph, importDump);
      return hasDump(row) ? { ...actual, dump: dumpLGraph(graph) } : actual;
    },
    compare: (actual0, row): readonly unknown[] => {
      const actual = actual0 as Phase & { dump?: unknown };
      const expected = row.expected as unknown as Parameters<typeof compareExpected>[1];
      return [
        ...compareExpected(actual, expected),
        ...(hasDump(row) ? compareFullDump(actual as never, expected) : []),
      ];
    },
  },
  {
    name: 'layered-order.json',
    rows: orderRows,
    dump: (graph, importDump, row): Order & { dump?: unknown } => {
      const actual = orderDump(graph, importDump);
      return hasDump(row) ? { ...actual, dump: dumpLGraph(graph) } : actual;
    },
    compare: (actual0, row): readonly unknown[] => {
      const actual = actual0 as Order & { dump?: unknown };
      const expected = row.expected as unknown as Parameters<typeof compareOrder>[1];
      return [
        ...compareOrder(actual, expected),
        ...(hasDump(row) ? compareOrderFullDump(actual as never, expected) : []),
      ];
    },
  },
  {
    name: 'layered-placement.json',
    rows: placementRows,
    dump: (graph, importDump, row): Placement & { dump?: unknown } => {
      const actual = placementDump(graph, importDump);
      return hasDump(row) ? { ...actual, dump: dumpLGraph(graph) } : actual;
    },
    compare: (actual0, row): readonly unknown[] => {
      const actual = actual0 as Placement & { dump?: unknown };
      const expected = row.expected as unknown as Parameters<typeof comparePlacement>[1];
      return [
        ...comparePlacement(actual, expected),
        ...(hasDump(row) ? comparePlacementFullDump(actual as never, expected) : []),
      ];
    },
  },
  {
    name: 'layered-routing.json',
    rows: routingRows,
    dump: (graph, importDump, row): Routing => ({
      ...routingDump(graph, importDump),
      fullDump: hasDump(row) ? dumpWithPropertyValues(graph) : undefined,
    }),
    compare: (actual, row): readonly unknown[] => {
      const { fullDump, ...rest } = actual as Routing;
      const expected = row.expected as unknown as Parameters<typeof compareRouting>[1];
      return [
        ...compareRouting(rest, expected),
        ...(fullDump !== undefined ? compareRoutingFullDump({ ...rest, dump: fullDump } as never, expected) : []),
      ];
    },
  },
];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
  registerPipelineEnums();
  registerRoutingEnums();
});

it('pins exactly the 0 layered-phases.json rows of FX6', () => {
  expect(phaseRows.filter((row) => PINNED_PHASE_ROWS.has(row.id))).toHaveLength(0);
  expect(PINNED_PHASE_ROWS.size).toBe(0);
});

describe.each(families)('SC4 replay of $name through ElkLayered', (family) => {
  it('has models rows', () => {
    expect(family.rows.length).toBeGreaterThan(0);
  });

  it.each(family.rows.map((row) => [row.id, row] as const))('%s: plan equals prefix, result matches', (_id, row) => {
    const pinned = PINNED_PHASE_ROWS.get(row.id);
    if (pinned === undefined) {
      expect(replayOf(family, row)).toEqual([]);
    } else {
      expect(() => replayOf(family, row)).toThrow(new UnsupportedOperationException(pinned));
    }
  });
});
