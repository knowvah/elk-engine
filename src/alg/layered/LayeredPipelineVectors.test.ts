// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-pipeline.json (mission 7f, T9; recorded by
// tools/vectors/LayeredPipelineVectors.java from the source-built oracle): `full` rows through the recursive engine and
// the oracle's export, `models` rows through the real driver (`ElkLayered` test API) with 7e's dump and comparator,
// `scenarios` and `sites` rows through the step interpreter with the real factories. Numbers within 1e-6 (AD-4),
// everything else exactly. A test title is its row id, so `-t '<row id>'` isolates one row. FX7: 0 rows are pinned since 7g
// wired its arms (the 1 models row of 7g replays its recorded expectation); the 57 rows of 7f2 replay since G9.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { formatDiffs } from '../../../test/golden/compare-json.js';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { PINNED_PIPELINE_ROWS } from '../../../test/helpers/layered-pipeline-pinned-rows.js';
import { STRICT_ROUTING_PHASE_FACTORIES } from '../../../test/helpers/layered-replay-factories.js';
import { compareRouting, compareRoutingFullDump } from '../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../test/helpers/layered-routing-replay-dump.js';
import type { RoutingExpected } from '../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../test/helpers/layered-site-replay-dump.js';
import {
  compareFullRow,
  comparePipeline,
  pipelineDump,
  runFullRow,
  runPipelineSteps,
  runStopRow,
} from '../../../test/helpers/layered-pipeline-replay-ops.js';
import {
  isComponentsRow,
  isFullRow,
  isStopRow,
  loadPipelineRows,
  PIPELINE_ROW_GROUPS,
  registerPipelineEnums,
  type PipelineRow,
  type PipelineRowGroup,
} from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { ElkLayered } from './ElkLayered.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;

const rows = loadPipelineRows(PIPELINE_REF);
const rowCounts = (JSON.parse(readFileSync(PIPELINE_REF, 'utf8')) as { rowCounts: Record<string, number> }).rowCounts;

/** The row's dump of the target and, when the row recorded one, the dump with every property value. */
function stopDumps(row: Extract<PipelineRow, { group: 'models' | 'scenarios' | 'sites' }>): void {
  if (isComponentsRow(row)) {
    expect(
      comparePipeline(
        pipelineDump(runPipelineSteps(row, STRICT_ROUTING_PHASE_FACTORIES, new ComponentsProcessor())),
        row.expected,
      ),
    ).toEqual([]);
    return;
  }
  if (row.steps === null) {
    let actual: RoutingExpected | undefined;
    let fullDump: ReturnType<typeof dumpWithPropertyValues> | undefined;
    const diffs = runStopRow(row, {
      driver: new ElkLayered(),
      dump: (graph, importDump) => {
        actual = routingDump(graph, importDump);
        fullDump = row.expected.dump === undefined ? undefined : dumpWithPropertyValues(graph);
        return actual;
      },
      compare: compareRouting,
    });
    expect(diffs).toEqual([]);
    if (fullDump !== undefined) {
      expect(compareRoutingFullDump({ ...actual!, dump: fullDump }, row.expected)).toEqual([]);
    }
    return;
  }
  const result = runPipelineSteps(row, STRICT_ROUTING_PHASE_FACTORIES, new ComponentsProcessor());
  const actual = pipelineDump(result);
  expect(comparePipeline(actual, row.expected)).toEqual([]);
  if (row.expected.dump !== undefined && !('components' in actual)) {
    const dump = dumpWithPropertyValues(result.graph);
    expect(compareRoutingFullDump({ ...actual, dump }, row.expected)).toEqual([]);
  }
}

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('layered-pipeline replay', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded total row count', () => {
    expect(rows.length).toBe(Object.values(rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it.each(PIPELINE_ROW_GROUPS)('has the recorded %s row count', (group) => {
    expect(rows.filter((row) => row.group === group).length).toBe(rowCounts[group] ?? 0);
  });

  it('pins exactly the 0 models rows of FX7', () => {
    const pinned = rows.filter((row) => PINNED_PIPELINE_ROWS.has(row.id));
    expect(pinned).toHaveLength(0);
    expect(PINNED_PIPELINE_ROWS.size).toBe(0);
  });

  describe.each(
    PIPELINE_ROW_GROUPS.map((group): [PipelineRowGroup, PipelineRow[]] => [
      group,
      rows.filter((row) => row.group === group),
    ]),
  )('%s rows', (_group, groupRows) => {
    it.each(groupRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      if (isFullRow(row)) {
        const diffs = compareFullRow(runFullRow(row), row);
        expect(formatDiffs(diffs)).toBe('');
      } else if (isStopRow(row)) {
        const pinned = PINNED_PIPELINE_ROWS.get(row.id);
        if (pinned === undefined) {
          stopDumps(row);
        } else {
          expect(() => {
            stopDumps(row);
          }).toThrow(new UnsupportedOperationException(pinned));
        }
      }
    });
  });
});
