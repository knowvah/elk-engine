// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EObjectContainmentEList } from './EObjectContainmentEList.js';

const POINTS = 4;
const POINT_CLASS: EClass = { getName: () => 'ElkBendPoint' };

/** Holder and contained element in one class; only the holder's `case POINTS` is generated code. */
class Point extends BasicEObjectImpl {
  readonly points = new EObjectContainmentEList<Point>(this, POINTS);

  eClass(): EClass {
    return POINT_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.points];
  }

  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    if (featureID === POINTS) {
      this.points.basicRemove(otherEnd as Point);
      return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Point has no container feature');
  }
}

describe('EObjectContainmentEList', () => {
  it('contains, moves and releases elements with no code in the element class', () => {
    const [s1, s2, b] = [new Point(), new Point(), new Point()];
    expect(s1.points.add(b)).toBe(true);
    expect(b.eContainer()).toBe(s1);
    expect(b.eContainerFeatureID()).toBe(EOPPOSITE_FEATURE_BASE - POINTS);
    s2.points.add(b);
    expect(s1.points.size()).toBe(0);
    expect(b.eContainer()).toBe(s2);
    s2.points.clear();
    expect(b.eContainer()).toBeNull();
    expect(s1.eContents().size()).toBe(0);
  });
});
