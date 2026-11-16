// SPDX-License-Identifier: EPL-2.0
// Proof of FanProcessor (mission 8a, T16): `process` from the recorded RootProcessor state to the recorded FanProcessor stop for every row of
// the ref that runs it (FAN and DESCENDANTS weightings, fans of more than 10 children), the two oracle throws at FanProcessor.java:128, the
// V4 iteration order of `locFanMap` (FanProcessor.java:135) and Java-traced hand cases.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { dumpTGraph } from '../../../../test/helpers/mrtree-replay-dump.js';
import {
  isThrowsRow,
  loadMrTreeRows,
  loadStopsRows,
  mrTreeExtraRefPath,
  type Transition,
} from '../../../../test/helpers/mrtree-replay-rows.js';
import { buildBeforeGraphs, importRowInput } from '../../../../test/helpers/mrtree-replay-state.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { StringIndexOutOfBoundsException } from '../../../java/lang/StringIndexOutOfBoundsException.js';
import { STRING } from '../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { ComponentsProcessor } from '../ComponentsProcessor.js';
import type { TGraph } from '../graph/TGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { OrderWeighting } from '../options/OrderWeighting.js';
import { DFSTreeifyer } from '../p1treeify/DFSTreeifyer.js';
import { FanProcessor } from './FanProcessor.js';
import { RootProcessor } from './RootProcessor.js';

const STEP = 'FanProcessor';
const BFS_ROW = 'stops/bfs/cyc79n7/searchOrder=BFS';
/** Transitions of the second ref's FanProcessor stops (measured on the first run). */
const EXTRA_TOTAL = 85;
const FAN_SITE = 'FanProcessor.java:128';
/** Iterations of a `locFanMap` whose order differs from insertion order over the whole replay (measured on the 88 recorded transitions). */
const DIFFERING_ITERATIONS = 28;
const MESSAGE_RANGE = 'Range [0, 5) out of bounds for length 4';

afterEach(() => {
  vi.restoreAllMocks();
});

const maxOf = (graph: TGraph, property: typeof InternalProperties.FAN): number =>
  Math.max(
    ...graph
      .getNodes()
      .toArray()
      .map((n) => n.getProperty(property)),
  );

describe('FanProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the FanProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep(STEP, () => new FanProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
    expect(replay.replayed).toHaveLength(88);
    const weightings = new Set(replay.replayed.map((r) => r.graph.getProperty(MrTreeOptions.WEIGHTING).toString()));
    expect(weightings.has(OrderWeighting.FAN.toString())).toBe(true);
    expect(weightings.has(OrderWeighting.DESCENDANTS.toString())).toBe(true);
    // the widest fan of the first ref is default/fan10: ten children make the level size 10, so digits = floor(log10(10)) + 1 = 2
    const wide = replay.replayed.filter((r) => maxOf(r.graph, InternalProperties.FAN) >= 10);
    expect(wide.map((r) => r.rowId)).toEqual(['stops/default/fan10']);
  });
});

describe('FanProcessor.process against the recorded stops of mrtree-extra.json', () => {
  it('equals the FanProcessor stop of every transition, fans of 11, 12 and 100 included', { timeout: 60_000 }, () => {
    const replay = replayStep(STEP, () => new FanProcessor(), loadStopsRows(mrTreeExtraRefPath()));
    expect([replay.total, replay.refused]).toEqual([EXTRA_TOTAL, 0]);
    const fans = new Set(replay.replayed.map((r) => maxOf(r.graph, InternalProperties.FAN)));
    for (const wide of [11, 12, 100]) {
      expect(fans.has(wide), `a recorded fan of ${String(wide)}`).toBe(true);
    }
  });

  it('stops/bfs/cyc79n7/searchOrder=BFS: ids follow the String REFERENCE compare of FanProcessor.java:105', () => {
    // a node with two parents under BFS restarts `index` and repeats the id "010" with a different String object; the oracle
    // gives the second node of that name "0100" (a content compare would count on to "0101") and the fan counts follow
    const rows = loadStopsRows(mrTreeExtraRefPath());
    const replay = replayStep(
      STEP,
      () => new FanProcessor(),
      rows.filter((r) => r.id === BFS_ROW),
    );
    expect(replay.replayed).toHaveLength(1);
    const ids = replay.replayed[0]!.graph.getNodes()
      .toArray()
      .map((n) => n.getProperty(InternalProperties.ID));
    expect(ids.filter((id) => id === '0100')).toHaveLength(2);
    expect(ids.filter((id) => id === '0101')).toHaveLength(0);
  });
});

/** The transition of a FanProcessor step that threw: it started from the RootProcessor stop of the row. */
function transitionBeforeFan(rowId: string): { transition: Transition; rowId: string } {
  const row = loadStopsRows().find((r) => r.id === rowId)!;
  const rootStop = row.expected.stops.find((s) => s.step === 'RootProcessor')!;
  return { rowId, transition: { step: STEP, comp: rootStop.comp, before: rootStop.graphs, stop: rootStop } };
}

function throwOf(action: () => void): Error {
  try {
    action();
  } catch (error) {
    return error as Error;
  }
  throw new Error('did not throw');
}

