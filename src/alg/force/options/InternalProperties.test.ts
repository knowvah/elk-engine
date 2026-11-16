// SPDX-License-Identifier: EPL-2.0
// Proof of InternalProperties (mission 8b, T6): the property ids and defaults as declared in InternalProperties.java:30-44, and the hidden
// constructor (Java `private InternalProperties()`).
import { describe, expect, it } from 'vitest';
import { InternalProperties } from './InternalProperties.js';

describe('InternalProperties', () => {
  it('declares the four properties with the Java ids and no default (InternalProperties.java:30-44)', () => {
    const declared = [
      [InternalProperties.ORIGIN, 'origin'],
      [InternalProperties.RANDOM, 'random'],
      [InternalProperties.BB_UPLEFT, 'boundingBox.upLeft'],
      [InternalProperties.BB_LOWRIGHT, 'boundingBox.lowRight'],
    ] as const;
    expect(declared.map(([property]) => property.getId())).toEqual(declared.map(([, id]) => id));
    expect(declared.map(([property]) => property.getDefault())).toEqual([null, null, null, null]);
  });

  it('InternalProperties.java:42-43: the constructor is hidden and builds an empty holder', () => {
    const instance = Reflect.construct(InternalProperties as unknown as new () => object, []);
    expect(Object.keys(instance)).toEqual([]);
  });
});
