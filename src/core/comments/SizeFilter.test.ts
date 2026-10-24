// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { IBoundsProvider } from './IBoundsProvider.js';
import { SizeFilter } from './SizeFilter.js';

type Rect = Rectangle2D.Double;

class IdentityBounds extends IBoundsProvider<Rect, unknown> {
  boundsForComment(comment: Rect): Rect {
    return comment;
  }
  boundsForTarget(): Rect | null {
    return null;
  }
}

const rect = (w: number, h: number): Rect => new Rectangle2D.Double(5, 7, w, h);
const filter = (maxArea: number): SizeFilter<Rect> =>
  new SizeFilter<Rect>().withBoundsProvider(new IdentityBounds()).withMaximumArea(maxArea);

describe('SizeFilter', () => {
  it('accepts an area equal to the maximum', () => {
    expect(filter(100).eligibleForAttachment(rect(10, 10))).toBe(true);
  });

  it('accepts an area below the maximum', () => {
    expect(filter(100).eligibleForAttachment(rect(4, 5))).toBe(true);
  });

  it('rejects an area above the maximum', () => {
    expect(filter(99).eligibleForAttachment(rect(10, 10))).toBe(false);
  });

  it('uses width times height, not the sum', () => {
    expect(filter(30).eligibleForAttachment(rect(10, 4))).toBe(false);
    expect(filter(40).eligibleForAttachment(rect(10, 4))).toBe(true);
  });

  it('accepts an empty comment at maximum area 0', () => {
    expect(filter(0).eligibleForAttachment(rect(0, 9))).toBe(true);
  });

  it('rejects everything by default (maximum area -1)', () => {
    const f = new SizeFilter<Rect>().withBoundsProvider(new IdentityBounds());
    expect(f.eligibleForAttachment(rect(0, 0))).toBe(false);
  });

  it('rejects a negative maximum area', () => {
    expect(() => new SizeFilter<Rect>().withMaximumArea(-0.5)).toThrow(IllegalArgumentException);
    expect(() => new SizeFilter<Rect>().withMaximumArea(-0.5)).toThrow('Maximum area must be >= 0.');
  });

  it('rejects a null bounds provider', () => {
    expect(() => new SizeFilter<Rect>().withBoundsProvider(null)).toThrow(
      new TypeError('Bounds provider must not be null.'),
    );
  });

  it('requires a bounds provider on preprocess', () => {
    const dataProvider = {} as never;
    expect(() => new SizeFilter<Rect>().preprocess(dataProvider, false)).toThrow('A bounds provider is required.');
    expect(() => new SizeFilter<Rect>().preprocess(dataProvider, false)).toThrow(IllegalStateException);
    expect(() => filter(1).preprocess(dataProvider, false)).not.toThrow();
  });
});
