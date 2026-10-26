// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../../core/math/KVector.js';
import { AtomicCell } from './AtomicCell.js';

describe('Cell and AtomicCell', () => {
  it('starts with zero padding, an empty rectangle and no contributions', () => {
    const cell = new AtomicCell();
    expect([cell.getPadding().top, cell.getPadding().right, cell.getPadding().bottom, cell.getPadding().left]).toEqual([
      0, 0, 0, 0,
    ]);
    const r = cell.getCellRectangle();
    expect([r.x, r.y, r.width, r.height]).toEqual([0, 0, 0, 0]);
    expect(cell.isContributingToMinimumWidth()).toBe(false);
    expect(cell.isContributingToMinimumHeight()).toBe(false);
  });

  it('sets the contribution flags independently', () => {
    const cell = new AtomicCell();
    cell.setContributesToMinimumWidth(true);
    expect(cell.isContributingToMinimumWidth()).toBe(true);
    expect(cell.isContributingToMinimumHeight()).toBe(false);
    cell.setContributesToMinimumHeight(true);
    expect(cell.isContributingToMinimumHeight()).toBe(true);
  });

  it('adds the padding to the content area for its minimum size', () => {
    const cell = new AtomicCell();
    cell.getPadding().set(1, 2, 3, 4);
    cell.setMinimumContentAreaSize(new KVector(10, 20), false);
    expect(cell.getMinimumContentAreaSize().x).toBe(10);
    expect(cell.getMinimumWidth()).toBe(16);
    expect(cell.getMinimumHeight()).toBe(24);
  });

  it('subtracts the padding from a size that includes it', () => {
    const cell = new AtomicCell();
    cell.getPadding().set(1, 2, 3, 4);
    cell.setMinimumContentAreaSize(new KVector(16, 24), true);
    expect(cell.getMinimumContentAreaSize().x).toBe(10);
    expect(cell.getMinimumContentAreaSize().y).toBe(20);
  });
});
