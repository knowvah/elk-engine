// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { atomicCell, pad } from '../../../../../test/helpers/cell-system-fixtures.js';
import { KVector } from '../../../../core/math/KVector.js';
import { ContainerArea } from './ContainerArea.js';
import { GridContainerCell } from './GridContainerCell.js';

const GAP = 5;
const { BEGIN, CENTER, END } = ContainerArea;

/**
 * A grid at (100, 200, 300 x 200) with padding (top 1, right 2, bottom 3, left 4) and cells
 * r0c0 10x12, r0c2 20x14, r1c1 30x40, r2c1 40x8.
 */
function grid(tabular: boolean, symmetrical = false): GridContainerCell {
  const cell = new GridContainerCell(tabular, symmetrical, GAP);
  cell.getCellRectangle().setRect(100, 200, 300, 200);
  pad(cell.getPadding(), 1, 2, 3, 4);
  cell.setCell(BEGIN, BEGIN, atomicCell(10, 12));
  cell.setCell(BEGIN, END, atomicCell(20, 14));
  cell.setCell(CENTER, CENTER, atomicCell(30, 40));
  cell.setCell(END, CENTER, atomicCell(40, 8));
  return cell;
}

function geometry(cell: GridContainerCell, row: ContainerArea, col: ContainerArea): number[] {
  const child = cell.getCell(row, col);
  if (child === null) {
    throw new Error('missing child');
  }
  const r = child.getCellRectangle();
  return [r.x, r.y, r.width, r.height];
}

function verticalExtent(cell: GridContainerCell, row: ContainerArea, col: ContainerArea): number[] {
  const [, y, , height] = geometry(cell, row, col);
  return [y, height];
}

