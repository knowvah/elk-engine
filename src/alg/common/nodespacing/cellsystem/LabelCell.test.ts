// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { FakeLabelAdapter, pad } from '../../../../../test/helpers/cell-system-fixtures.js';
import { NodeLabelLocation } from '../internal/NodeLabelLocation.js';
import { HorizontalLabelAlignment } from './HorizontalLabelAlignment.js';
import { LabelCell } from './LabelCell.js';
import { VerticalLabelAlignment } from './VerticalLabelAlignment.js';

const GAP = 4;
const { LEFT, CENTER: H_CENTER, RIGHT } = HorizontalLabelAlignment;
const { TOP, CENTER: V_CENTER, BOTTOM } = VerticalLabelAlignment;

/** A cell at (100, 200, 200 x 100), padding (top 1, right 2, bottom 3, left 4), labels 30x10 and 50x20. */
function cellWith(cell: LabelCell): { cell: LabelCell; first: FakeLabelAdapter; second: FakeLabelAdapter } {
  cell.getCellRectangle().setRect(100, 200, 200, 100);
  pad(cell.getPadding(), 1, 2, 3, 4);
  const first = new FakeLabelAdapter(30, 10);
  const second = new FakeLabelAdapter(50, 20);
  cell.addLabel(first);
  cell.addLabel(second);
  return { cell, first, second };
}

function at(label: FakeLabelAdapter): number[] {
  return [label.position.x, label.position.y];
}

describe('LabelCell', () => {
  describe('construction', () => {
    it('defaults to centered alignment in horizontal layout mode', () => {
      const cell = new LabelCell(GAP);
      expect(cell.getHorizontalAlignment()).toBe(H_CENTER);
      expect(cell.getVerticalAlignment()).toBe(V_CENTER);
      expect(cell.hasLabels()).toBe(false);
      cell.addLabel(new FakeLabelAdapter(30, 10));
      cell.addLabel(new FakeLabelAdapter(50, 20));
      expect(cell.getMinimumWidth()).toBe(50);
      expect(cell.getMinimumHeight()).toBe(34);
    });

    it('takes the layout mode as a second argument', () => {
      const { cell } = cellWith(new LabelCell(GAP, false));
      expect(cell.getMinimumWidth()).toBe(90);
    });

    it('takes alignments from a node label location', () => {
      const horizontal = new LabelCell(GAP, NodeLabelLocation.IN_B_R);
      expect(horizontal.getHorizontalAlignment()).toBe(RIGHT);
      expect(horizontal.getVerticalAlignment()).toBe(BOTTOM);
      const { cell } = cellWith(new LabelCell(GAP, NodeLabelLocation.OUT_T_L, false));
      expect(cell.getHorizontalAlignment()).toBe(LEFT);
      expect(cell.getVerticalAlignment()).toBe(BOTTOM);
      expect(cell.getMinimumWidth()).toBe(90);
    });

    it('chains the alignment setters and rejects null', () => {
      const cell = new LabelCell(GAP);
      expect(cell.setHorizontalAlignment(LEFT)).toBe(cell);
      expect(cell.setVerticalAlignment(TOP)).toBe(cell);
      expect(cell.getHorizontalAlignment()).toBe(LEFT);
      expect(cell.getVerticalAlignment()).toBe(TOP);
      expect(() => cell.setHorizontalAlignment(null)).toThrow('Horizontal alignment cannot be null');
      expect(() => cell.setVerticalAlignment(null)).toThrow('Vertical alignment cannot be null');
    });
  });

  describe('labels', () => {
    it('stacks labels in horizontal mode: widest width, heights plus gaps, plus padding', () => {
      const { cell, first, second } = cellWith(new LabelCell(GAP));
      expect(cell.hasLabels()).toBe(true);
      expect(cell.getLabels()).toEqual([first, second]);
      expect(cell.getMinimumWidth()).toBe(56);
      expect(cell.getMinimumHeight()).toBe(38);
    });

    it('places labels side by side in vertical mode', () => {
      const { cell } = cellWith(new LabelCell(GAP, true));
      const vertical = cellWith(new LabelCell(GAP, false)).cell;
      expect(cell.getMinimumWidth()).toBe(56);
      expect(vertical.getMinimumWidth()).toBe(90);
      expect(vertical.getMinimumHeight()).toBe(24);
    });
  });

  describe('applyLabelLayout in horizontal mode', () => {
    const startY = new Map([
      [TOP, 200],
      [V_CENTER, 233],
      [BOTTOM, 266],
    ]);
    const xs = new Map([
      [LEFT, [104, 104]],
      [H_CENTER, [189, 179]],
      [RIGHT, [268, 248]],
    ]);
    for (const [v, y] of startY) {
      for (const [h, [x1, x2]] of xs) {
        it(`${h.name()} / ${v.name()}`, () => {
          const { cell, first, second } = cellWith(new LabelCell(GAP));
          cell.setHorizontalAlignment(h).setVerticalAlignment(v);
          cell.applyLabelLayout();
          expect(at(first)).toEqual([x1, y]);
          expect(at(second)).toEqual([x2, y + 14]);
        });
      }
    }
  });

  describe('applyLabelLayout in vertical mode', () => {
    const startX = new Map([
      [LEFT, 100],
      [H_CENTER, 158],
      [RIGHT, 216],
    ]);
    const ys = new Map([
      [TOP, [201, 201]],
      [V_CENTER, [246, 241]],
      [BOTTOM, [287, 277]],
    ]);
    for (const [h, x] of startX) {
      for (const [v, [y1, y2]] of ys) {
        it(`${h.name()} / ${v.name()}`, () => {
          const { cell, first, second } = cellWith(new LabelCell(GAP, false));
          cell.setHorizontalAlignment(h).setVerticalAlignment(v);
          cell.applyLabelLayout();
          expect(at(first)).toEqual([x, y1]);
          expect(at(second)).toEqual([x + 34, y2]);
        });
      }
    }
  });
});
