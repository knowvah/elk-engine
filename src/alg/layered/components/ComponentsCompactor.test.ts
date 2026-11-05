// SPDX-License-Identifier: EPL-2.0
// ComponentsCompactor is a staged class (L1, F1): every member the placers reference throws until mission 7g.
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { ComponentsCompactor } from './ComponentsCompactor.js';

const STAGED_MESSAGE = 'ComponentsCompactor is ported in mission 7g';

describe('ComponentsCompactor (staged, mission 7g)', () => {
  const compactor = new ComponentsCompactor();

  it('compact names 7g', () => {
    expect(() => compactor.compact([], new KVector(), 0)).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(() => compactor.compact([], new KVector(), 0)).toThrow(UnsupportedOperationException);
  });

  it('getOffset names 7g', () => {
    expect(() => compactor.getOffset()).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(() => compactor.getOffset()).toThrow(UnsupportedOperationException);
  });

  it('getGraphSize names 7g', () => {
    expect(() => compactor.getGraphSize()).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(() => compactor.getGraphSize()).toThrow(UnsupportedOperationException);
  });
});
