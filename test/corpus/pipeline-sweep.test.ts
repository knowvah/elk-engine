// SPDX-License-Identifier: EPL-2.0
// F6 sweep (mission 7f, T14): the whole layered driver replayed over every realworld/ptolemy model: each edge-bearing
// level through `ElkLayered.doLayout` under ORTHOGONAL, POLYLINE and SPLINES (`level` cases), each whole model through the
// recursive engine under RIGHT, LEFT, DOWN and UP (`model` cases). The hash is that of the oracle's canonical form of the
// laid-out graph (`LayeredPipelineVectors.java --sweep`, written by tools/oracle/pipeline-sweep.sh to
// test/corpus/.pipeline-sweep/, or to $PIPELINE_SWEEP_DIR). An ok case must hash equal; a `throws` case must throw the
// recorded class; `refused` and `timeout` cases are counted. Skipped with a message when the models dir or the sweep dir
// is absent. A hash that differs is diagnosed with `pipeline-sweep.sh --dump <case id> <dir>` against the port's canonical
// form (PIPELINE_SWEEP_DUMP_DIR writes it for each mismatch), never by touching the port, a helper or the canonical form.
// PIPELINE_SWEEP_STRIDE=N replays every Nth replayable case (default 2); PIPELINE_SWEEP_REPORT=<file> writes the summary.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { canonical } from '../helpers/layered-phase-sweep.js';
import {
  isOk,
  isThrows,
  pipelineHash,
  readSweep,
  replayCase,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type PipelineSweepCase,
  type PipelineSweepOk,
  type PipelineSweepThrows,
  type SweepLine,
} from '../helpers/layered-pipeline-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'PIPELINE_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.pipeline-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/pipeline-sweep.sh';
const SWEEP_TIMEOUT_MS = 900_000;
const MS_PER_SECOND = 1000;
const STRIDE_ENV = 'PIPELINE_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;
const DUMP_DIR_ENV = 'PIPELINE_SWEEP_DUMP_DIR';
const REPORT_ENV = 'PIPELINE_SWEEP_REPORT';

const models = resolveModelsDir();
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(RESULTS_FILE)
      ? undefined
      : `no oracle sweep at ${SWEEP_DIR}; run ${SWEEP_SCRIPT}`;

const nameOf = (error: unknown): string => (error instanceof Error ? error.constructor.name : typeof error);
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function writeCanonical(id: string, dump: unknown): void {
  const dir = process.env[DUMP_DIR_ENV];
  if (dir !== undefined) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${id.replaceAll('/', '_')}.ts.json`), `${canonical(dump)}\n`);
  }
}

/** A mismatch line for an ok case: the hash differs, or the port threw where the oracle did not. */
function okVerdict(line: PipelineSweepOk, modelsDir: string): string | undefined {
  try {
    const dump = replayCase(line, modelsDir);
    const actual = pipelineHash(dump);
    if (actual === line.sha256) {
      return undefined;
    }
    writeCanonical(line.id, dump);
    return `${line.id} oracle ${line.sha256} port ${actual}`;
  } catch (error) {
    return `${line.id} UNEXPECTED THROW ${nameOf(error)}: ${messageOf(error)}`;
  }
}

/** Verdict on a case the oracle threw on: undefined when the port throws an error of the recorded simple class name. */
function throwsVerdict(line: PipelineSweepThrows, modelsDir: string): string | undefined {
  try {
    replayCase(line, modelsDir);
  } catch (error) {
    const name = nameOf(error);
    return name === line.class ? undefined : `${line.id} oracle threw ${line.class}, port threw ${name}`;
  }
  return `${line.id} oracle threw ${line.class}, port did not throw`;
}

function tally(lines: readonly SweepLine[], keyOf: (line: SweepLine) => string | undefined): string {
  const counts = new Map<string, number>();
  lines.forEach((line) => {
    const key = keyOf(line);
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  return [...counts].map(([key, count]) => `${key}=${String(count)}`).join(' ');
}

const kindOf = (line: SweepLine): string => (line.id.startsWith('level/') ? 'level' : 'model');
const statusOf = (line: SweepLine): string => `${kindOf(line)}-${'status' in line ? line.status : 'ok'}`;

describe('layered pipeline sweep vs the oracle', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const dir = (models as { dir: string }).dir;
  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it(
    'every case matches the oracle',
    () => {
      const started = Date.now();
      const lines: SweepLine[] = readSweep(RESULTS_FILE);
      const stride = Number(process.env[STRIDE_ENV] ?? DEFAULT_STRIDE);
      const mismatches: string[] = [];
      let checked = 0;
      let okChecked = 0;
      let replayable = 0;
      lines.forEach((line) => {
        if (!(isOk(line) || isThrows(line))) {
          return;
        }
        if (replayable++ % stride !== 0) {
          return;
        }
        checked++;
        const replayLine = line as unknown as PipelineSweepCase;
        const verdict = isThrows(line)
          ? throwsVerdict(replayLine as PipelineSweepThrows, dir)
          : okVerdict(replayLine as PipelineSweepOk, dir);
        okChecked += isOk(line) && verdict === undefined ? 1 : 0;
        if (verdict !== undefined) {
          mismatches.push(verdict);
        }
      });
      const summary =
        `pipeline sweep: cases=${String(lines.length)} checked=${String(checked)} ok-matched=${String(okChecked)} ` +
        `mismatches=${String(mismatches.length)} stride=${String(stride)} status: ${tally(lines, statusOf)} ` +
        `refused-by-processor: ${tally(lines, (l) => ('status' in l && l.status === STATUS_REFUSED ? `${kindOf(l)}/${(l as { processor: string }).processor}` : undefined))} ` +
        `timeout=${String(lines.filter((l) => 'status' in l && l.status === STATUS_TIMEOUT).length)} ` +
        `replay-seconds=${String((Date.now() - started) / MS_PER_SECOND)}`;
      console.log(summary);
      const report = process.env[REPORT_ENV];
      if (report !== undefined) {
        writeFileSync(report, `${summary}\n${mismatches.join('\n')}\n`);
      }
      expect(mismatches.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
