// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractNormalizedMatcherNormalizationFunction } from './AbstractNormalizedMatcherNormalizationFunction.js';
import { DistanceMatcher } from './DistanceMatcher.js';
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

// Target spans x 100..150, y 100..150. Expected values are hand-computed from DistanceMatcher.java.
const TARGET = new Rectangle2D.Double(100, 100, 50, 50);
const rect = (x: number, y: number, w: number, h: number): Rect => new Rectangle2D.Double(x, y, w, h);

describe('DistanceMatcher.distance', () => {
  it.each([
    ['intersecting', rect(120, 120, 10, 10), 0],
    // diagonal: 3-4-5 triangle between the facing corners
    ['top left', rect(40, 20, 30, 40), 50],
    ['bottom left', rect(40, 190, 30, 40), 50],
    ['top right', rect(180, 20, 30, 40), 50],
    ['bottom right', rect(180, 190, 30, 40), 50],
    // left: b2.x - b1.x + b1.width = 100 - 20 + 30 (the width is added, not subtracted: asymmetric in Java)
    ['left', rect(20, 110, 30, 20), 110],
    // right: b1.x - b2.x - b2.width = 200 - 100 - 50
    ['right', rect(200, 110, 30, 20), 50],
    // top: b2.y - b1.y + b1.height = 100 - 10 + 30
    ['top', rect(110, 10, 20, 30), 120],
    // bottom: b1.y - b2.y - b2.height = 200 - 100 - 50
    ['bottom', rect(110, 200, 20, 30), 50],
    ['touching the bottom edge', rect(110, 150, 20, 20), 0],
    ['touching a corner', rect(150, 150, 10, 10), 0],
    // touching the right edge: the horizontal-overlap branch finds no vertical contact and falls through to -1
    ['touching the right edge', rect(150, 110, 30, 20), -1],
  ])('%s', (_name, comment, expected) => {
    expect(DistanceMatcher.distance(comment, TARGET)).toBe(expected);
  });
});

describe('DistanceMatcher configuration and normalization', () => {
  const matcher = (): DistanceMatcher<Rect, Rect> =>
    new DistanceMatcher<Rect, Rect>().withBoundsProvider(new IdentityBounds()).withMaximumAttachmentDistance(100);

  it('uses the maximum distance as worst and 0 as best raw value', () => {
    const m = matcher();
    expect(m.getWorstRawValue()).toBe(100);
    expect(m.getBestRawValue()).toBe(0);
  });

  it('maps an undeterminable distance to the worst raw value', () => {
    expect(matcher().raw(rect(150, 110, 30, 20), TARGET)).toBe(100);
  });

  it('returns the raw distance', () => {
    expect(matcher().raw(rect(40, 20, 30, 40), TARGET)).toBe(50);
  });

  it.each([
    ['intersecting', rect(120, 120, 10, 10), 1],
    ['halfway', rect(40, 20, 30, 40), 0.5],
    ['at the maximum', rect(100, 250, 10, 10), 0],
    ['beyond the maximum', rect(20, 110, 30, 20), 0],
  ])('normalizes linearly: %s', (_name, comment, expected) => {
    expect(matcher().normalized(comment, TARGET)).toBe(expected);
  });

  it.each([
    ['intersecting', rect(120, 120, 10, 10), 1],
    ['inside', rect(40, 20, 30, 40), 1],
    ['at the maximum', rect(100, 250, 10, 10), 0],
    ['beyond the maximum', rect(20, 110, 30, 20), 0],
  ])('normalizes binary: %s', (_name, comment, expected) => {
    const m = matcher().withNormalizationFunction(AbstractNormalizedMatcherNormalizationFunction.BINARY);
    expect(m.normalized(comment, TARGET)).toBe(expected);
  });

  it('rejects invalid configuration', () => {
    const m = new DistanceMatcher<Rect, Rect>();
    expect(() => m.withMaximumAttachmentDistance(-1)).toThrow(IllegalArgumentException);
    expect(() => m.withMaximumAttachmentDistance(-1)).toThrow('Maximum attachment distance must be >= 0.');
    expect(() => m.withBoundsProvider(null)).toThrow(new TypeError('Bounds provider must not be null.'));
    expect(() => m.withNormalizationFunction(null)).toThrow(new TypeError('Normalization function cannot be null.'));
  });

  it('requires a bounds provider on preprocess', () => {
    const dataProvider = {} as never;
    expect(() => new DistanceMatcher<Rect, Rect>().preprocess(dataProvider, false)).toThrow(IllegalStateException);
    expect(() => matcher().preprocess(dataProvider, false)).not.toThrow();
  });
});
