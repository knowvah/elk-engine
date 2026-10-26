// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { atomicCell, pad } from '../../../../../test/helpers/cell-system-fixtures.js';
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { ContainerArea } from './ContainerArea.js';
import { StripContainerCell } from './StripContainerCell.js';
import { StripContainerCellStrip } from './StripContainerCellStrip.js';

const GAP = 5;

/** The cell rectangle and padding (top 1, right 2, bottom 3, left 4) used by the layout tests. */
function placed(cell: StripContainerCell): StripContainerCell {
  cell.getCellRectangle().setRect(100, 200, 200, 100);
  pad(cell.getPadding(), 1, 2, 3, 4);
  return cell;
}

function strip(mode: StripContainerCellStrip, symmetrical = false): StripContainerCell {
  const cell = placed(new StripContainerCell(mode, symmetrical, GAP));
  cell.setCell(ContainerArea.BEGIN, atomicCell(10, 20));
  cell.setCell(ContainerArea.CENTER, atomicCell(30, 40));
  cell.setCell(ContainerArea.END, atomicCell(50, 15));
  return cell;
}

function rect(cell: StripContainerCell, area: ContainerArea): ElkRectangle {
  const child = cell.getCell(area);
  if (child === null) {
    throw new Error('missing child');
  }
  return child.getCellRectangle();
}

function geometry(cell: StripContainerCell, area: ContainerArea): [number, number, number, number] {
  const r = rect(cell, area);
  return [r.x, r.y, r.width, r.height];
}

