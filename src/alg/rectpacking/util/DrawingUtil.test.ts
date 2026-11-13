// SPDX-License-Identifier: EPL-2.0
// Proof of DrawingUtil (mission 8c, T6): the scale measure of every recorded GreedyWidthApproximator drawing, the dimensions of the
// recorded SimplePlacement stops (SimplePlacement.java:51-90 uses them to set DRAWING_WIDTH and ADDITIONAL_HEIGHT) and the extent of
// recorded node boxes.
import { describe, expect, it } from 'vitest';
import { dumpRectRows } from '../../../../test/helpers/rectpacking-replay-dump.js';
import {
  collectStops,
  decodeHex,
  STOP_AFTER_SIMPLE_PLACEMENT,
  type DrawingEntry,
} from '../../../../test/helpers/rectpacking-replay-rows.js';
import { replayRows, replayStop } from '../../../../test/helpers/rectpacking-replay-run.js';
import { DrawingUtil } from './DrawingUtil.js';

const LOOP = { timeout: 60_000 };
const num = decodeHex;
const GREEDY = 'after:GreedyWidthApproximator';

function eachDrawing(visit: (drawing: DrawingEntry) => void): number {
  let visited = 0;
  for (const found of collectStops([GREEDY])) {
    if (found.stop.state.drawing !== undefined) {
      visit(found.stop.state.drawing);
      visited++;
    }
  }
  return visited;
}

describe('DrawingUtil (DrawingUtil.java)', () => {
  it(
    'computeScaleMeasure is the recorded scale measure of every GreedyWidthApproximator stop (DrawingUtil.java:36-38)',
    LOOP,
    () => {
      let measured = 0;
      eachDrawing((d) => {
        // DrawingData stores the scale measure only for a positive size (DrawingData.java:101-105); the two zero-height rows record 0.
        if (num(d.drawingWidth) > 0 && num(d.drawingHeight) > 0) {
          expect(DrawingUtil.computeScaleMeasure(num(d.drawingWidth), num(d.drawingHeight), num(d.dar))).toBe(
            num(d.scaleMeasure),
          );
          measured++;
        } else {
          expect(num(d.scaleMeasure)).toBe(0);
        }
      });
      expect(measured).toBe(153);
    },
  );

  it(
    'calculateDimensions of the recorded rows gives the DRAWING_WIDTH and ADDITIONAL_HEIGHT SimplePlacement recorded (DrawingUtil.java:60-71)',
    LOOP,
    () => {
      let checked = 0;
      for (const found of collectStops([STOP_AFTER_SIMPLE_PLACEMENT])) {
        if (found.stop.state.rows !== null) {
          const { rebuilt } = replayRows({ ...found, stop: found.stop });
          const { props, padding } = found.stop.state;
          const spacing = num(found.stop.state.rows.rows[0]?.spacing ?? '0000000000000000');
          const size = DrawingUtil.calculateDimensions(rebuilt.list, spacing);
          const [top, right, bottom, left] = padding!.map(num) as [number, number, number, number];
          const width = Math.max(size.x, num(props.minWidth!) - (left + right));
          const height = Math.max(size.y, num(props.minHeight!) - (top + bottom));
          expect(width).toBe(num(props.drawingWidth!));
          expect(height - size.y).toBe(num(props.additionalHeight!));
          expect(dumpRectRows(rebuilt.list).listSize).toBe(rebuilt.list.length);
          checked++;
        }
      }
      expect(checked).toBe(
        collectStops([STOP_AFTER_SIMPLE_PLACEMENT]).filter((f) => f.stop.state.rows !== null).length,
      );
      expect(checked).toBeGreaterThan(0);
    },
  );

  it('calculateDimensionsOfRectangles is the extent of the recorded node boxes (DrawingUtil.java:79-86)', LOOP, () => {
    for (const found of collectStops([STOP_AFTER_SIMPLE_PLACEMENT])) {
      const replay = replayStop(found);
      const direct = new Set([...replay.layout.getChildren()].map((n) => n.getIdentifier()));
      const boxes = found.stop.state.nodes.filter((n) => direct.has(n.id));
      const width = Math.max(0, ...boxes.map((b) => num(b.w) + num(b.x)));
      const height = Math.max(0, ...boxes.map((b) => num(b.h) + num(b.y)));
      const size = DrawingUtil.calculateDimensionsOfRectangles(replay.layout.getChildren());
      expect([size.x, size.y]).toEqual([width, height]);
    }
  });

  it('resetCoordinates moves every node to (0, 0) (DrawingUtil.java:48-52)', () => {
    const [found] = collectStops([STOP_AFTER_SIMPLE_PLACEMENT]);
    const replay = replayStop(found!);
    const children = [...replay.layout.getChildren()];
    DrawingUtil.resetCoordinates(children);
    expect(children.map((n) => [n.getX(), n.getY()])).toEqual(children.map(() => [0, 0]));
    expect(children.length).toBe(replay.layout.getChildren().size());
  });

  it('DrawingUtil.java:30-31: the constructor is hidden and builds an empty holder', () => {
    const instance = Reflect.construct(DrawingUtil as unknown as new () => object, []);
    expect(Object.keys(instance)).toEqual([]);
  });
});
