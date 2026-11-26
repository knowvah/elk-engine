// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { valueOf } from './JavaBoolean.js';

const REF_URL = new URL('../../../test/golden/refs/java/graphviz-dot-jdk.json', import.meta.url);
const FAMILY = 'booleanValueOf';

interface BooleanRow {
  readonly id: string;
  readonly family: string;
  readonly input: string | null;
  readonly output: string;
}

const ref = JSON.parse(readFileSync(REF_URL, 'utf8')) as {
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly BooleanRow[];
};
const rows = ref.rows.filter((r) => r.family === FAMILY);

describe('JavaBoolean.valueOf vectors', () => {
  it('replays the whole booleanValueOf family', () => {
    expect(rows.length).toBe(ref.rowCounts[FAMILY]);
  });

  it('returns the recorded Boolean.valueOf(String) of every row, null included', () => {
    for (const row of rows) {
      expect(String(valueOf(row.input)), row.id).toBe(row.output);
    }
  });
});
