// SPDX-License-Identifier: EPL-2.0
// Replays every `sites` row of test/golden/refs/java/layered-loops.json (mission 7g, T20; recorded by
// tools/vectors/LayeredLoopsVectors.java from the source-built oracle): one row per scenario Sc1..Sc34 of
// plans/layered-loops-wrapping-compaction/unreached.md, graphs that reach branch arms no earlier row reaches. Rows go
// through `replayLoopsRow` (step interpreter, `labelManager` / `logging` ops, landed comparators) with
// `DummySelfLoopProcessor` registered for the `processor` op. Numbers within 1e-6 (AD-4), everything else exactly. A test
// title is its row id, so `-t '<row id>$'` isolates one row.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLoopsRows, replayLoopsRow, rowsByGroup } from '../../../test/helpers/layered-loops-replay-rows.js';
import { registerStepProcessor } from '../../../test/helpers/layered-loops-replay-ops.js';
import { DummySelfLoopProcessor } from './intermediate/DummySelfLoopProcessor.js';

const SITES_GROUP = 'sites';
const PROCESSOR_NAME = 'DummySelfLoopProcessor';

const siteRows = rowsByGroup(SITES_GROUP, loadLoopsRows());

beforeAll(() => {
  registerStepProcessor(PROCESSOR_NAME, () => new DummySelfLoopProcessor());
});

describe('layered-loops sites rows', () => {
  it('has unique site row ids under sites/', () => {
    expect(new Set(siteRows.map((row) => row.id)).size).toBe(siteRows.length);
    expect(siteRows.every((row) => row.id.startsWith(`${SITES_GROUP}/`))).toBe(true);
  });

  for (const row of siteRows) {
    it(row.id, () => {
      expect(replayLoopsRow(row).map((mismatch) => mismatch.message)).toEqual([]);
    });
  }
});
