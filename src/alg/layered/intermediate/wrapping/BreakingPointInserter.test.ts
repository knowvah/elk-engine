// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { BreakingPointInserter } from './BreakingPointInserter.js';

describe('BreakingPointInserter (staged for mission 7g)', () => {
  it('process throws until the processor is ported', () => {
    const inserter = new BreakingPointInserter();
    expect(() => inserter.process()).toThrow(UnsupportedOperationException);
    expect(() => inserter.process()).toThrow('BreakingPointInserter.process is ported in mission 7g');
  });
});
