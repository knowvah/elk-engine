// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractNormalizedMatcherNormalizationFunction } from './AbstractNormalizedMatcherNormalizationFunction.js';
import { AlignmentMatcher } from './AlignmentMatcher.js';
import { IBoundsProvider } from './IBoundsProvider.js';

type Rect = Rectangle2D.Double;

/** Comments and targets are their own bounds. */
class IdentityBounds extends IBoundsProvider<Rect, Rect> {
  boundsForComment(comment: Rect): Rect {
    return comment;
  }
  boundsForTarget(target: Rect): Rect {
    return target;
  }
}

// Target spans x 100..150, y 100..150. Expected values are hand-computed from AlignmentMatcher.java.
const TARGET = new Rectangle2D.Double(100, 100, 50, 50);
const rect = (x: number, y: number, w: number, h: number): Rect => new Rectangle2D.Double(x, y, w, h);

describe('AlignmentMatcher.alignment', () => {
  it.each([
    ['cater-cornered top left', rect(0, 0, 20, 20), -1],
    ['cater-cornered top right', rect(200, 0, 20, 20), -1],
    ['cater-cornered bottom left', rect(0, 200, 20, 20), -1],
    ['cater-cornered bottom right', rect(180, 190, 30, 40), -1],
    // horizontal offset min(|100-110|, |150-130|) = 10, vertical min(|100-125|, |150-145|) = 5
    ['intersecting', rect(110, 125, 20, 20), 5],
    // above: horizontal offset min(|100-105|, |150-135|) = 5
    ['above', rect(105, 20, 30, 40), 5],
    // below: horizontal offset min(|100-112|, |150-142|) = 8
    ['below', rect(112, 200, 30, 30), 8],
    // left: vertical offset min(|100-108|, |150-138|) = 8
    ['left', rect(20, 108, 30, 30), 8],
    // right: vertical offset min(|100-103|, |150-133|) = 3
    ['right', rect(200, 103, 30, 30), 3],
    // touching the bottom edge: horizontal offset min(|100-107|, |150-137|) = 7
    ['touching the bottom edge', rect(107, 150, 30, 20), 7],
    // touching the top edge: the same horizontal offset
    ['touching the top edge', rect(107, 80, 30, 20), 7],
    // touching the right edge: vertical offset min(|100-108|, |150-138|) = 8
    ['touching the right edge', rect(150, 108, 30, 30), 8],
    // touching a corner: bottom edge case, horizontal offset min(|100-150|, |150-160|) = 10
    ['touching a corner', rect(150, 150, 10, 10), 10],
  ])('%s', (_name, comment, expected) => {
    expect(AlignmentMatcher.alignment(comment, TARGET)).toBe(expected);
  });

  it('touching the left edge is left of the target', () => {
    // tl outcode LEFT only, br none: not cater-cornered; touching on the left edge: vertical offset
    // min(|100-110|, |150-130|) = 10 via the final branch (b1.x + b1.width == b2.x)
    expect(AlignmentMatcher.alignment(rect(70, 110, 30, 20), TARGET)).toBe(10);
  });
});

describe('AlignmentMatcher configuration and normalization', () => {
  const matcher = (): AlignmentMatcher<Rect, Rect> =>
    new AlignmentMatcher<Rect, Rect>().withBoundsProvider(new IdentityBounds()).withMaximumAlignmentOffset(20);

  it('uses the maximum offset as worst and 0 as best raw value', () => {
    const m = matcher();
    expect(m.getWorstRawValue()).toBe(20);
    expect(m.getBestRawValue()).toBe(0);
  });

  it('maps cater-cornered shapes to the worst raw value', () => {
    expect(matcher().raw(rect(0, 0, 20, 20), TARGET)).toBe(20);
  });

  it('returns the raw alignment', () => {
    expect(matcher().raw(rect(105, 20, 30, 40), TARGET)).toBe(5);
  });

  it.each([
    ['inside', rect(105, 20, 30, 40), 0.75],
    ['perfect', rect(100, 20, 50, 40), 1],
    ['cater-cornered', rect(0, 0, 20, 20), 0],
  ])('normalizes linearly: %s', (_name, comment, expected) => {
    expect(matcher().normalized(comment, TARGET)).toBe(expected);
  });

  it.each([
    ['inside', rect(105, 20, 30, 40), 1],
    ['cater-cornered', rect(0, 0, 20, 20), 0],
  ])('normalizes binary: %s', (_name, comment, expected) => {
    const m = matcher().withNormalizationFunction(AbstractNormalizedMatcherNormalizationFunction.BINARY);
    expect(m.normalized(comment, TARGET)).toBe(expected);
  });

  it('rejects invalid configuration', () => {
    const m = new AlignmentMatcher<Rect, Rect>();
    expect(() => m.withMaximumAlignmentOffset(0)).toThrow(IllegalArgumentException);
    expect(() => m.withMaximumAlignmentOffset(0)).toThrow('Maximum alignment offset must be > 0.');
    expect(() => m.withBoundsProvider(null)).toThrow(new TypeError('Bounds provider must not be null.'));
  });

  it('requires a bounds provider on preprocess', () => {
    const dataProvider = {} as never;
    expect(() => new AlignmentMatcher<Rect, Rect>().preprocess(dataProvider, false)).toThrow(IllegalStateException);
    expect(() => matcher().preprocess(dataProvider, true)).not.toThrow();
  });
});
