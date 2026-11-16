// SPDX-License-Identifier: EPL-2.0
// W5 sweep (mission 7g, T19): three parts of cases replayed through the real pipeline and compared with the oracle's hash
//   a  the pipeline sweep's ptolemy cases that hold one of the nine 7g arms (or connectedComponents) in the plan of some level
//   b  the label sweep's cases that hold one (or connectedComponents)
//   c  an option family (wrapping.strategy, compaction.postCompaction.strategy) over the self loop, compaction and components models
//      and every ptolemy model
// The hash is that of the oracle's canonical form of the laid-out graph (`LayeredLoopsVectors.java --sweep`, written by
// tools/oracle/loops-sweep.sh to test/corpus/.loops-sweep/, or to $LOOPS_SWEEP_DIR). An ok case must hash equal; a `throws` case must
// throw too (the summary lists oracle class -> port class pairs); a refused case must be one of 7h's categories; `timeout` cases
// are counted. Skipped with a message when the models dir or the sweep dir is absent (the gates set
// LOOPS_SWEEP_DIR=/nonexistent). A hash that differs is diagnosed with `loops-sweep.sh --dump <case id> <dir>` against the port's canonical form (LOOPS_SWEEP_DUMP_DIR writes it for each mismatch), never
// by touching the port, a helper or the canonical form.
// LOOPS_SWEEP_STRIDE=N replays every Nth replayable case (default 2, 1 is the full run); LOOPS_SWEEP_REPORT=<file> writes the summary.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { canonical } from '../helpers/layered-phase-sweep.js';
import {
  isOk,
  isThrows,
  loopsHash,
  PART_A,
  PART_B,
  PART_C,
  readSweep,
  replayCase,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type LoopsSweepCase,
  type LoopsSweepOk,
  type LoopsSweepRefused,
  type LoopsSweepThrows,
  type SweepLine,
} from '../helpers/layered-loops-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'LOOPS_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.loops-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/loops-sweep.sh';
const SWEEP_TIMEOUT_MS = 3_600_000;
const MS_PER_SECOND = 1000;
const STRIDE_ENV = 'LOOPS_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;
const DUMP_DIR_ENV = 'LOOPS_SWEEP_DUMP_DIR';
const REPORT_ENV = 'LOOPS_SWEEP_REPORT';
const STATUS_OK = 'ok';
/** The owning mission of the refusals the recorder allows (`REFUSAL_CATEGORIES`). */
const REFUSAL_CATEGORY_7H = 'nested graphs (7h)';
const PARTS = [PART_A, PART_B, PART_C];

const models = resolveModelsDir();
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(RESULTS_FILE)
      ? undefined
      : `no oracle sweep at ${SWEEP_DIR}; run ${SWEEP_SCRIPT}`;

const nameOf = (error: unknown): string => (error instanceof Error ? error.constructor.name : typeof error);
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const partOf = (line: SweepLine): string => line.id.slice(0, 1);

