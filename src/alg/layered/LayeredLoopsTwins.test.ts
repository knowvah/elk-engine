// SPDX-License-Identifier: EPL-2.0
// W6 / W7 twins over test/golden/refs/java/layered-loops.json (mission 7g, T16). Every row is replayed through the real
// pipeline (`replayLoopsRow`, no injected factory):
//   - AD-10: one counting pass records, per hashed container the oracle iterates (identity-keyed under -XX:hashCode=2, so
//     the port keeps insertion order), which rows reach it and with how many elements; then each site's twin replays the
//     rows that reach it with the iteration reversed and must equal the oracle. The sites already twinned in the class
//     tests (SelfHyperLoop.getSLEdges, the three LGraphToCGraphTransformer maps, InternalUnionExternalExtension.edges)
//     are not repeated.
//   - R9 (W7): the first edge of a spline segment (`SplineSegment.edges`, a Java HashSet) read by
//     `SplineEdgeRouter.getSplinePath` and `collectVerticalSegmentsSplines`; the rows are replayed with the `edges` set of
//     every multi-edge segment rebuilt in reverse order right before the reader.
// The twins patch prototypes (private members through a cast) and restore them in `finally`.
import { describe, expect, it } from 'vitest';
import { loadLoopsRows, replayLoopsRow, type LoopsRow } from '../../../test/helpers/layered-loops-replay-rows.js';
import { registerStepProcessor, reversedCopy } from '../../../test/helpers/layered-loops-replay-ops.js';
import { Direction } from '../../core/options/Direction.js';
import type { Multimap } from '../../guava/Multimap.js';
import { OneDimensionalComponentsCompaction } from './compaction/components/OneDimensionalComponentsCompaction.js';
import { ComponentsToCGraphTransformer } from './compaction/components/ComponentsToCGraphTransformer.js';
import { ComponentsCompactor } from './components/ComponentsCompactor.js';
import { DummySelfLoopProcessor } from './intermediate/DummySelfLoopProcessor.js';
import { LGraphToCGraphTransformer } from './intermediate/compaction/LGraphToCGraphTransformer.js';
import { NetworkSimplexCompaction } from './intermediate/compaction/NetworkSimplexCompaction.js';
import { SelfHyperLoop } from './intermediate/loops/SelfHyperLoop.js';
import { SplineEdgeRouter } from './p5edges/splines/SplineEdgeRouter.js';
import type { SplineSegment } from './p5edges/splines/SplineSegment.js';
import type { LGraph } from './graph/LGraph.js';
import { InternalProperties } from './options/InternalProperties.js';

type Site =
  | 'externalExtensions'
  | 'externalPlaceholder'
  | 'compactorExternalExtensions'
  | 'slPortsBySide'
  | 'lEdgeMap'
  | 'splineRouter'
  | 'splineTransformer';
const AD10_SITES: readonly Site[] = [
  'lEdgeMap',
  'externalExtensions',
  'externalPlaceholder',
  'compactorExternalExtensions',
  'slPortsBySide',
];
type Mode = 'count' | 'reverse';

/** Per site: the rows that reach it, and the rows where it holds more than one element. */
const reached = new Map<Site, Set<string>>();
const multi = new Map<Site, Set<string>>();
/** Per row: the placeholder directions that held at least one element (LEFT_RIGHT / UP_DOWN order matters if both do). */
const placeholderDirs = new Map<string, Set<Direction>>();
let currentRow = '';
let lEdgeMapGets = 0;
let lEdgeMapReads = 0;
let segmentsReversed = 0;

const mark = (site: Site, isMulti: boolean): void => {
  (reached.get(site) ?? reached.set(site, new Set()).get(site)!).add(currentRow);
  if (isMulti) {
    (multi.get(site) ?? multi.set(site, new Set()).get(site)!).add(currentRow);
  }
};

type Restore = () => void;
type Proto = Record<string, unknown>;

function patchMethod(proto: object, name: string, make: (original: (...args: never[]) => unknown) => unknown): Restore {
  const target = proto as Proto;
  const original = target[name] as (...args: never[]) => unknown;
  target[name] = make(original);
  return () => {
    target[name] = original;
  };
}

