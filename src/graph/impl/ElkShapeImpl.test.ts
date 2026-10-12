// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { isElkGraphElement } from '../ElkGraphElement.js';
import { isElkShape } from '../ElkShape.js';
import { ElkShapeImpl } from './ElkShapeImpl.js';

/** The abstract class under test, made concrete. */
class TestShape extends ElkShapeImpl {}

describe('ElkShapeImpl', () => {
  it('defaults every coordinate and size to 0', () => {
    const shape = new TestShape();
    expect([shape.getX(), shape.getY(), shape.getWidth(), shape.getHeight()]).toEqual([0, 0, 0, 0]);
  });

  it('sets each attribute', () => {
    const shape = new TestShape();
    shape.setX(1);
    shape.setY(2);
    shape.setWidth(3);
    shape.setHeight(4);
    expect([shape.getX(), shape.getY(), shape.getWidth(), shape.getHeight()]).toEqual([1, 2, 3, 4]);
  });

  it('setDimensions sets width then height; setLocation x then y', () => {
    const shape = new TestShape();
    shape.setDimensions(30, 40.25);
    shape.setLocation(1.5, 2);
    expect([shape.getX(), shape.getY(), shape.getWidth(), shape.getHeight()]).toEqual([1.5, 2, 30, 40.25]);
  });

  it('reports the ElkShape EClass and passes the guards', () => {
    const shape = new TestShape();
    expect(shape.eClass().getName()).toBe('ElkShape');
    expect(isElkShape(shape)).toBe(true);
    expect(isElkGraphElement(shape)).toBe(true);
    expect(isElkShape({ getX: () => 0 })).toBe(false);
  });

  it('prints the generated toString chain with Java doubles (D10: no identity hash)', () => {
    const shape = new TestShape();
    expect(shape.toString()).toBe(
      'org.eclipse.elk.graph.impl.ElkShapeImpl (identifier: null) (height: 0.0, width: 0.0, x: 0.0, y: 0.0)',
    );
    shape.setIdentifier('s');
    shape.setDimensions(30, 40.25);
    shape.setLocation(1.5, -2);
    expect(shape.toString()).toBe(
      'org.eclipse.elk.graph.impl.ElkShapeImpl (identifier: s) (height: 40.25, width: 30.0, x: 1.5, y: -2.0)',
    );
  });
});
