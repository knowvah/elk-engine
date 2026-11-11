// SPDX-License-Identifier: EPL-2.0
// doubleStreamAverage against the `average` group of test/golden/refs/java/mrtree-units.json: JVM vectors of
// `LinkedList<Double>.stream().map(..).mapToDouble(Double::doubleValue).average().getAsDouble()`, compared bit for bit.
import { describe, expect, it } from 'vitest';
import {
  AVERAGE_GROUP,
  hexOf,
  unhex,
  unitRowsOf,
  type AverageRow,
} from '../../../../test/helpers/mrtree-unit-vectors.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { doubleStreamAverage } from './DoubleStreamAverage.js';

const NAN_BITS = '7ff8000000000000';

describe('doubleStreamAverage against the JVM vectors', () => {
  it('equals the recorded bits of every average row', { timeout: 60_000 }, () => {
    const rows = unitRowsOf<AverageRow['input'], AverageRow['expected']>(AVERAGE_GROUP);
    expect(rows.length).toBe(2170);
    const failures: string[] = [];
    for (const row of rows) {
      const actual = doubleStreamAverage(row.input.map(unhex));
      const expected = unhex(row.expected.bits);
      // a NaN result is compared as NaN: the JVM's NaN payload is canonical, JS NaNs have no observable payload
      const equal = Number.isNaN(expected) ? Number.isNaN(actual) : hexOf(actual) === row.expected.bits;
      if (!equal) {
        failures.push(`${row.id}: expected ${row.expected.bits}, got ${hexOf(actual)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('covers cancellation, non-finite and mixed-magnitude inputs', () => {
    const rows = unitRowsOf<AverageRow['input'], AverageRow['expected']>(AVERAGE_GROUP);
    const families = new Set(rows.map((r) => r.id.split('/')[1]));
    expect(families).toEqual(new Set(['mixed', 'cancel', 'repeat', 'pairs', 'centres', 'big', 'nonfinite']));
    const nonFiniteResults = rows.filter((r) => !Number.isFinite(unhex(r.expected.bits)));
    expect(nonFiniteResults.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.expected.bits === NAN_BITS)).toBe(true);
  });

  it('an empty stream has no average (OptionalDouble.getAsDouble throws NoSuchElementException)', () => {
    expect(() => doubleStreamAverage([])).toThrow(NoSuchElementException);
    expect(() => doubleStreamAverage([])).toThrow('No value present');
  });
});
