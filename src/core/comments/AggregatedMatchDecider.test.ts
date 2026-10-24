// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import { AggregatedMatchDecider } from './AggregatedMatchDecider.js';
import type { MatcherClass } from './IDecider.js';
import { IMatcher } from './IMatcher.js';

class MatcherA extends IMatcher<string, string> {
  override raw(): number {
    return 0;
  }
  override normalized(): number {
    return 0;
  }
}
class MatcherB extends MatcherA {}

function heuristics(rows: Record<string, [number, number?]>): Map<string, Map<MatcherClass<string>, number>> {
  const result = new Map<string, Map<MatcherClass<string>, number>>();
  for (const [target, [a, b]] of Object.entries(rows)) {
    const inner = new Map<MatcherClass<string>, number>([[MatcherA, a]]);
    if (b !== undefined) {
      inner.set(MatcherB, b);
    }
    result.set(target, inner);
  }
  return result;
}

describe('AggregatedMatchDecider aggregators', () => {
  it('computes max, min, avg and sum', () => {
    expect(AggregatedMatchDecider.max([0.25, 0.75, 0.5])).toBe(0.75);
    expect(AggregatedMatchDecider.min([0.25, 0.75, 0.5])).toBe(0.25);
    expect(AggregatedMatchDecider.avg([0.25, 0.75, 0.5])).toBe(0.5);
    expect(AggregatedMatchDecider.sum([0.25, 0.75, 0.5])).toBe(1.5);
  });

  it('orders -0 below 0 and keeps ties (Double.compareTo)', () => {
    expect(Object.is(AggregatedMatchDecider.max([-0, 0]), 0)).toBe(true);
    expect(Object.is(AggregatedMatchDecider.min([0, -0]), -0)).toBe(true);
  });

  it('throws NoSuchElementException for max/min of nothing and averages nothing to 0', () => {
    expect(() => AggregatedMatchDecider.max([])).toThrow(NoSuchElementException);
    expect(() => AggregatedMatchDecider.min([])).toThrow(NoSuchElementException);
    expect(AggregatedMatchDecider.avg([])).toBe(0);
    expect(AggregatedMatchDecider.sum([])).toBe(0);
  });

  it('sums infinities like the simple sum', () => {
    expect(AggregatedMatchDecider.sum([Infinity, 1])).toBe(Infinity);
    expect(AggregatedMatchDecider.sum([Infinity, -Infinity])).toBeNaN();
  });
});

describe('AggregatedMatchDecider configuration', () => {
  it('rejects a negative lower boundary with Java message', () => {
    expect(() => new AggregatedMatchDecider<string>().withLowerAttachmentBoundary(-0.1)).toThrow(
      new IllegalArgumentException('Lower boundary must be >= 0.'),
    );
  });

  it('rejects a null aggregator', () => {
    expect(() => new AggregatedMatchDecider<string>().withAggregator(null as never)).toThrow(
      'Aggregator cannot be null.',
    );
  });

  it('returns this from every configuration method', () => {
    const decider = new AggregatedMatchDecider<string>();
    expect(decider.withAggregator(AggregatedMatchDecider.sum)).toBe(decider);
    expect(decider.withLowerAttachmentBoundary(0.5)).toBe(decider);
    expect(decider.withLowerBoundaryIncluded(true)).toBe(decider);
  });
});

describe('AggregatedMatchDecider.makeAttachmentDecision', () => {
  it('picks the highest aggregate, the first target winning ties (strict >)', () => {
    const decider = new AggregatedMatchDecider<string>();
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.2], y: [0.9], z: [0.9] }))).toBe('y');
  });

  it('uses max by default across matchers', () => {
    const decider = new AggregatedMatchDecider<string>();
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.2, 0.8], y: [0.7, 0.1] }))).toBe('x');
  });

  it('applies a configured aggregator', () => {
    const decider = new AggregatedMatchDecider<string>().withAggregator(AggregatedMatchDecider.sum);
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.5, 0.5], y: [0.9, 0.0] }))).toBe('x');
  });

  it('excludes a maximum equal to the boundary by default (strict)', () => {
    expect(new AggregatedMatchDecider<string>().makeAttachmentDecision(heuristics({ x: [0] }))).toBeNull();
    const decider = new AggregatedMatchDecider<string>().withLowerAttachmentBoundary(0.5);
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.5] }))).toBeNull();
  });

  it('includes a maximum equal to the boundary when included, and null when below it', () => {
    const decider = new AggregatedMatchDecider<string>()
      .withLowerAttachmentBoundary(0.5)
      .withLowerBoundaryIncluded(true);
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.5] }))).toBe('x');
    expect(decider.makeAttachmentDecision(heuristics({ x: [0.4] }))).toBeNull();
    expect(decider.withLowerBoundaryIncluded(false).makeAttachmentDecision(heuristics({ x: [0.5] }))).toBeNull();
  });

  it('returns null for no targets (max stays -infinity)', () => {
    const decider = new AggregatedMatchDecider<string>().withLowerBoundaryIncluded(true);
    expect(decider.makeAttachmentDecision(new Map())).toBeNull();
  });

  it('throws IllegalStateException with the Java message for a negative aggregate', () => {
    const decider = new AggregatedMatchDecider<string>().withAggregator(() => -1);
    expect(() => decider.makeAttachmentDecision(heuristics({ x: [0.5] }))).toThrow(
      new IllegalStateException('The aggregator provided a value < 0.'),
    );
  });
});

interface StreamSumRow {
  values: string[];
  sum: string;
  avg: string;
  max: string;
  min: string;
}

const view = new DataView(new ArrayBuffer(8));
function fromHex(hex: string): number {
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

function bits(d: number): string {
  return Number.isNaN(d) ? 'NaN' : (view.setFloat64(0, d), view.getBigUint64(0).toString(16));
}

describe('AggregatedMatchDecider aggregators vs JVM stream-sum vectors', () => {
  const { rows } = JSON.parse(
    readFileSync(new URL('../../../test/golden/refs/java/stream-sum.json', import.meta.url), 'utf8'),
  ) as { rows: StreamSumRow[] };

  it('has the recorded rows', () => {
    expect(rows.length).toBe(1035);
  });

  it('reproduces sum and avg bitwise (NaN by NaN-ness) for every row', () => {
    const mismatches: string[] = [];
    for (const row of rows) {
      const values = row.values.map(fromHex);
      if (bits(AggregatedMatchDecider.sum(values)) !== bits(fromHex(row.sum))) {
        mismatches.push(`sum ${row.values.join(',')}`);
      }
      const avg = values.length === 0 ? 0 : AggregatedMatchDecider.avg(values);
      if (bits(avg) !== bits(fromHex(row.avg))) {
        mismatches.push(`avg ${row.values.join(',')}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('reproduces max and min (and NoSuchElementException for empty) for every row', () => {
    const mismatches: string[] = [];
    for (const row of rows) {
      const values = row.values.map(fromHex);
      for (const [name, fn, expected] of [
        ['max', AggregatedMatchDecider.max, row.max],
        ['min', AggregatedMatchDecider.min, row.min],
      ] as const) {
        if (expected === 'NoSuchElementException') {
          if (values.length !== 0) mismatches.push(`${name} should throw ${row.values.join(',')}`);
          expect(() => fn(values)).toThrow(NoSuchElementException);
        } else if (bits(fn(values)) !== bits(fromHex(expected))) {
          mismatches.push(`${name} ${row.values.join(',')}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
