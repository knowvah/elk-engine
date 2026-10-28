// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LShape } from './LShape.js';

class Shape extends LShape {}

describe('LShape', () => {
  it('starts with position and size at the origin', () => {
    const shape = new Shape();
    expect(shape.getPosition().x).toBe(0);
    expect(shape.getPosition().y).toBe(0);
    expect(shape.getSize().x).toBe(0);
    expect(shape.getSize().y).toBe(0);
  });

  it('returns the live position and size vectors, distinct from each other', () => {
    const shape = new Shape();
    shape.getPosition().x = 3;
    shape.getSize().y = 5;
    expect(shape.getPosition().x).toBe(3);
    expect(shape.getSize().y).toBe(5);
    expect(shape.getPosition()).toBe(shape.getPosition());
    expect(shape.getSize()).toBe(shape.getSize());
    expect(shape.getPosition()).not.toBe(shape.getSize());
    expect(shape.getSize().x).toBe(0);
  });
});