function patchStaticGetter(cls: object, name: string, getter: () => unknown): Restore {
  const descriptor = Object.getOwnPropertyDescriptor(cls, name)!;
  Object.defineProperty(cls, name, { ...descriptor, get: getter });
  return () => {
    Object.defineProperty(cls, name, descriptor);
  };
}

/** A multimap view whose `get(k)` (and `keySet()`) answer arrays in reverse order in 'reverse' mode, recording what is read. */
function viewOf<K, V>(
  map: Multimap<K, V>,
  mode: Mode,
  onGet: (key: K, size: number) => void,
  onKeySet?: (size: number) => void,
): Multimap<K, V> {
  const flip = <T>(values: T[]): T[] => (mode === 'reverse' ? values.reverse() : values);
  return new Proxy(map, {
    get(target, property) {
      if (property === 'get') {
        return (key: K) => {
          const values = [...target.get(key)];
          onGet(key, values.length);
          return flip(values);
        };
      }
      if (property === 'keySet' && onKeySet !== undefined) {
        return () => {
          const keys = [...target.keySet()];
          onKeySet(keys.length);
          return flip(keys);
        };
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}

const reverseSet = <T>(set: Set<T>): void => {
  const items = [...set].reverse();
  set.clear();
  items.forEach((item) => set.add(item));
};

/** The distinct segments of every start edge of a routed graph. */
function segmentsOf(graph: LGraph): SplineSegment[] {
  const segments = new Set<SplineSegment>();
  for (const layer of graph.getLayers()) {
    for (const node of layer.getNodes()) {
      for (const edge of node.getOutgoingEdges()) {
        (edge.getProperty(InternalProperties.SPLINE_ROUTE_START) ?? []).forEach((segment) => segments.add(segment));
      }
    }
  }
  return [...segments];
}

type PrivateState = {
  edgeToSegmentMap: Map<unknown, SplineSegment>;
  successingEdge: Map<unknown, unknown>;
};

function installExternalExtensions(mode: Mode): Restore {
  return patchMethod(
    ComponentsToCGraphTransformer.prototype,
    'getExternalExtensions',
    (original) =>
      function (this: unknown) {
        const map = original.call(this as never) as Map<unknown, unknown>;
        mark('externalExtensions', map.size > 1);
        return mode === 'reverse' ? reversedCopy(map) : map;
      },
  );
}

function installCompactorExtensions(mode: Mode): Restore {
  return patchMethod(
    ComponentsCompactor.prototype,
    'convertExternalEdges',
    (original) =>
      function (this: unknown, ...args: never[]) {
        const map = original.call(this as never, ...args) as Multimap<Direction, unknown>;
        mark('compactorExternalExtensions', false);
        return viewOf(map, mode, (_key, size) => {
          if (size > 1) {
            mark('compactorExternalExtensions', true);
          }
        });
      },
  );
}

function installSlPortsBySide(mode: Mode): Restore {
  return patchMethod(
    SelfHyperLoop.prototype,
    'getSLPortsBySide',
    (original) =>
      function (this: unknown, ...args: never[]) {
        const result = original.call(this as never, ...args);
        if (args.length > 0) {
          return result;
        }
        return viewOf(
          result as Multimap<unknown, unknown>,
          mode,
          () => undefined,
          (size) => {
            mark('slPortsBySide', size > 1);
          },
        );
      },
  );
}

function installLEdgeMap(mode: Mode): Restore {
  return patchMethod(
    NetworkSimplexCompaction.prototype,
    'addInvertedPortConstraints',
    (original) =>
      function (this: unknown, lEdge: never, cNode: never, lEdgeMap: Multimap<unknown, unknown>) {
        const counting = viewOf(lEdgeMap, mode, (_key, size) => {
          lEdgeMapGets += 1;
          if (size > 0) {
            lEdgeMapReads += 1;
            mark('lEdgeMap', size > 1);
          }
        });
        return original.call(this as never, lEdge, cNode, counting as never);
      },
  );
}

/** The patches of every site (in `count` mode they only record; in `reverse` mode they also flip the order). */
const INSTALLERS: Record<Site, (mode: Mode) => Restore> = {
  externalExtensions: installExternalExtensions,
  externalPlaceholder: (mode) => installPlaceholder(mode),
  compactorExternalExtensions: installCompactorExtensions,
  slPortsBySide: installSlPortsBySide,
  lEdgeMap: installLEdgeMap,
  splineRouter: (mode) => installSplineRouter(mode === 'reverse'),
  splineTransformer: (mode) => installSplineTransformer(mode === 'reverse'),
};

const installSite = (site: Site, mode: Mode): Restore => INSTALLERS[site](mode);

function installPlaceholder(mode: Mode): Restore {
  const restoreGetter = patchMethod(
    ComponentsToCGraphTransformer.prototype,
    'getExternalPlaceholder',
    (original) =>
      function (this: unknown) {
        const map = original.call(this as never) as Multimap<Direction, unknown>;
        return viewOf(map, mode, (direction, size) => {
          mark('externalPlaceholder', size > 1);
          if (size > 0) {
            (placeholderDirs.get(currentRow) ?? placeholderDirs.set(currentRow, new Set()).get(currentRow)!).add(
              direction,
            );
          }
        });
      },
  );
  // LEFT_RIGHT / UP_DOWN (`OneDimensionalComponentsCompaction.java:65-66`): iterated; the twin reverses them
  const flipped = (a: Direction, b: Direction): Set<Direction> => new Set(mode === 'reverse' ? [b, a] : [a, b]);
  const restoreLr = patchStaticGetter(OneDimensionalComponentsCompaction, 'LEFT_RIGHT', () =>
    flipped(Direction.LEFT, Direction.RIGHT),
  );
  const restoreUd = patchStaticGetter(OneDimensionalComponentsCompaction, 'UP_DOWN', () =>
    flipped(Direction.UP, Direction.DOWN),
  );
  return () => {
    restoreUd();
    restoreLr();
    restoreGetter();
  };
}

/** `getSplinePath` reads the first edge of the first and the last segment of the chain it walks. */
function installSplineRouter(reverse: boolean): Restore {
  return patchMethod(
    SplineEdgeRouter.prototype,
    'getSplinePath',
    (original) =>
      function (this: { state: PrivateState }, start: never) {
        const chain: SplineSegment[] = [];
        let current: unknown = start;
        while (current !== undefined) {
          chain.push(this.state.edgeToSegmentMap.get(current)!);
          current = this.state.successingEdge.get(current);
        }
        const readSegments = new Set([chain[0]!, chain[chain.length - 1]!]);
        readSegments.forEach((segment) => {
          mark('splineRouter', segment.edges.size > 1);
        });
        const read = [...readSegments].filter((segment) => segment.edges.size > 1);
        if (!reverse) {
          return original.call(this as never, start);
        }
        // reversed for the read only: later readers see the original order again
        const saved = read.map((segment) => [segment, [...segment.edges]] as const);
        read.forEach((segment) => {
          segmentsReversed += 1;
          reverseSet(segment.edges);
        });
        try {
          return original.call(this as never, start);
        } finally {
          saved.forEach(([segment, edges]) => {
            segment.edges.clear();
            edges.forEach((edge) => segment.edges.add(edge));
          });
        }
      },
  );
}

/** `collectVerticalSegmentsSplines` reads the first edge of every non-straight segment of the graph handed to `transform`. */
function installSplineTransformer(reverse: boolean): Restore {
  const done = new WeakSet<SplineSegment>();
  return patchMethod(
    LGraphToCGraphTransformer.prototype,
    'transform',
    (original) =>
      function (this: unknown, graph: LGraph) {
        for (const segment of segmentsOf(graph).filter((candidate) => !candidate.isStraight)) {
          mark('splineTransformer', segment.edges.size > 1);
          if (reverse && segment.edges.size > 1 && !done.has(segment)) {
            done.add(segment);
            segmentsReversed += 1;
            reverseSet(segment.edges);
          }
        }
        return original.call(this as never, graph as never);
      },
  );
}

function replayWith(row: LoopsRow, sites: readonly Site[], mode: Mode): string[] {
  currentRow = row.id;
  const restores = sites.map((site) => installSite(site, mode));
  try {
    return replayLoopsRow(row).map((mismatch) => mismatch.message);
  } finally {
    restores.reverse().forEach((restore) => {
      restore();
    });
  }
}

const TWIN_TIMEOUT_MS = 60_000;
const rows = loadLoopsRows();
const ALL_SITES: readonly Site[] = [...AD10_SITES, 'splineRouter', 'splineTransformer'];
const rowsOf = (site: Site, from: Map<Site, Set<string>> = reached): LoopsRow[] =>
  rows.filter((row) => from.get(site)?.has(row.id) === true);

describe('W6 / W7 twins', { timeout: TWIN_TIMEOUT_MS }, () => {
  it('counts which rows reach each site', () => {
    registerStepProcessor('DummySelfLoopProcessor', () => new DummySelfLoopProcessor());
    for (const row of rows) {
      expect(replayWith(row, ALL_SITES, 'count'), row.id).toEqual([]);
    }
    for (const site of AD10_SITES) {
      expect(rowsOf(site).length, site).toBeGreaterThan(0);
      expect(rowsOf(site, multi).length, `${site} with more than one element`).toBeGreaterThan(0);
    }
  });

  it('reaches LEFT_RIGHT / UP_DOWN with both directions populated', () => {
    const both = [...placeholderDirs.values()].filter(
      (dirs) =>
        (dirs.has(Direction.LEFT) && dirs.has(Direction.RIGHT)) || (dirs.has(Direction.UP) && dirs.has(Direction.DOWN)),
    );
    expect(both.length).toBeGreaterThan(0);
  });

  for (const site of AD10_SITES) {
    it(`${site}: every reaching row equals the oracle with the iteration reversed`, () => {
      const reaching = rowsOf(site);
      expect(reaching.length).toBeGreaterThan(0);
      for (const row of reaching) {
        expect(replayWith(row, [site], 'reverse'), `${site} ${row.id}`).toEqual([]);
      }
    });
  }

  it('LEFT_RIGHT / UP_DOWN: every row reaching the placeholders equals the oracle', () => {
    for (const row of rowsOf('externalPlaceholder')) {
      expect(replayWith(row, ['externalPlaceholder'], 'reverse'), row.id).toEqual([]);
    }
  });

  it('R9 getSplinePath: every row with a multi-edge segment at a chain end equals the oracle with edges reversed', () => {
    const before = segmentsReversed;
    const reaching = rowsOf('splineRouter', multi);
    expect(reaching.length).toBeGreaterThan(0);
    for (const row of reaching) {
      expect(replayWith(row, ['splineRouter'], 'reverse'), row.id).toEqual([]);
    }
    expect(segmentsReversed - before).toBeGreaterThan(0);
  });

  // The representative edge of a vertical segment carries the junction points the compaction moves
  // (`VerticalSegment` reads `lEdge.getProperty(JUNCTION_POINTS)`), so reversing the set swaps which edge of a hyperedge
  // segment ends up with them: only insertion order (the oracle's order under -XX:hashCode=2) matches.
  it('R9 collectVerticalSegmentsSplines: only insertion order matches, on the rows where the segment edges carry junction points', () => {
    const before = segmentsReversed;
    const reaching = rowsOf('splineTransformer', multi);
    expect(reaching.length).toBeGreaterThan(0);
    const differing = reaching.filter((row) => replayWith(row, ['splineTransformer'], 'reverse').length > 0);
    expect(segmentsReversed - before).toBeGreaterThan(0);
    expect(differing.length).toBeGreaterThan(0);
    for (const row of differing) {
      const messages = replayWith(row, ['splineTransformer'], 'reverse');
      expect(
        messages.every((message) => message.includes('junctionPoints')),
        row.id,
      ).toBe(true);
    }
  });
});
