// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NoSuchElementException } from './NoSuchElementException.js';
import { StringTokenizer } from './StringTokenizer.js';

const REF_URL = new URL('../../../test/golden/refs/java/graphviz-dot-jdk.json', import.meta.url);
const FAMILY = 'tokenizer';
const NO_SUCH_ELEMENT = 'java.util.NoSuchElementException';

interface Thrown {
  readonly cls: string;
  readonly msg: string | null;
}
interface TokenizerRow {
  readonly id: string;
  readonly family: string;
  readonly delims: string;
  readonly input: string;
  readonly loop: readonly string[];
  readonly after: { readonly hasMoreTokens: boolean; readonly nextToken: Thrown };
  readonly nextOnly: readonly (string | { readonly thrown: Thrown })[];
}

const ref = JSON.parse(readFileSync(REF_URL, 'utf8')) as {
  readonly classOnlyMessages: readonly string[];
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly TokenizerRow[];
};
const rows = ref.rows.filter((r) => r.family === FAMILY);

/** The exception class the ref recorded; the message is JDK text (classOnlyMessages), so only the class is compared. */
function expectThrown(call: () => unknown, thrown: Thrown, id: string): void {
  expect(thrown.cls, id).toBe(NO_SUCH_ELEMENT);
  expect(call, id).toThrow(NoSuchElementException);
}

describe('StringTokenizer vectors', () => {
  it('replays the whole tokenizer family', () => {
    expect(ref.classOnlyMessages).toContain(FAMILY);
    expect(rows.length).toBe(ref.rowCounts[FAMILY]);
  });

  it('yields the recorded tokens of the hasMoreTokens/nextToken loop, asking hasMoreTokens twice', () => {
    for (const row of rows) {
      const tokenizer = new StringTokenizer(row.input, row.delims);
      const tokens: string[] = [];
      while (tokenizer.hasMoreTokens()) {
        expect(tokenizer.hasMoreTokens(), row.id).toBe(true);
        tokens.push(tokenizer.nextToken());
      }
      expect(tokens, row.id).toEqual(row.loop);
      expect(tokenizer.hasMoreTokens(), row.id).toBe(row.after.hasMoreTokens);
      expectThrown(() => tokenizer.nextToken(), row.after.nextToken, row.id);
    }
  });

  it('yields the recorded tokens and exceptions of nextToken alone', () => {
    for (const row of rows) {
      const tokenizer = new StringTokenizer(row.input, row.delims);
      for (const expected of row.nextOnly) {
        if (typeof expected === 'string') {
          expect(tokenizer.nextToken(), row.id).toBe(expected);
        } else {
          expectThrown(() => tokenizer.nextToken(), expected.thrown, row.id);
        }
      }
    }
  });
});
