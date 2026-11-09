// SPDX-License-Identifier: EPL-2.0
// Decision G8 (user, mission 7f2): the label metrics table grows append-only. The 1,380 texts recorded at `main` 22fcfcb
// keep their place at the head of the texts list and their entries in the table stay byte-identical; the digests below
// were taken from `git show 22fcfcb:<file>` before the table was re-recorded. Any change to an old entry is stop 20.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';

const TEXTS_FILE = `${repoRoot()}/tools/vectors/layered-label-metrics-texts.txt`;
const METRICS_REF = `${repoRoot()}/test/golden/refs/java/layered-label-metrics.json`;
const ENCODING = 'utf8';
const LINE_BREAK = '\n';
const OLD_TEXT_COUNT = 1380;
/** SHA-256 of the first 1,380 lines of the texts file at 22fcfcb, joined by line breaks. */
const OLD_TEXTS_DIGEST = 'cc158de918c65dabad9d7b2d3c6d3a61c305fa102375e21e943f08516cbbabf8';
/** SHA-256 of the 1,380 old entries, sorted by text, each as its raw table line `"<text>": [w, h]`, joined by line breaks. */
const OLD_ENTRIES_DIGEST = '8fc66fd935419bacd2232ff2273764798ef8bcfcc142801f588a15314ce300dc';
/** One table entry as the recorder writes it, with the JVM's own number formatting kept raw. */
const ENTRY_LINE = /^ {4}("(?:[^"\\]|\\.)*"): (\[[^\]]*\]),?$/;

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function texts(): string[] {
  const lines = readFileSync(TEXTS_FILE, ENCODING).split(LINE_BREAK);
  expect(lines.at(-1)).toBe('');
  return lines.slice(0, -1);
}

function rawEntries(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync(METRICS_REF, ENCODING).split(LINE_BREAK)) {
    const match = ENTRY_LINE.exec(line);
    if (match !== null) {
      entries.set(JSON.parse(match[1]!) as string, match[2]!);
    }
  }
  return entries;
}

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

describe('layered-label-metrics.json grows append-only (G8)', () => {
  it('keeps the 1,380 texts of 22fcfcb first and unchanged', () => {
    const old = texts().slice(0, OLD_TEXT_COUNT);
    expect(old).toHaveLength(OLD_TEXT_COUNT);
    expect(sha256(old.join(LINE_BREAK))).toBe(OLD_TEXTS_DIGEST);
  });

  it('keeps the entries of those texts byte-identical', () => {
    const entries = rawEntries();
    const canonical = texts()
      .slice(0, OLD_TEXT_COUNT)
      .sort(byCodeUnit)
      .map((text) => `${JSON.stringify(text)}: ${entries.get(text)}`)
      .join(LINE_BREAK);
    expect(sha256(canonical)).toBe(OLD_ENTRIES_DIGEST);
  });

  it('has exactly one entry for every text of the list', () => {
    const list = texts();
    const entries = rawEntries();
    expect(new Set(list).size).toBe(list.length);
    expect([...entries.keys()]).toEqual(list);
    const parsed = (JSON.parse(readFileSync(METRICS_REF, ENCODING)) as { sizes: Record<string, unknown> }).sizes;
    expect(Object.keys(parsed)).toHaveLength(list.length);
  });
});