describe('StripContainerCell', () => {
  it('exposes mode, gap and cells', () => {
    const cell = strip(StripContainerCellStrip.HORIZONTAL);
    expect(cell.getContainerMode()).toBe(StripContainerCellStrip.HORIZONTAL);
    expect(cell.getGap()).toBe(GAP);
    expect(cell.getCell(ContainerArea.CENTER)?.getMinimumWidth()).toBe(30);
  });

  it('has no cells by default and zero minimum size', () => {
    const cell = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, false, GAP);
    pad(cell.getPadding(), 1, 2, 3, 4);
    expect(cell.getCell(ContainerArea.BEGIN)).toBeNull();
    expect(cell.getMinimumWidth()).toBe(0);
    expect(cell.getMinimumHeight()).toBe(0);
    const vertical = new StripContainerCell(StripContainerCellStrip.VERTICAL, false, GAP);
    expect(vertical.getMinimumWidth()).toBe(0);
    expect(vertical.getMinimumHeight()).toBe(0);
  });

  describe('horizontal strip (columns)', () => {
    it('computes minimum size: widths summed with gaps, heights maximised, plus padding', () => {
      const cell = strip(StripContainerCellStrip.HORIZONTAL);
      expect(cell.getMinimumWidth()).toBe(106);
      expect(cell.getMinimumHeight()).toBe(44);
    });

    it('makes outer columns equally wide when symmetrical', () => {
      const cell = strip(StripContainerCellStrip.HORIZONTAL, true);
      expect(cell.getMinimumWidth()).toBe(146);
    });

    it('lays out columns horizontally and fills the height vertically', () => {
      const cell = strip(StripContainerCellStrip.HORIZONTAL);
      cell.layoutChildrenHorizontally();
      cell.layoutChildrenVertically();
      expect(geometry(cell, ContainerArea.BEGIN)).toEqual([104, 201, 10, 96]);
      expect(geometry(cell, ContainerArea.CENTER)).toEqual([119, 201, 124, 96]);
      expect(geometry(cell, ContainerArea.END)).toEqual([248, 201, 50, 96]);
    });

    it('lays out symmetrical outer columns', () => {
      const cell = strip(StripContainerCellStrip.HORIZONTAL, true);
      cell.layoutChildrenHorizontally();
      expect(rect(cell, ContainerArea.BEGIN).x).toBe(104);
      expect(rect(cell, ContainerArea.BEGIN).width).toBe(50);
      expect(rect(cell, ContainerArea.END).x).toBe(248);
      expect(rect(cell, ContainerArea.END).width).toBe(50);
      expect(rect(cell, ContainerArea.CENTER).x).toBe(159);
      expect(rect(cell, ContainerArea.CENTER).width).toBe(84);
    });

    it('keeps the minimum center width even when it overlaps the outer cells', () => {
      const cell = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, false, GAP);
      cell.getCellRectangle().setRect(0, 0, 80, 10);
      cell.setCell(ContainerArea.BEGIN, atomicCell(10, 20));
      cell.setCell(ContainerArea.CENTER, atomicCell(30, 40));
      cell.setCell(ContainerArea.END, atomicCell(50, 15));
      cell.layoutChildrenHorizontally();
      expect(rect(cell, ContainerArea.BEGIN).x).toBe(0);
      expect(rect(cell, ContainerArea.CENTER).x).toBe(5);
      expect(rect(cell, ContainerArea.CENTER).width).toBe(30);
      expect(rect(cell, ContainerArea.END).x).toBe(30);
    });

    it('counts only the cells with a non-zero minimum width, and ignores zero-width atomic cells', () => {
      const cell = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, false, GAP);
      const empty = atomicCell(0, 10);
      pad(empty.getPadding(), 0, 3, 0, 3);
      cell.setCell(ContainerArea.BEGIN, empty);
      cell.setCell(ContainerArea.CENTER, atomicCell(30, 40));
      expect(cell.getMinimumWidth()).toBe(30);
    });

    it('ignores cells that do not contribute', () => {
      const cell = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, false, GAP);
      cell.setCell(ContainerArea.BEGIN, atomicCell(10, 20, false));
      cell.setCell(ContainerArea.CENTER, atomicCell(30, 40));
      expect(cell.getMinimumWidth()).toBe(30);
      expect(cell.getMinimumHeight()).toBe(40);
      cell.setCell(ContainerArea.CENTER, atomicCell(30, 40, false));
      expect(cell.getMinimumWidth()).toBe(0);
      expect(cell.getMinimumHeight()).toBe(0);
    });
  });

  describe('vertical strip (rows)', () => {
    it('computes minimum size: widths maximised, heights summed with gaps, plus padding', () => {
      const cell = strip(StripContainerCellStrip.VERTICAL);
      expect(cell.getMinimumWidth()).toBe(56);
      expect(cell.getMinimumHeight()).toBe(89);
    });

    it('lays out rows vertically and fills the width horizontally', () => {
      const cell = strip(StripContainerCellStrip.VERTICAL);
      cell.layoutChildrenHorizontally();
      cell.layoutChildrenVertically();
      expect(geometry(cell, ContainerArea.BEGIN)).toEqual([104, 201, 194, 20]);
      expect(geometry(cell, ContainerArea.CENTER)).toEqual([104, 226, 194, 51]);
      expect(geometry(cell, ContainerArea.END)).toEqual([104, 282, 194, 15]);
    });

    it('makes outer rows equally high when symmetrical', () => {
      const cell = strip(StripContainerCellStrip.VERTICAL, true);
      expect(cell.getMinimumHeight()).toBe(20 + 40 + 20 + 2 * GAP + 4);
      cell.layoutChildrenVertically();
      expect(rect(cell, ContainerArea.BEGIN).height).toBe(20);
      expect(rect(cell, ContainerArea.END).height).toBe(20);
      expect(rect(cell, ContainerArea.END).y).toBe(200 + 100 - 3 - 20);
    });

    it('ignores cells that do not contribute', () => {
      const cell = new StripContainerCell(StripContainerCellStrip.VERTICAL, false, GAP);
      cell.setCell(ContainerArea.BEGIN, atomicCell(10, 20, false));
      cell.setCell(ContainerArea.CENTER, atomicCell(30, 40));
      expect(cell.getMinimumWidth()).toBe(30);
      expect(cell.getMinimumHeight()).toBe(40);
    });
  });

  it('lays out nested container cells recursively', () => {
    const outer = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, false, 0);
    outer.getCellRectangle().setRect(0, 0, 100, 100);
    const inner = new StripContainerCell(StripContainerCellStrip.VERTICAL, false, 0);
    inner.setCell(ContainerArea.BEGIN, atomicCell(10, 10));
    inner.setCell(ContainerArea.END, atomicCell(10, 10));
    outer.setCell(ContainerArea.CENTER, inner);
    outer.layoutChildrenHorizontally();
    outer.layoutChildrenVertically();
    expect(geometry(outer, ContainerArea.CENTER)).toEqual([0, 0, 100, 100]);
    expect(geometry(inner, ContainerArea.BEGIN)).toEqual([0, 0, 100, 10]);
    expect(geometry(inner, ContainerArea.END)).toEqual([0, 90, 100, 10]);
  });
});
