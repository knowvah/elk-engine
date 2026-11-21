// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the three HyperEdgeSegmentSplitter arms that plans/layered-edge-routing/unreached.md left at
// Medium confidence and the seven `sites/HyperEdgeSegmentSplitter/{noFreeArea,areaStartRounding,areaEndRounding}/*`
// rows reach (mission layered-evidence-gaps, T3, issue #49; plans/layered-evidence-gaps/unreached.md):
//   HyperEdgeSegmentSplitter.java:228  no free area in reach of the segment: it is split at its own centre
//   HyperEdgeSegmentSplitter.java:398  fl(centre - threshold) is below the used area's start: no first new area
//   HyperEdgeSegmentSplitter.java:404  fl(centre + threshold) is above the used area's end: no second new area
// Each case replays one row through the real router with the splitter's private methods observed, and asserts
//   - how often the oracle JVM reached each line while it recorded the row once: counted with jdb breakpoints on the
//     unmodified oracle classes at lines 226 (a split), 385 (useArea), 399 and 405 (the two new areas), journaled in
//     plans/layered-evidence-gaps/decision-journal.md (T3 evidence);
//   - the split positions, which are the row's `expected.geometry.edges` (the y of the middle bend points of every
//     edge with four bend points, hex doubles decoded), compared exactly: the positions are sums and halves of the
//     input coordinates, the same IEEE-754 operations on the JVM and here.
// The generic replay (LayeredRoutingVectors.test.ts) compares the whole rows.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import { STRICT_ROUTING_PHASE_FACTORIES } from '../../../../../test/helpers/layered-replay-factories.js';
import { runRoutingSteps } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { HyperEdgeSegmentSplitter } from './HyperEdgeSegmentSplitter.js';
import type { HyperEdgeSegmentSplitterFreeArea as FreeArea } from './HyperEdgeSegmentSplitterFreeArea.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const SITE = 'sites/HyperEdgeSegmentSplitter/';
const SPLIT_BEND_COUNT = 4;

/** What one replay did at the three arms, named by the Java lines the jdb breakpoints sat on. */
interface ArmCounts {
  /** `:226`: calls of computePositionToSplitAndUpdateFreeAreas (one per split). */
  readonly splits: number;
  /** `:385`: calls of useArea; `splits - areasUsed` splits took the `:228` else arm. */
  readonly areasUsed: number;
  /** `:399`: first new areas created. */
  readonly firstNewAreas: number;
  /** `:405`: second new areas created. */
  readonly secondNewAreas: number;
}

/** The private members observed (TypeScript `private`: present on the prototype). */
interface SplitterInternals {
  computePositionToSplitAndUpdateFreeAreas(segment: unknown, freeAreas: FreeArea[], threshold: number): number;
  useArea(freeAreas: FreeArea[], usedAreaIndex: number, threshold: number): void;
}

const internals = HyperEdgeSegmentSplitter.prototype as unknown as SplitterInternals;
const rows: RoutingRow[] = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** One replay of a row: the arm counts and the split positions it computed, ascending. */
interface Observation {
  readonly arms: ArmCounts;
  readonly positions: readonly number[];
}

/** Replays the row with the splitter observed. A new area that starts where the used one started is the first one. */
function observe(id: string): Observation {
  const counts = { areasUsed: 0, firstNewAreas: 0, secondNewAreas: 0 };
  const compute = vi.spyOn(internals, 'computePositionToSplitAndUpdateFreeAreas');
  const useArea = internals.useArea;
  vi.spyOn(internals, 'useArea').mockImplementation(function (this: unknown, freeAreas, index, threshold) {
    const old = freeAreas[index]!;
    const before = new Set(freeAreas);
    useArea.call(this, freeAreas, index, threshold);
    const created = freeAreas.filter((area) => !before.has(area));
    counts.areasUsed++;
    counts.firstNewAreas += created.filter((area) => area.startPosition === old.startPosition).length;
    counts.secondNewAreas += created.filter((area) => area.endPosition === old.endPosition).length;
  });
  runRoutingSteps(
    rows.find((row) => row.id === id)!,
    STRICT_ROUTING_PHASE_FACTORIES,
  );
  const positions = compute.mock.results.map((result) => result.value as number).sort((x, y) => x - y);
  return { arms: { splits: positions.length, ...counts }, positions };
}

/** The oracle's split positions of the row: the y of the second bend point of every edge routed with four. */
function recordedSplitPositions(id: string): number[] {
  const edges = rows.find((row) => row.id === id)!.expected.geometry.edges;
  return Object.values(edges)
    .filter((route) => route.bendPoints.length === SPLIT_BEND_COUNT)
    .map((route) => decodeHex(route.bendPoints[1]![1]))
    .sort((x, y) => x - y);
}