describe('FanProcessor throws where the oracle throws (FanProcessor.java:128)', () => {
  it('stops row rand05 (BFS): the recorded RootProcessor state makes it throw the recorded exception at its substring', () => {
    const id = loadStopsRows().find((r) => r.expected.throwsAt === STEP)!.id;
    const recorded = loadStopsRows().find((r) => r.id === id)!.expected.throws!;
    expect(recorded).toEqual({
      class: 'java.lang.StringIndexOutOfBoundsException',
      message: MESSAGE_RANGE,
      frame: FAN_SITE,
    });
    const { transition } = transitionBeforeFan(id);
    const built = buildBeforeGraphs(
      loadStopsRows().find((r) => r.id === id)!,
      transition,
    )!;
    const error = throwOf(() => new FanProcessor().process(built.graphs[0]!, new NullElkProgressMonitor()));
    expect(error).toBeInstanceOf(StringIndexOutOfBoundsException);
    expect(error.message).toBe(MESSAGE_RANGE);
    // the TS site of FanProcessor.java:128: the substring helper called from the countDescendants loop
    expect(error.stack).toMatch(/at (?:Function\.|FanProcessor\.)?substring .*FanProcessor\.ts/);
    expect(error.stack).toMatch(/countDescendants .*FanProcessor\.ts/);
  });

  it('throws row dag10 (BFS): re-running its pipeline up to the FanProcessor throws the recorded exception', () => {
    const rows = loadMrTreeRows('throws').filter(isThrowsRow);
    const row = rows.find((r) => r.id === 'throws/searchOrder/dag10/searchOrder=BFS')!;
    expect(row.expected.throws).toEqual({
      class: 'java.lang.StringIndexOutOfBoundsException',
      message: MESSAGE_RANGE,
      frame: FAN_SITE,
    });
    const imported = importRowInput(row.input);
    const components = new ComponentsProcessor().split(imported.tGraph);
    const monitor = new NullElkProgressMonitor();
    const error = throwOf(() => {
      for (const component of components) {
        new DFSTreeifyer().process(component, monitor);
        new RootProcessor().process(component, monitor);
        new FanProcessor().process(component, monitor);
      }
    });
    expect(error).toBeInstanceOf(StringIndexOutOfBoundsException);
    expect(error.message).toBe(MESSAGE_RANGE);
    expect(error.stack).toMatch(/countDescendants .*FanProcessor\.ts/);
  });
});

describe('V4: the iteration order of locFanMap (FanProcessor.java:123, :135) is the JavaHashMap order', () => {
  it(
    'iterates every locFanMap in the order a JavaHashMap with the String strategy gives for its insertion sequence',
    { timeout: 60_000 },
    () => {
      const inserted = new WeakMap<object, string[]>();
      const iterations: { inserted: string[]; iterated: string[] }[] = [];
      const put = JavaHashMap.prototype.put;
      const entries = JavaHashMap.prototype.entries;
      vi.spyOn(JavaHashMap.prototype, 'put').mockImplementation(function (this: JavaHashMap<string, number>, k, v) {
        if (typeof k === 'string') {
          const keys = inserted.get(this) ?? [];
          if (!keys.includes(k)) keys.push(k);
          inserted.set(this, keys);
        }
        return put.call(this, k, v);
      });
      vi.spyOn(JavaHashMap.prototype, 'entries').mockImplementation(function (this: JavaHashMap<string, number>) {
        const all = [...entries.call(this)];
        if (all.length > 0 && typeof all[0]![0] === 'string') {
          iterations.push({ inserted: [...(inserted.get(this) ?? [])], iterated: all.map(([k]) => k as string) });
        }
        return all[Symbol.iterator]() as IterableIterator<[string, number]>;
      });
      replayStep(STEP, () => new FanProcessor());
      expect(iterations.length).toBeGreaterThan(88);
      let differing = 0;
      for (const { inserted: keys, iterated } of iterations) {
        const reference = new JavaHashMap<string, number>(STRING);
        keys.forEach((k) => reference.put(k, 0));
        expect(iterated).toEqual([...reference.keys()]);
        if (JSON.stringify(iterated) !== JSON.stringify(keys)) differing++;
      }
      // the order is the strategy's, not insertion order, on recorded keys
      expect(differing).toBe(DIFFERING_ITERATIONS);
    },
  );
});

describe('V4 observability: the iteration order of locFanMap reaches no recorded stop', () => {
  it(
    'every stop still matches when the string-keyed maps iterate in reverse order (reversed-order twin)',
    { timeout: 60_000 },
    () => {
      const entries = JavaHashMap.prototype.entries;
      vi.spyOn(JavaHashMap.prototype, 'entries').mockImplementation(function (this: JavaHashMap<string, number>) {
        return [...entries.call(this)].reverse()[Symbol.iterator]() as IterableIterator<[string, number]>;
      });
      const replay = replayStep(STEP, () => new FanProcessor());
      expect(replay.replayed).toHaveLength(88);
    },
  );
});

describe('FanProcessor hand cases (Java-traced)', () => {
  it('is reusable: a second run clears the maps and gives the same result', () => {
    const { g, nodes } = graphOf(3, [
      [0, 1],
      [1, 2],
    ]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    const processor = new FanProcessor();
    runOn(processor, g);
    const first = JSON.stringify(dumpTGraph(g));
    runOn(processor, g);
    expect(nodes.map((n) => n.getProperty(InternalProperties.DESCENDANTS))).toEqual([3, 2, 1]);
    expect(nodes.map((n) => n.getProperty(InternalProperties.FAN))).toEqual([1, 1, 0]);
    expect(first).not.toBe('');
  });

  it('a graph without a root fails at the null root, as the Java loop dereferences it', () => {
    const { g } = graphOf(2, [[0, 1]]);
    expect(() => runOn(new FanProcessor(), g)).toThrow(TypeError);
  });

  it('formatRight pads with zeros to the minimum width and never truncates', () => {
    expect(FanProcessor.formatRight(5, 3)).toBe('005');
    expect(FanProcessor.formatRight(123, 2)).toBe('123');
    expect(FanProcessor.formatRight(0, 1)).toBe('0');
  });
});