function writeCanonical(id: string, dump: unknown): void {
  const dir = process.env[DUMP_DIR_ENV];
  if (dir !== undefined) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${id.replaceAll('/', '_')}.ts.json`), `${canonical(dump)}\n`);
  }
}

/** A mismatch line for an ok case: the hash differs, or the port threw where the oracle did not. */
function okVerdict(line: LoopsSweepOk, modelsDir: string): string | undefined {
  try {
    const dump = replayCase(line, modelsDir);
    const actual = loopsHash(dump);
    if (actual === line.sha256) {
      return undefined;
    }
    writeCanonical(line.id, dump);
    return `${line.id} oracle ${line.sha256} port ${actual}`;
  } catch (error) {
    return `${line.id} UNEXPECTED THROW ${nameOf(error)}: ${messageOf(error)}`;
  }
}

/** Port exception class per oracle exception class and ELK frame, of the throws cases: read in the summary, not asserted. */
const THROW_PAIRS: string[] = [];

/**
 * Verdict on a case the oracle threw on: undefined when the port throws too. The class is not compared: the port throws a
 * `TypeError` where the Java dereferences null or indexes past an array (translation rules), so the pair is recorded in the summary.
 */
function throwsVerdict(line: LoopsSweepThrows, modelsDir: string): string | undefined {
  try {
    replayCase(line, modelsDir);
  } catch (error) {
    THROW_PAIRS.push(`${line.class}(${line.frame ?? '-'})->${nameOf(error)}`);
    return undefined;
  }
  return `${line.id} oracle threw ${line.class} (${line.frame ?? '-'}), port did not throw`;
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
    ? `${partOf(line)} ${(line as unknown as LoopsSweepRefused).category} ${line.processor}`
    : undefined;
const throwsOf = (line: SweepLine): string | undefined =>
  isThrows(line) ? `${partOf(line)} ${line.class} ${(line as unknown as LoopsSweepThrows).frame ?? '-'}` : undefined;

/** Per part: the cases of the sweep by status, then the cases checked, with the replay time of the part. */
function partSummary(part: string, lines: readonly SweepLine[], checked: Map<string, number>, ms: Map<string, number>): string {
  const own = lines.filter((line) => partOf(line) === part);
  return (
    `part ${part}: cases=${String(own.length)} status: ${tally(own, statusOf)} ` +
    `checked=${String(checked.get(part) ?? 0)} replay-seconds=${String((ms.get(part) ?? 0) / MS_PER_SECOND)}`
  );
}

describe('layered loops sweep vs the oracle', () => {
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
      const checked = new Map<string, number>();
      const ms = new Map<string, number>();
      let okChecked = 0;
      let replayable = 0;
      lines.forEach((line) => {
        if (!(isOk(line) || isThrows(line))) {
          return;
        }
        if (replayable++ % stride !== 0) {
          return;
        }
        const part = partOf(line);
        const began = Date.now();
        const replayLine = line as unknown as LoopsSweepCase;
        const verdict = isThrows(line)
          ? throwsVerdict(replayLine as LoopsSweepThrows, dir)
          : okVerdict(replayLine as LoopsSweepOk, dir);
        ms.set(part, (ms.get(part) ?? 0) + Date.now() - began);
        checked.set(part, (checked.get(part) ?? 0) + 1);
        okChecked += isOk(line) && verdict === undefined ? 1 : 0;
        if (verdict !== undefined) {
          mismatches.push(verdict);
        }
      });
      const foreignRefusals = lines.filter(
        (line) => 'status' in line && line.status === STATUS_REFUSED && (line as unknown as LoopsSweepRefused).category !== REFUSAL_CATEGORY_7H,
      );
      const summary = [
        `loops sweep: cases=${String(lines.length)} checked=${String([...checked.values()].reduce((a, b) => a + b, 0))} ` +
          `ok-matched=${String(okChecked)} mismatches=${String(mismatches.length)} stride=${String(stride)} ` +
          `status: ${tally(lines, statusOf)} refused-by-category: ${tally(lines, refusalOf)} throws: ${tally(lines, throwsOf)} ` +
          `throw-pairs: ${[...new Set(THROW_PAIRS)].map((pair) => `${pair}=${String(THROW_PAIRS.filter((p) => p === pair).length)}`).join(' ')} ` +
          `timeout=${String(lines.filter((l) => 'status' in l && l.status === STATUS_TIMEOUT).length)} ` +
          `replay-seconds=${String((Date.now() - started) / MS_PER_SECOND)}`,
        ...PARTS.map((part) => partSummary(part, lines, checked, ms)),
      ].join('\n');
      console.log(summary);
      const report = process.env[REPORT_ENV];
      if (report !== undefined) {
        writeFileSync(report, `${summary}\n${mismatches.join('\n')}\n`);
      }
      expect(foreignRefusals.map((line) => line.id)).toEqual([]);
      expect(mismatches.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
