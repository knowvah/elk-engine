// SPDX-License-Identifier: EPL-2.0
// Proof of InternalProperties (mission 8c, T6): the property ids and defaults as declared in InternalProperties.java:30-71, their use
// on the recorded stops (the ids are what the recorder's `props` keys name), and the hidden constructor (Java `private
// InternalProperties()`).
import { describe, expect, it } from 'vitest';
import { PROP_KEYS } from '../../../../test/helpers/rectpacking-replay-elk.js';
import { InternalProperties } from './InternalProperties.js';

describe('InternalProperties (InternalProperties.java)', () => {
  it('declares the eleven properties with the Java ids (InternalProperties.java:30-71)', () => {
    const declared = [
      [InternalProperties.ADDITIONAL_HEIGHT, 'additionalHeight'],
      [InternalProperties.DRAWING_HEIGHT, 'drawingHeight'],
      [InternalProperties.DRAWING_WIDTH, 'drawingWidth'],
      [InternalProperties.MIN_HEIGHT, 'minHeight'],
      [InternalProperties.MIN_WIDTH, 'minWidth'],
      [InternalProperties.ROWS, 'rows'],
      [InternalProperties.TARGET_WIDTH, 'targetWidth'],
      [InternalProperties.MIN_ROW_INCREASE, 'minRowIncrease'],
      [InternalProperties.MAX_ROW_INCREASE, 'maxRowIncrease'],
      [InternalProperties.MIN_ROW_DECREASE, 'minRowDecrease'],
      [InternalProperties.MAX_ROW_DECREASE, 'maxRowDecrease'],
    ] as const;
    expect(declared.map(([property]) => property.getId())).toEqual(declared.map(([, id]) => id));
  });

  it('gives only the four row-change properties the default 0.0 (InternalProperties.java:53-67)', () => {
    const noDefault = [
      InternalProperties.ADDITIONAL_HEIGHT,
      InternalProperties.DRAWING_HEIGHT,
      InternalProperties.DRAWING_WIDTH,
      InternalProperties.MIN_HEIGHT,
      InternalProperties.MIN_WIDTH,
      InternalProperties.ROWS,
      InternalProperties.TARGET_WIDTH,
    ];
    const zero = [
      InternalProperties.MIN_ROW_INCREASE,
      InternalProperties.MAX_ROW_INCREASE,
      InternalProperties.MIN_ROW_DECREASE,
      InternalProperties.MAX_ROW_DECREASE,
    ];
    expect(noDefault.map((p) => p.getDefault())).toEqual(noDefault.map(() => null));
    expect(zero.map((p) => p.getDefault())).toEqual([0, 0, 0, 0]);
  });

  it('the properties the recorder dumps as `props` are exactly the ten numeric ones, named by the recorder keys', () => {
    expect(PROP_KEYS.map(([key, property]) => [key, property.getId()])).toEqual(PROP_KEYS.map(([key]) => [key, key]));
    expect(PROP_KEYS.length).toBe(10);
  });

  it('InternalProperties.java:72-73: the constructor is hidden and builds an empty holder', () => {
    const instance = Reflect.construct(InternalProperties as unknown as new () => object, []);
    expect(Object.keys(instance)).toEqual([]);
  });
});
