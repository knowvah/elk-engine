// SPDX-License-Identifier: EPL-2.0
// Proof of LabelDummyInserter (mission 7f2, T4a): every `scenarios/LabelDummyInserter/*` row and every `models` row that
// stops at `LABEL_DUMMY_INSERTER` of `layered-labels.json`, replayed with the class injected (the enum arm stays staged
// until T11) and the rest of the plan built from the real enums. Expectations come only from the rows (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import {
  isStopRow,
  loadLabelsRows,
  rowsByClass,
  rowsByLastPrefixEntry,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-labels-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { replayDifferences, unportedMember, withProcessor } from './LabelDummyInserterReplay.test.js';

const PROCESSOR = 'LABEL_DUMMY_INSERTER';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: PipelineStopRow[] = [
  ...rowsByClass('scenarios/LabelDummyInserter'),
  ...rowsByLastPrefixEntry(PROCESSOR).filter((row) => row.group === 'models'),
].filter(isStopRow);

describe('LabelDummyInserter (oracle rows)', () => {
  it('finds the recorded rows: 17 scenarios and 68 models stops', () => {
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(17);
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(68);
    expect(loadLabelsRows().length).toBeGreaterThan(rows.length);
  });

  for (const row of rows) {
    it(`replays ${row.id}`, (context) => {
      // a plan that still runs a sibling of mission 7f2 whose enum arm is staged cannot replay yet (T12 replays all)
      if (unportedMember(row) !== null) {
        context.skip();
      }
      expect(replayDifferences(row)).toEqual([]);
    });
  }
});

describe('LabelDummyInserter (the rows are not vacuous)', () => {
  it('the state without the processor differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id.startsWith('scenarios/LabelDummyInserter/'))!;
    const idle = withProcessor(PROCESSOR, { process: (): void => undefined });
    expect(replayDifferences(row, idle).length).toBeGreaterThan(0);
  });
});
