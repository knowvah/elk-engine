// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFloat, toString } from './JavaFloat.js';
import { NumberFormatException } from './NumberFormatException.js';

const REF_URL = new URL('../../../test/golden/refs/java/graphviz-dot-jdk.json', import.meta.url);
const PARSE_FAMILY = 'parseFloat';
const TO_STRING_FAMILY = 'floatToString';
const NUMBER_FORMAT = 'java.lang.NumberFormatException';
const HEX_RADIX = 16;
const BITS_HEX_WIDTH = 8;
/** Rows whose `viaDouble` differs from `parseFloat`: the double-rounding route must not be what passes them. */
const DOUBLE_ROUNDING_ROWS = 15;

interface Thrown {
  readonly cls: string;
  readonly msg: string | null;
}
type Outcome = string | { readonly thrown: Thrown };
interface ParseRow {
  readonly id: string;
  readonly family: string;
  readonly input: string;
  readonly parseFloat: Outcome;
  readonly valueOf: Outcome;
  readonly viaDouble: Outcome;
}
interface ToStringRow {
  readonly id: string;
  readonly family: string;
  readonly bits: string;
  readonly text: string;
}

const ref = JSON.parse(readFileSync(REF_URL, 'utf8')) as {
  readonly classOnlyMessages: readonly string[];
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly (ParseRow | ToStringRow)[];
};
const parseRows = ref.rows.filter((r): r is ParseRow => r.family === PARSE_FAMILY);
const toStringRows = ref.rows.filter((r): r is ToStringRow => r.family === TO_STRING_FAMILY);

const scratch = new DataView(new ArrayBuffer(4));

/** `Float.floatToRawIntBits` of an exact float, as 8 lowercase hex digits. */
function floatBits(f: number): string {
  scratch.setFloat32(0, f);
  return scratch.getUint32(0).toString(HEX_RADIX).padStart(BITS_HEX_WIDTH, '0');
}

/** `Float.intBitsToFloat` of 8 hex digits. */
function fromBits(hex: string): number {
  scratch.setUint32(0, Number.parseInt(hex, HEX_RADIX));
  return scratch.getFloat32(0);
}

/**
 * Asserts one recorded outcome of `Float.parseFloat` / `Float.valueOf(String)`. The value must be an exact float (no
 * binary64 residue); an exception is compared by class only (classOnlyMessages).
 */
function expectOutcome(input: string, outcome: Outcome, id: string): void {
  if (typeof outcome === 'string') {
    const value = parseFloat(input);
    expect(Object.is(Math.fround(value), value), id).toBe(true);
    expect(floatBits(value), id).toBe(outcome);
  } else {
    expect(outcome.thrown.cls, id).toBe(NUMBER_FORMAT);
    expect(() => parseFloat(input), id).toThrow(NumberFormatException);
  }
}

describe('JavaFloat.parseFloat vectors', () => {
  it('replays the whole parseFloat family, double-rounding rows included', () => {
    expect(ref.classOnlyMessages).toContain(PARSE_FAMILY);
    expect(parseRows.length).toBe(ref.rowCounts[PARSE_FAMILY]);
    const doubleRounded = parseRows.filter((r) => JSON.stringify(r.viaDouble) !== JSON.stringify(r.parseFloat));
    expect(doubleRounded.length).toBe(DOUBLE_ROUNDING_ROWS);
  });

  it('returns the recorded bits or exception of Float.parseFloat', () => {
    for (const row of parseRows) {
      expectOutcome(row.input, row.parseFloat, row.id);
    }
  });

  it('returns the recorded bits or exception of Float.valueOf(String), which parseFloat performs', () => {
    for (const row of parseRows) {
      expectOutcome(row.input, row.valueOf, row.id);
    }
  });
});

describe('JavaFloat.toString vectors', () => {
  it('replays the whole floatToString family', () => {
    expect(toStringRows.length).toBe(ref.rowCounts[TO_STRING_FAMILY]);
  });

  it('returns the recorded Float.toString text of every bit pattern', () => {
    for (const row of toStringRows) {
      expect(toString(fromBits(row.bits)), row.id).toBe(row.text);
    }
  });
});

describe('JavaFloat.parseFloat hexadecimal range (no ref row reaches these)', () => {
  it('overflows to infinity far above Float.MAX_VALUE and underflows to zero far below Float.MIN_VALUE', () => {
    expect(parseFloat('0x1p200')).toBe(Infinity);
    expect(parseFloat('-0x1p200')).toBe(-Infinity);
    expect(Object.is(parseFloat('0x1p-200'), 0)).toBe(true);
  });

  it('reads a zero significand as zero and rejects a significand without hex digits', () => {
    expect(Object.is(parseFloat('-0x0.0p99'), -0)).toBe(true);
    expect(() => parseFloat('0x.p1')).toThrow(NumberFormatException);
  });
});
