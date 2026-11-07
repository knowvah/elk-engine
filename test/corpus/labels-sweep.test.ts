// SPDX-License-Identifier: EPL-2.0
// G7 sweep (mission 7f2, T15): every label- or comment-bearing `.elkt` of the models repository (`tests/layered`,
// `tickets/layered`, `examples`) replayed through the recursive engine at the file's own options and under RIGHT, LEFT, DOWN
// and UP. The hash is that of the oracle's canonical form of the laid-out graph (`LayeredLabelsVectors.java --sweep`, written
// by tools/oracle/labels-sweep.sh to test/corpus/.labels-sweep/, or to $LABELS_SWEEP_DIR). An ok case must hash equal; a
// `throws` case must throw the recorded class; `refused` and `timeout` cases are counted per category. Skipped with a
// message when the models dir or the sweep dir is absent (the gates set LABELS_SWEEP_DIR=/nonexistent). A hash that differs
// is diagnosed with `labels-sweep.sh --dump <case id> <dir>` against the port's canonical form (LABELS_SWEEP_DUMP_DIR
// writes it for each mismatch), never by touching the port, a helper or the canonical form.
// LABELS_SWEEP_STRIDE=N replays every Nth replayable case (default 2, 1 is the full run); LABELS_SWEEP_REPORT=<file> writes
// the summary.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { canonical } from '../helpers/layered-phase-sweep.js';
import {
  isOk,
  isThrows,
  labelsHash,
  readSweep,
  replayCase,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type LabelsSweepCase,
  type LabelsSweepOk,
  type LabelsSweepRefused,
  type LabelsSweepThrows,
  type SweepLine,
} from '../helpers/layered-labels-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'LABELS_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.labels-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/labels-sweep.sh';
const SWEEP_TIMEOUT_MS = 1_800_000;
const MS_PER_SECOND = 1000;
const STRIDE_ENV = 'LABELS_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;
const DUMP_DIR_ENV = 'LABELS_SWEEP_DUMP_DIR';
const REPORT_ENV = 'LABELS_SWEEP_REPORT';
const STATUS_OK = 'ok';

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
function okVerdict(line: LabelsSweepOk, modelsDir: string): string | undefined {
  try {
    const dump = replayCase(line, modelsDir);
    const actual = labelsHash(dump);
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
function throwsVerdict(line: LabelsSweepThrows, modelsDir: string): string | undefined {
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

const statusOf = (line: SweepLine): string => ('status' in line ? line.status : STATUS_OK);
const refusalOf = (line: SweepLine): string | undefined =>
  'status' in line && line.status === STATUS_REFUSED
    ? `${(line as unknown as LabelsSweepRefused).category} ${line.processor}`
    : undefined;

describe('layered labels sweep vs the oracle', () => {
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
        const replayLine = line as unknown as LabelsSweepCase;
        const verdict = isThrows(line)
          ? throwsVerdict(replayLine as LabelsSweepThrows, dir)
          : okVerdict(replayLine as LabelsSweepOk, dir);
        okChecked += isOk(line) && verdict === undefined ? 1 : 0;
        if (verdict !== undefined) {
          mismatches.push(verdict);
        }
      });
      const summary =
        `labels sweep: cases=${String(lines.length)} checked=${String(checked)} ok-matched=${String(okChecked)} ` +
        `mismatches=${String(mismatches.length)} stride=${String(stride)} status: ${tally(lines, statusOf)} ` +
        `refused-by-category: ${tally(lines, refusalOf)} ` +
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
