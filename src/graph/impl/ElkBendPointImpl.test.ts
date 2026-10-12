// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { isElkBendPoint } from '../ElkBendPoint.js';
import { isElkLabel } from '../ElkLabel.js';
import { ElkBendPointImpl } from './ElkBendPointImpl.js';

describe('ElkBendPointImpl', () => {
  it('defaults to (0, 0)', () => {
    const point = new ElkBendPointImpl();
    expect(point.getX()).toBe(0);
    expect(point.getY()).toBe(0);
  });

  it('set(x, y) sets both coordinates', () => {
    const point = new ElkBendPointImpl();
    point.set(1, 2);
    expect(point.getX()).toBe(1);
    expect(point.getY()).toBe(2);
    point.setX(3.5);
    point.setY(-4);
    expect([point.getX(), point.getY()]).toEqual([3.5, -4]);
  });

  it('reports the ElkBendPoint EClass, has no contents and passes the guards', () => {
    const point = new ElkBendPointImpl();
    expect(point.eClass().getName()).toBe('ElkBendPoint');
    expect(point.eContents().size()).toBe(0);
    expect(isElkBendPoint(point)).toBe(true);
    expect(isElkBendPoint({ getX: () => 0 })).toBe(false);
    expect(isElkLabel(point)).toBe(false);
  });

  it('prints the generated toString with Java doubles (D10: no identity hash)', () => {
    const point = new ElkBendPointImpl();
    expect(point.toString()).toBe('org.eclipse.elk.graph.impl.ElkBendPointImpl (x: 0.0, y: 0.0)');
    point.set(1.5, 20);
    expect(point.toString()).toBe('org.eclipse.elk.graph.impl.ElkBendPointImpl (x: 1.5, y: 20.0)');
  });

  it('has no generated container feature to remove from', () => {
    expect(() => new ElkBendPointImpl().eBasicRemoveFromContainerFeature()).toThrow(
      new UnsupportedOperationException('eBasicRemoveFromContainerFeature: no generated case for feature 0'),
    );
  });
});
