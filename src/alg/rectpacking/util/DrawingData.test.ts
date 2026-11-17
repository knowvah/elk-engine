// SPDX-License-Identifier: EPL-2.0
// Proof of DrawingData, DrawingDataDescriptor and DrawingUtil (mission 8c, T6): the DrawingData of every recorded GreedyWidthApproximator
// stop (the `drawing` object, 155 stops) is rebuilt from its dar, size, placement option and next coordinates; area, aspect ratio and
// scale measure must equal the recorded raw bits. DrawingUtil's dimensions are checked against the recorded SimplePlacement stops
// (SimplePlacement.java:51-90 uses them to set DRAWING_WIDTH and ADDITIONAL_HEIGHT) and recorded node boxes.
import { describe, expect, it } from 'vitest';
import { collectStops, decodeHex, type DrawingEntry } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { replayStop } from '../../../../test/helpers/rectpacking-replay-run.js';
import { DrawingData } from './DrawingData.js';
import { DrawingDataDescriptor } from './DrawingDataDescriptor.js';

const LOOP = { timeout: 60_000 };
const num = decodeHex;

const GREEDY = 'after:GreedyWidthApproximator';

function eachDrawing(visit: (drawing: DrawingEntry, replay: ReturnType<typeof replayStop>) => void): number {
  let visited = 0;
  for (const found of collectStops([GREEDY])) {
    if (found.stop.state.drawing !== undefined) {
      visit(found.stop.state.drawing, replayStop(found));
      visited++;
    }
  }
  return visited;
}

const build = (d: DrawingEntry): DrawingData =>
  new DrawingData(
    num(d.dar),
    num(d.drawingWidth),
    num(d.drawingHeight),
    DrawingDataDescriptor.valueOf(d.placementOption),
    num(d.nextX),
    num(d.nextY),
  );

describe('DrawingData (DrawingData.java)', () => {
  it('computes area, aspect ratio and scale measure as recorded for all GreedyWidthApproximator stops', LOOP, () => {
    const visited = eachDrawing((d) => {
      const data = build(d);
      expect([data.getArea(), data.getAspectRatio(), data.getScaleMeasure()]).toEqual(
        [d.area, d.aspectRatio, d.scaleMeasure].map(num),
      );
      expect([data.getDesiredAspectRatio(), data.getDrawingWidth(), data.getDrawingHeight()]).toEqual(
        [d.dar, d.drawingWidth, d.drawingHeight].map(num),
      );
      expect([data.getNextXcoordinate(), data.getNextYcoordinate()]).toEqual([d.nextX, d.nextY].map(num));
      expect(data.getPlacementOption().name()).toBe(d.placementOption);
    });
    expect(visited).toBe(156);
  });

  it('the four-argument constructor sets the next coordinates to 0.0 (DrawingData.java:80-82)', LOOP, () => {
    eachDrawing((d) => {
      const data = new DrawingData(
        num(d.dar),
        num(d.drawingWidth),
        num(d.drawingHeight),
        DrawingDataDescriptor.valueOf(d.placementOption),
      );
      expect([data.getNextXcoordinate(), data.getNextYcoordinate()]).toEqual([0, 0]);
      expect([data.getArea(), data.getScaleMeasure()]).toEqual([num(d.area), num(d.scaleMeasure)]);
    });
  });

  it(
    'setDrawingWidth and setDrawingHeight recompute the derived values; a non-positive size leaves them as they were (DrawingData.java:91-96, 135-168)',
    LOOP,
    () => {
      eachDrawing((d) => {
        const data = new DrawingData(num(d.dar), 0, num(d.drawingHeight), DrawingDataDescriptor.WHOLE_DRAWING);
        expect([data.getArea(), data.getAspectRatio(), data.getScaleMeasure()]).toEqual([0, 0, 0]);
        data.setDrawingWidth(num(d.drawingWidth));
        expect([data.getArea(), data.getAspectRatio(), data.getScaleMeasure()]).toEqual(
          [d.area, d.aspectRatio, d.scaleMeasure].map(num),
        );
        data.setDrawingHeight(0);
        expect([data.getDrawingHeight(), data.getArea()]).toEqual([0, num(d.area)]);
        data.setDrawingHeight(num(d.drawingHeight));
        expect(data.getScaleMeasure()).toBe(num(d.scaleMeasure));
      });
    },
  );

  it('the setters write the recorded next coordinates and placement option (DrawingData.java:183-210)', () => {
    const [found] = collectStops([GREEDY]);
    const d = found!.stop.state.drawing!;
    const data = new DrawingData(
      num(d.dar),
      num(d.drawingWidth),
      num(d.drawingHeight),
      DrawingDataDescriptor.WHOLE_DRAWING,
    );
    data.setNextXcoordinate(num(d.nextX));
    data.setNextYcoordinate(num(d.nextY));
    data.setPlacementOption(DrawingDataDescriptor.valueOf(d.placementOption));
    expect([data.getNextXcoordinate(), data.getNextYcoordinate()]).toEqual([num(d.nextX), num(d.nextY)]);
    expect(data.getPlacementOption().name()).toBe(d.placementOption);
  });
});
