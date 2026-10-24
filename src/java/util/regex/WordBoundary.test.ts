// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOUNDARY_TABLES, pairRange, WORD_BOUNDARY_SOURCE } from './WordBoundary.js';

const VECTORS_URL = new URL('../../../../test/golden/refs/java/regex-boundary.json', import.meta.url);
const EXPECTED_PROBES = 31;
const FIRST_SUPPLEMENTARY = 0x10000;
const CODE_POINT_COUNT = 0x110000;
const SAMPLE_STRIDE = 61;
const SUPPLEMENTARY_PROBE = 'a%@1';
const UNIT_COUNT = 0x10000;
const TEMPLATE_UNIT = '%';
const TEMPLATE_MARK = '~';
const TEMPLATE_SUPPLEMENTARY_MARK = '^';
const MARK = '̇';
const MARK_PROBE = 'a%@1';
const BASE_PROBE = '%~@2';
const ASCII_WORD = /[A-Za-z0-9_]/;

type Range = readonly [number, number];

interface Probe {
  readonly name: string;
  readonly template: string;
  readonly index: number;
  readonly ranges: readonly Range[];
}

interface Vectors {
  readonly probes: Probe[];
  readonly supplementaryProbes: Probe[];
  readonly bmpThenSupplementaryMarkProbes: Probe[];
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as Vectors;
const probes = vectors.probes;
const SUPPLEMENTARY_MARK = '\u{1D167}';

function probe(name: string): Probe {
  return probes.find((p) => p.name === name)!;
}

function boundaryAt(units: number): RegExp {
  return new RegExp(`^[\\s\\S]{${units}}${WORD_BOUNDARY_SOURCE}`);
}

function membership(ranges: readonly Range[]): Uint8Array {
  const inSet = new Uint8Array(UNIT_COUNT);
  for (const [s, e] of ranges) inSet.fill(1, s, e + 1);
  return inSet;
}

function toRanges(inSet: (c: number) => boolean): number[] {
  const out: number[] = [];
  let start = -1;
  for (let c = 0; c <= UNIT_COUNT; c++) {
    const on = c < UNIT_COUNT && inSet(c);
    if (on && start < 0) start = c;
    if (!on && start >= 0) {
      out.push(start, c - 1);
      start = -1;
    }
  }
  return out;
}

function fill(template: string, c: number): string {
  let text = '';
  for (const t of template) {
    if (t === TEMPLATE_UNIT) text += String.fromCodePoint(c);
    else if (t === TEMPLATE_MARK) text += MARK;
    else if (t === TEMPLATE_SUPPLEMENTARY_MARK) text += SUPPLEMENTARY_MARK;
    else text += t;
  }
  return text;
}

/** UTF-16 index of template position `index`; `%` is one unit, or two when `wide`. */
function unitIndex(template: string, index: number, wide: boolean): number {
  let units = 0;
  for (const t of template.slice(0, index)) {
    units += t === TEMPLATE_UNIT ? (wide ? 2 : 1) : t === TEMPLATE_SUPPLEMENTARY_MARK ? 2 : 1;
  }
  return units;
}

describe('WordBoundary tables', () => {
  it('equal the tables derived from regex-boundary.json', () => {
    const noBoundary = membership(probe(MARK_PROBE).ranges);
    const mark = toRanges((c) => !noBoundary[c] && !ASCII_WORD.test(String.fromCharCode(c)));
    expect(BOUNDARY_TABLES.mark).toEqual(mark);
    expect(BOUNDARY_TABLES.base).toEqual(probe(BASE_PROBE).ranges.flat());
    const supp = vectors.supplementaryProbes.find((p) => p.name === SUPPLEMENTARY_PROBE)!;
    const supplementaryMark: number[] = [];
    let next = FIRST_SUPPLEMENTARY;
    for (const [s, e] of supp.ranges) {
      if (s > next) supplementaryMark.push(next, s - 1);
      next = e + 1;
    }
    if (next < CODE_POINT_COUNT) supplementaryMark.push(next, CODE_POINT_COUNT - 1);
    expect(BOUNDARY_TABLES.supplementaryMark).toEqual(supplementaryMark);
  });
});

describe('WordBoundary replay', () => {
  it('has all recorded probes', () => {
    expect(probes.length).toBe(EXPECTED_PROBES);
  });

  it.each(probes.map((p) => [p.name, p] as const))('probe %s replays for every BMP unit', (_name, p) => {
    const expected = membership(p.ranges);
    const re = boundaryAt(unitIndex(p.template, p.index, false));
    const bad: number[] = [];
    for (let c = 0; c < UNIT_COUNT; c++) {
      if (re.test(fill(p.template, c)) !== (expected[c] === 1)) bad.push(c);
    }
    expect(bad).toEqual([]);
  });
});

describe('WordBoundary replay, BMP unit then a supplementary mark', () => {
  it.each(vectors.bmpThenSupplementaryMarkProbes.map((p) => [p.name, p] as const))(
    'probe %s replays for every BMP unit',
    (_name, p) => {
      const expected = membership(p.ranges);
      const re = boundaryAt(unitIndex(p.template, p.index, false));
      const bad: number[] = [];
      for (let c = 0; c < UNIT_COUNT; c++) {
        if (re.test(fill(p.template, c)) !== (expected[c] === 1)) bad.push(c);
      }
      expect(bad).toEqual([]);
    },
  );
});

describe('WordBoundary replay, supplementary code points', () => {
  it('has a probe for every BMP template', () => {
    expect(vectors.supplementaryProbes.map((p) => p.name)).toEqual(probes.map((p) => p.name));
  });

  it.each(vectors.supplementaryProbes.map((p) => [p.name, p] as const))(
    'probe %s replays at every range edge and on a stride sample',
    (_name, p) => {
      const re = boundaryAt(unitIndex(p.template, p.index, true));
      const inRange = (c: number): boolean => p.ranges.some(([s, e]) => c >= s && c <= e);
      const cps = new Set<number>();
      for (const [s, e] of p.ranges) {
        for (const c of [s - 1, s, e, e + 1]) {
          if (c >= FIRST_SUPPLEMENTARY && c < CODE_POINT_COUNT) cps.add(c);
        }
      }
      for (let c = FIRST_SUPPLEMENTARY; c < CODE_POINT_COUNT; c += SAMPLE_STRIDE) cps.add(c);
      const bad = [...cps].filter((c) => re.test(fill(p.template, c)) !== inRange(c));
      expect(bad).toEqual([]);
    },
  );
});

describe('pairRange', () => {
  const matches = (start: number, end: number, cp: number): boolean =>
    new RegExp(`^(?:${pairRange(start, end).join('|')})$`).test(String.fromCodePoint(cp));

  it.each([
    [0x10000, 0x10005],
    [0x103fe, 0x10401],
    [0x103fe, 0x10c01],
  ])('matches exactly the code points %i..%i, across high-surrogate boundaries', (start, end) => {
    expect(matches(start, end, start - 1)).toBe(false);
    expect(matches(start, end, start)).toBe(true);
    expect(matches(start, end, 0x10400)).toBe(0x10400 >= start && 0x10400 <= end);
    expect(matches(start, end, 0x10800)).toBe(0x10800 >= start && 0x10800 <= end);
    expect(matches(start, end, end)).toBe(true);
    expect(matches(start, end, end + 1)).toBe(false);
  });

  it('emits one, two or three alternatives by the number of high surrogates spanned', () => {
    expect(pairRange(0x10000, 0x10005)).toHaveLength(1);
    expect(pairRange(0x103fe, 0x10401)).toHaveLength(2);
    expect(pairRange(0x103fe, 0x10c01)).toHaveLength(3);
  });
});
