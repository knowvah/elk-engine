// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { BPInfo } from './BreakingPointInserterBPInfo.js';

describe('BreakingPointInserter.BPInfo (staged for mission 7g)', () => {
  it('cannot be constructed yet', () => {
    expect(() => new BPInfo()).toThrow(UnsupportedOperationException);
    expect(() => new BPInfo()).toThrow('BreakingPointInserter.BPInfo is ported in mission 7g');
  });
});
