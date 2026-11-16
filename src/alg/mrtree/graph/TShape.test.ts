// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { TShape } from './TShape.js';

class Shape extends TShape {}

describe('TShape', () => {
  it('starts with the zero position and size and the given id (TShape.java:23-40)', () => {
    const shape = new Shape(3);
    expect(shape.id).toBe(3);
    expect(shape.getPosition()).toEqual(new KVector(0, 0));
    expect(shape.getSize()).toEqual(new KVector(0, 0));
  });

  it('the implicit constructor leaves id 0', () => {
    expect(new Shape().id).toBe(0);
  });

  it('returns the live vectors, not copies (TShape.java:50,59)', () => {
    const shape = new Shape();
    shape.getPosition().x = 12;
    shape.getSize().y = 5;
    expect(shape.getPosition().x).toBe(12);
    expect(shape.getSize().y).toBe(5);
    expect(shape.getPosition()).toBe(shape.getPosition());
  });

  it('keeps position and size separate', () => {
    const shape = new Shape();
    shape.getPosition().x = 1;
    expect(shape.getSize().x).toBe(0);
  });
});
