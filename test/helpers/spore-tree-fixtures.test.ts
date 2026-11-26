// SPDX-License-Identifier: EPL-2.0
// The bits the explicit-stack proofs compare a port with its twin by (issue #72): a NaN's sign bit never separates the two, every
// other value keeps its raw bits.
import { describe, expect, it } from 'vitest';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import { doubleBits } from './spore-tree-fixtures.js';

describe('doubleBits', () => {
  it('encodes both NaN signs as the one canonical NaN', () => {
    expect(doubleBits(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(doubleBits(NaN)).toBe(CANONICAL_NAN_HEX);
  });

  it('keeps the raw bits of every other value', () => {
    expect(doubleBits(-0)).toBe('8000000000000000');
    expect(doubleBits(0)).toBe('0000000000000000');
    expect(doubleBits(1)).toBe('3ff0000000000000');
    expect(doubleBits(-Infinity)).toBe('fff0000000000000');
  });
});
