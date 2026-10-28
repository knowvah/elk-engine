// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { SplineSegment } from './SplineSegment.js';

describe('SplineSegment (staged for mission 7e)', () => {
  it('cannot be constructed yet', () => {
    expect(() => new SplineSegment()).toThrow(UnsupportedOperationException);
    expect(() => new SplineSegment()).toThrow('SplineSegment is ported in mission 7e');
  });
});
