// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EOPPOSITE_FEATURE_BASE } from './InternalEObject.js';

describe('InternalEObject', () => {
  it('has EMF opposite feature base -1', () => {
    expect(EOPPOSITE_FEATURE_BASE).toBe(-1);
  });
});
