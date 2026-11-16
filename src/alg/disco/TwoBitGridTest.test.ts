// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { TwoBitGrid } from '../common/polyomino/structures/TwoBitGrid.js';

/**
 * Unit test for TwoBitGrid.
 *
 * @see org.eclipse.elk.alg.disco.test/src/org/eclipse/elk/alg/disco/test/TwoBitGridTest.java
 */
describe('TwoBitGridTest', () => {
  let testGrid: TwoBitGrid;

  /** Some set up code (`@Before setUp`). Nothing to tear down (`@After tearDown` is empty). */
  beforeEach(() => {
    const three = 3;
    const thirtyfive = 35;
    testGrid = new TwoBitGrid(thirtyfive, three);
  });

  /** Tests whether the dimensions of a grid are set correctly. */
  it('dimensionTest', () => {
    const three = 3;
    const thirtyfive = 35;
    const sixtyfour = 64;
    expect(testGrid.getWidth()).toBe(thirtyfive);
    expect(testGrid.getHeight()).toBe(three);
    const secondGrid = new TwoBitGrid(sixtyfour, sixtyfour);
    expect(secondGrid.getWidth()).toBe(sixtyfour);
    expect(secondGrid.getHeight()).toBe(sixtyfour);
  });

  /** Tests whether the predicate `inBounds` works. */
  it('inBoundsTest', () => {
    const three = 3;
    const seventeen = 17;
    const thirtyfour = 34;
    const thirtyfive = 35;
    expect(testGrid.inBounds(0, 0)).toBe(true);
    expect(testGrid.inBounds(-1, 0)).toBe(false);
    expect(testGrid.inBounds(0, -1)).toBe(false);
    expect(testGrid.inBounds(-1, -1)).toBe(false);
    expect(testGrid.inBounds(thirtyfour, 2)).toBe(true);
    expect(testGrid.inBounds(thirtyfour, three)).toBe(false);
    expect(testGrid.inBounds(thirtyfive, 2)).toBe(false);
    expect(testGrid.inBounds(thirtyfive, three)).toBe(false);
    expect(testGrid.inBounds(seventeen, 1)).toBe(true);
  });

  /** Checks whether the writing to and reading from specific test cells is working. */
  it('cellTest', () => {
    const thirtythree = 33;
    const thirtyfour = 34;
    const sixtyfour = 64;

    expect(testGrid.isEmpty(0, 0)).toBe(true);
    expect(testGrid.isEmpty(thirtyfour, 2)).toBe(true);

    testGrid.setBlocked(0, 0);
    expect(testGrid.isBlocked(0, 0)).toBe(true);
    expect(testGrid.isEmpty(0, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(0, 0)).toBe(false);

    testGrid.setWeaklyBlocked(1, 0);
    expect(testGrid.isBlocked(0, 0)).toBe(true);
    expect(testGrid.isEmpty(0, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(0, 0)).toBe(false);
    expect(testGrid.isBlocked(1, 0)).toBe(false);
    expect(testGrid.isEmpty(1, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(1, 0)).toBe(true);

    testGrid.setEmpty(0, 0);
    expect(testGrid.isBlocked(0, 0)).toBe(false);
    expect(testGrid.isEmpty(0, 0)).toBe(true);
    expect(testGrid.isWeaklyBlocked(0, 0)).toBe(false);
    expect(testGrid.isBlocked(1, 0)).toBe(false);
    expect(testGrid.isEmpty(1, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(1, 0)).toBe(true);

    expect(testGrid.isEmpty(thirtythree, 2)).toBe(true);

    testGrid.setBlocked(thirtythree, 2);
    expect(testGrid.isBlocked(0, 0)).toBe(false);
    expect(testGrid.isEmpty(0, 0)).toBe(true);
    expect(testGrid.isWeaklyBlocked(0, 0)).toBe(false);
    expect(testGrid.isBlocked(1, 0)).toBe(false);
    expect(testGrid.isEmpty(1, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(1, 0)).toBe(true);
    expect(testGrid.isBlocked(1, 0)).toBe(false);
    expect(testGrid.isEmpty(1, 0)).toBe(false);
    expect(testGrid.isWeaklyBlocked(1, 0)).toBe(true);
    expect(testGrid.isBlocked(thirtythree, 2)).toBe(true);
    expect(testGrid.isEmpty(thirtythree, 2)).toBe(false);
    expect(testGrid.isWeaklyBlocked(thirtythree, 2)).toBe(false);

    const secondGrid = new TwoBitGrid(sixtyfour, sixtyfour);
    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        secondGrid.setBlocked(xi, yi);
      }
    }
    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        expect(secondGrid.isBlocked(xi, yi)).toBe(true);
      }
    }

    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        secondGrid.setWeaklyBlocked(xi, yi);
      }
    }
    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        expect(secondGrid.isWeaklyBlocked(xi, yi)).toBe(true);
      }
    }

    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        secondGrid.setEmpty(xi, yi);
      }
    }
    for (let yi = 0; yi < secondGrid.getHeight(); yi++) {
      for (let xi = 0; xi < secondGrid.getWidth(); xi++) {
        expect(secondGrid.isEmpty(xi, yi)).toBe(true);
      }
    }
  });
});