describe('GridContainerCell', () => {
  it('exposes the gap and the cells and has none by default', () => {
    const cell = grid(false);
    expect(cell.getGap()).toBe(GAP);
    expect(cell.getCell(CENTER, CENTER)?.getMinimumWidth()).toBe(30);
    expect(cell.getCell(END, END)).toBeNull();
  });

  describe('minimum size', () => {
    it('is zero without cells', () => {
      const cell = new GridContainerCell(false, false, GAP);
      pad(cell.getPadding(), 1, 2, 3, 4);
      expect(cell.getMinimumWidth()).toBe(0);
      expect(cell.getMinimumHeight()).toBe(0);
    });

    it('uses the widest row in non-tabular mode', () => {
      const cell = grid(false);
      expect(cell.getMinimumWidth()).toBe(46);
      expect(cell.getMinimumHeight()).toBe(76);
    });

    it('aggregates column widths in tabular mode', () => {
      const cell = grid(true);
      expect(cell.getMinimumWidth()).toBe(86);
      expect(cell.getMinimumHeight()).toBe(76);
    });

    it('applies symmetry to outer columns and rows', () => {
      const cell = grid(false, true);
      expect(cell.getMinimumWidth()).toBe(51);
      expect(cell.getMinimumHeight()).toBe(82);
    });

    it('lets a center cell minimum size raise the center column and row', () => {
      const cell = grid(false);
      cell.setCenterCellMinimumSize(new KVector(70, 90));
      expect(cell.getMinimumWidth()).toBe(116);
      expect(cell.getMinimumHeight()).toBe(126);
    });

    it('copies the center cell minimum size', () => {
      const cell = grid(false);
      const size = new KVector(70, 90);
      cell.setCenterCellMinimumSize(size);
      size.set(1, 1);
      expect(cell.getMinimumWidth()).toBe(116);
    });

    it('uses the center cell alone with onlyCenterCellContributesToMinimumSize', () => {
      const cell = grid(false);
      cell.setOnlyCenterCellContributesToMinimumSize(true);
      expect(cell.getMinimumWidth()).toBe(36);
      expect(cell.getMinimumHeight()).toBe(44);
    });

    it('prefers the explicit center cell minimum size when only the center contributes', () => {
      const cell = grid(false);
      cell.setOnlyCenterCellContributesToMinimumSize(true);
      cell.setCenterCellMinimumSize(new KVector(70, 90));
      expect(cell.getMinimumWidth()).toBe(76);
      expect(cell.getMinimumHeight()).toBe(94);
    });

    it('is zero when only the center contributes but there is no center cell and no size', () => {
      const cell = new GridContainerCell(false, false, GAP);
      cell.setOnlyCenterCellContributesToMinimumSize(true);
      cell.setCell(BEGIN, BEGIN, atomicCell(10, 12));
      expect(cell.getMinimumWidth()).toBe(0);
      expect(cell.getMinimumHeight()).toBe(0);
    });

    it('ignores cells that do not contribute', () => {
      const cell = new GridContainerCell(false, false, GAP);
      cell.setCell(CENTER, CENTER, atomicCell(30, 40, false));
      expect(cell.getMinimumWidth()).toBe(0);
      expect(cell.getMinimumHeight()).toBe(0);
    });
  });

  describe('layout', () => {
    it('lays out a single center cell across the content area', () => {
      const cell = new GridContainerCell(false, false, GAP);
      cell.getCellRectangle().setRect(100, 200, 300, 200);
      pad(cell.getPadding(), 1, 2, 3, 4);
      cell.setCell(CENTER, CENTER, atomicCell(30, 40));
      cell.layoutChildrenHorizontally();
      cell.layoutChildrenVertically();
      expect(geometry(cell, CENTER, CENTER)).toEqual([104, 201, 294, 196]);
      const centerRect = cell.getCenterCellRectangle();
      expect([centerRect.x, centerRect.y, centerRect.width, centerRect.height]).toEqual([104, 201, 294, 196]);
    });

    it('lays out rows vertically', () => {
      const cell = grid(false);
      cell.layoutChildrenVertically();
      expect(verticalExtent(cell, BEGIN, BEGIN)).toEqual([201, 14]);
      expect(verticalExtent(cell, BEGIN, END)).toEqual([201, 14]);
      expect(verticalExtent(cell, CENTER, CENTER)).toEqual([220, 164]);
      expect(verticalExtent(cell, END, CENTER)).toEqual([389, 8]);
    });

    it('applies the last row widths to every cell of a column in non-tabular mode', () => {
      const cell = grid(false);
      cell.layoutChildrenHorizontally();
      cell.layoutChildrenVertically();
      expect(geometry(cell, BEGIN, BEGIN)).toEqual([104, 201, 0, 14]);
      expect(geometry(cell, BEGIN, END)).toEqual([398, 201, 0, 14]);
      expect(geometry(cell, CENTER, CENTER)).toEqual([104, 220, 294, 164]);
      expect(geometry(cell, END, CENTER)).toEqual([104, 389, 294, 8]);
      const centerRect = cell.getCenterCellRectangle();
      expect([centerRect.x, centerRect.y, centerRect.width, centerRect.height]).toEqual([104, 201, 294, 164]);
    });

    it('shares and mutates one width array across rows in tabular mode', () => {
      const cell = grid(true);
      cell.layoutChildrenHorizontally();
      cell.layoutChildrenVertically();
      expect(geometry(cell, BEGIN, BEGIN)).toEqual([104, 201, 20, 14]);
      expect(geometry(cell, BEGIN, END)).toEqual([368, 201, 30, 14]);
      expect(geometry(cell, CENTER, CENTER)).toEqual([119, 220, 254, 164]);
      expect(geometry(cell, END, CENTER)).toEqual([119, 389, 254, 8]);
      const centerRect = cell.getCenterCellRectangle();
      expect([centerRect.x, centerRect.y, centerRect.width, centerRect.height]).toEqual([104, 201, 244, 164]);
    });

    it('returns a copy of the center cell rectangle', () => {
      const cell = grid(false);
      cell.layoutChildrenVertically();
      cell.getCenterCellRectangle().height = 1;
      expect(cell.getCenterCellRectangle().height).toBe(164);
    });
  });
});
