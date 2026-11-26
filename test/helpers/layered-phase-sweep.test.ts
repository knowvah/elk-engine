// SPDX-License-Identifier: EPL-2.0
// The C4 number of the phase, order, placement and routing sweep hashes (issue #72): the recorder's `c4Free` writes a double as the
// hex digits of `Double.doubleToLongBits`, so both NaN signs hash alike and every other value keeps its raw bits.
import { describe, expect, it } from 'vitest';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import { c4Free, canonicalHash, phaseHash } from './layered-phase-sweep.js';

const NUMBER = 'number';
const NEGATIVE_ZERO_HEX = '8000000000000000';
const ONE_HEX = '3ff0000000000000';

describe('c4Free (the sweep hash form of a C4 value)', () => {
  it('writes both NaN signs, and the text NaN of Double.toString, as the one canonical NaN', () => {
    const canonicalNumber = { t: NUMBER, v: CANONICAL_NAN_HEX };
    expect(c4Free({ t: 'double', v: NEGATIVE_NAN })).toEqual(canonicalNumber);
    expect(c4Free({ t: 'double', v: NaN })).toEqual(canonicalNumber);
    expect(c4Free({ t: 'double', v: 'NaN' })).toEqual(canonicalNumber);
    expect(canonicalHash(c4Free({ t: 'double', v: NEGATIVE_NAN }))).toBe(
      canonicalHash(c4Free({ t: 'double', v: 'NaN' })),
    );
  });

  it('keeps the raw bits of every other value, -0.0 and the infinities included', () => {
    expect(c4Free({ t: 'double', v: '-0.0' })).toEqual({ t: NUMBER, v: NEGATIVE_ZERO_HEX });
    expect(c4Free({ t: 'int', v: 1 })).toEqual({ t: NUMBER, v: ONE_HEX });
    expect(c4Free({ t: 'double', v: 'Infinity' })).toEqual({ t: NUMBER, v: '7ff0000000000000' });
    expect(c4Free({ t: 'double', v: '-Infinity' })).toEqual({ t: NUMBER, v: 'fff0000000000000' });
  });
});

describe('phaseHash', () => {
  const expectedWith = (value: unknown): Parameters<typeof phaseHash>[0] =>
    ({
      layers: [],
      layerless: [],
      hidden: [],
      edges: [],
      changed: [{ path: 'n1', properties: { 'org.eclipse.elk.priority': { t: 'double', v: value } } }],
    }) as unknown as Parameters<typeof phaseHash>[0];

  it('hashes both NaN signs alike and a NaN apart from an infinity', () => {
    expect(phaseHash(expectedWith(NEGATIVE_NAN))).toBe(phaseHash(expectedWith('NaN')));
    expect(phaseHash(expectedWith('Infinity'))).not.toBe(phaseHash(expectedWith('NaN')));
  });
});