/** Asserts the oracle's arm counts and split positions on one replay of the row. */
function expectSplits(name: string, arms: ArmCounts, positions: readonly number[]): void {
  const id = `${SITE}${name}`;
  const observed = observe(id);
  expect(observed.arms).toEqual(arms);
  expect(recordedSplitPositions(id)).toEqual(positions);
  expect(observed.positions).toEqual(positions);
}

describe('HyperEdgeSegmentSplitter: no free area in reach (HyperEdgeSegmentSplitter.java:228 else)', () => {
  it('splits at the centre of the segment when the threshold is 0.2 x Double.MAX_VALUE', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/noFreeArea/unbounded; two segments in {15} out {70}, no other
    // coordinate, so minimumDifference is Double.MAX_VALUE (OrthogonalRoutingGenerator.java:253) and no gap is a
    // free area (HyperEdgeSegmentSplitter.java:98); jdb: :226 once, :385 never
    expectSplits('noFreeArea/unbounded', { splits: 1, areasUsed: 0, firstNewAreas: 0, secondNewAreas: 0 }, [42.5]);
  });

  it('splits at the centre of the segment when the only free area lies past its end', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/noFreeArea/finite; segments in {15} out {20} twice and a third pair
    // 200 below: threshold 40, the only area [60, 175] starts past the segment's end (:212 break); jdb: :226
    // once, :385 never
    expectSplits('noFreeArea/finite', { splits: 1, areasUsed: 0, firstNewAreas: 0, secondNewAreas: 0 }, [17.5]);
  });

  it('splits the fourth segment at its centre once three splits used up the only area', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/noFreeArea/consumed; three identical critical 2-cycles (12 <-> 112),
    // threshold 20, one area [32, 92]: split at 62 (both halves stay), then 37 and 87 (halves too small, :388
    // else), then no area: the centre 62 of the segment; jdb: :226 four times, :385 three times, :399 and :405 once
    expectSplits(
      'noFreeArea/consumed',
      { splits: 4, areasUsed: 3, firstNewAreas: 1, secondNewAreas: 1 },
      [37, 62, 62, 87],
    );
  });
});

describe('HyperEdgeSegmentSplitter: a new area dropped by rounding (HyperEdgeSegmentSplitter.java:398, :404 else)', () => {
  const CENTRE = 120.69999999999999;
  const FAR_END = 153.35;

  it('creates no first area when fl(centre - threshold) is one ulp below the start', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaStartRounding/single; the area [88.05, 153.35] is exactly four
    // thresholds (32.65) wide (:388 holds), its centre 120.69999999999999 minus 32.65 is 88.04999999999998;
    // jdb: :385 once, :399 never, :405 once
    expectSplits('areaStartRounding/single', { splits: 1, areasUsed: 1, firstNewAreas: 0, secondNewAreas: 1 }, [
      CENTRE,
    ]);
  });

  it('leaves later splits without the dropped first area', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaStartRounding/consumed; three such cycles: the second split uses
    // the zero-size second area at 153.35, the third and fourth find none and use the centre of their segment
    // (also 120.69999999999999). With a first area [88.05, 88.04999999999998] a split would sit at about 88.05:
    // the recorded bend points have none there. jdb: :226 four times, :385 twice, :399 never, :405 once
    expectSplits('areaStartRounding/consumed', { splits: 4, areasUsed: 2, firstNewAreas: 0, secondNewAreas: 1 }, [
      CENTRE,
      CENTRE,
      CENTRE,
      FAR_END,
    ]);
  });

  it('creates no second area when fl(centre + threshold) is one ulp above the end', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaEndRounding/single; the negated graph: area [-153.35, -88.05],
    // centre -120.69999999999999 plus 32.65 is -88.04999999999998, above the end; jdb: :385 once, :399 once,
    // :405 never
    expectSplits('areaEndRounding/single', { splits: 1, areasUsed: 1, firstNewAreas: 1, secondNewAreas: 0 }, [-CENTRE]);
  });

  it('leaves later splits without the dropped second area', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaEndRounding/consumed; the second split uses the zero-size first
    // area at -153.35, the other two find none: the centres -120.7 (segment -55.4 .. -186) and
    // -120.69999999999999 (segment -218.64999999999998 .. -22.750000000000004). jdb: :226 four times, :385
    // twice, :399 once, :405 never
    expectSplits('areaEndRounding/consumed', { splits: 4, areasUsed: 2, firstNewAreas: 1, secondNewAreas: 0 }, [
      -FAR_END,
      -120.7,
      -CENTRE,
      -CENTRE,
    ]);
  });
});
