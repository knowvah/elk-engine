// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOutline, dumpVertiFlex, rebuildStop } from '../../../../test/helpers/vertiflex-replay-dump.js';
import {
  decodeHex,
  loadVertiFlexRows,
  stateAfter,
  STEP_RELATIVE_X_PLACER,
  type HexPoint,
} from '../../../../test/helpers/vertiflex-replay-rows.js';
import { InternalProperties } from '../InternalProperties.js';
import { OutlineNode } from './OutlineNode.js';

const rows = loadVertiFlexRows('stops');
/** makeSimpleOutlines (RelativeXPlacer.java:565-575) builds four points per outline: head, two inner points, the end part. */
const SIMPLE_OUTLINE_POINTS = 4;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OutlineNode (OutlineNode.java)', () => {
  it('keeps the constructor arguments behind the accessors and is last without next', () => {
    const last = new OutlineNode(1.5, -2, null);
    const head = new OutlineNode(3, 4, last);
    expect([head.getRelativeX(), head.getAbsoluteY(), head.getNext()]).toEqual([3, 4, last]);
    expect([head.isLast(), last.isLast()]).toEqual([false, true]);
    head.setRelativeX(7);
    head.setAbsoluteY(8);
    head.setNext(null);
    expect([head.getRelativeX(), head.getAbsoluteY(), head.isLast()]).toEqual([7, 8, true]);
  });

  it('prints "X:<relativeX>,  Y:<absoluteY>" with Java Double.toString text (OutlineNode.java:80)', () => {
    expect(new OutlineNode(0, 100, null).toString()).toBe('X:0.0,  Y:100.0');
    expect(new OutlineNode(-1.5, 1e-5, null).toString()).toBe('X:-1.5,  Y:1.0E-5');
    expect(new OutlineNode(1e7, -0, null).toString()).toBe('X:1.0E7,  Y:-0.0');
  });

  it('prints the whole chain, one console line per point from the head (OutlineNode.java:96-102)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    new OutlineNode(1, 2, new OutlineNode(3, 4, new OutlineNode(5, 6, null))).printFullOutline();
    expect(log.mock.calls).toEqual([['X:1.0,  Y:2.0'], ['X:3.0,  Y:4.0'], ['X:5.0,  Y:6.0']]);
  });

  it(
    'rebuilds every recorded outline of the RelativeXPlacer stop point for point, ending at the last point',
    { timeout: 60_000 },
    () => {
      let outlines = 0;
      for (const row of rows) {
        const graph = rebuildStop(row, STEP_RELATIVE_X_PLACER);
        for (const entry of stateAfter(row, STEP_RELATIVE_X_PLACER).props) {
          const node = [...graph.getChildren()].find((c) => c.getIdentifier() === entry.id);
          for (const [name, property] of [
            ['LEFT_OUTLINE', InternalProperties.LEFT_OUTLINE],
            ['RIGHT_OUTLINE', InternalProperties.RIGHT_OUTLINE],
          ] as const) {
            const recorded = entry.props[name] as HexPoint[] | undefined;
            if (node === undefined) continue;
            expect(node.hasProperty(property), `${row.id} ${entry.id} ${name}`).toBe(recorded !== undefined);
            if (recorded === undefined) continue;
            const chain: [number, number][] = [];
            for (let o: OutlineNode | null = node.getProperty(property); o !== null; o = o.getNext()) {
              chain.push([o.getRelativeX(), o.getAbsoluteY()]);
            }
            expect(chain, `${row.id} ${entry.id} ${name}`).toEqual(
              recorded!.map((p) => [decodeHex(p[0]), decodeHex(p[1])]),
            );
            expect(buildOutline(recorded!).isLast()).toBe(recorded!.length === 1);
            outlines += 1;
          }
        }
      }
      expect(outlines).toBeGreaterThan(500);
    },
  );

  it(
    'keeps at least the four points of makeSimpleOutlines in every recorded outline, exactly four for a single node (RelativeXPlacer.java:565-575)',
    { timeout: 60_000 },
    () => {
      let checked = 0;
      for (const row of rows) {
        for (const entry of stateAfter(row, STEP_RELATIVE_X_PLACER).props) {
          for (const outline of [entry.props.LEFT_OUTLINE, entry.props.RIGHT_OUTLINE] as (HexPoint[] | undefined)[]) {
            if (outline === undefined) continue;
            expect(outline.length, `${row.id} ${entry.id}`).toBeGreaterThanOrEqual(SIMPLE_OUTLINE_POINTS);
            checked += 1;
          }
        }
      }
      expect(checked).toBeGreaterThan(500);
      const single = rows.find((row) => row.id === 'stops/single/default')!;
      const props = stateAfter(single, STEP_RELATIVE_X_PLACER).props.find((p) => p.id === 'n0')!.props;
      expect([props.LEFT_OUTLINE, props.RIGHT_OUTLINE].map((o) => (o as HexPoint[]).length)).toEqual([
        SIMPLE_OUTLINE_POINTS,
        SIMPLE_OUTLINE_POINTS,
      ]);
    },
  );

  it('dumps what it built: the recorded outline lists survive a rebuild and dump', () => {
    const row = rows[0]!;
    const state = stateAfter(row, STEP_RELATIVE_X_PLACER);
    expect(dumpVertiFlex(rebuildStop(row, STEP_RELATIVE_X_PLACER)).props).toEqual(state.props);
  });
});
