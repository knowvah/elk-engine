// SPDX-License-Identifier: EPL-2.0
// Compound sweep (mission 7h, T13, H5). ORIGIN: test/corpus/loops-sweep.test.ts (7g, T19), adapted. Three parts of hierarchical cases
// replayed through the real pipeline and compared with the oracle's hash
//   a  the label sweep's models that set INCLUDE_CHILDREN x default + 4 directions
//   b  every .elkt / .json of tests/layered, tickets/layered, examples that sets INCLUDE_CHILDREN x default + 4 directions
//   c  every realworld/ptolemy/hierarchical .json with INCLUDE_CHILDREN on the root x 4 directions
// The hash is that of the oracle's canonical form of the laid-out graph (`LayeredCompoundVectors.java --sweep`, written by
// tools/oracle/compound-sweep.sh to test/corpus/.compound-sweep/, or to $COMPOUND_SWEEP_DIR). An ok case must hash equal; a `throws` case must
// throw too (the summary lists oracle class -> port class pairs); `timeout` cases are counted. Skipped with a message when the models dir or the
// sweep dir is absent (the gates set COMPOUND_SWEEP_DIR=/nonexistent). A hash that differs is diagnosed with
// `compound-sweep.sh --dump <case id>... <dir>` against the port's canonical form (COMPOUND_SWEEP_DUMP_DIR writes it for each mismatch), never
// by touching the port, a helper or the canonical form.
// COMPOUND_SWEEP_STRIDE=N replays every Nth replayable case (default 1: the full run); COMPOUND_SWEEP_REPORT=<file> writes the summary.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { canonical } from '../helpers/layered-phase-sweep.js';
import {
  compoundHash,
  isOk,
  isThrows,
  PART_A,
  PART_B,
  PART_C,
  readSweep,
  replayCase,
  STATUS_TIMEOUT,
  type CompoundSweepCase,
  type CompoundSweepOk,
  type CompoundSweepThrows,
  type SweepLine,
} from '../helpers/layered-compound-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'COMPOUND_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.compound-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/compound-sweep.sh';
const SWEEP_TIMEOUT_MS = 3_600_000;
const MS_PER_SECOND = 1000;
const STRIDE_ENV = 'COMPOUND_SWEEP_STRIDE';
const DEFAULT_STRIDE = 1;
const DUMP_DIR_ENV = 'COMPOUND_SWEEP_DUMP_DIR';
const REPORT_ENV = 'COMPOUND_SWEEP_REPORT';
const STATUS_OK = 'ok';
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
function okVerdict(line: CompoundSweepOk, modelsDir: string): string | undefined {
  try {
    const dump = replayCase(line, modelsDir);
    const actual = compoundHash(dump);
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
 * Verdict on a case the oracle threw on: undefined when the port throws too. The class is not compared (the port throws a
 * `TypeError` where the Java dereferences null, translation rules), so the pair is recorded in the summary.
 */
function throwsVerdict(line: CompoundSweepThrows, modelsDir: string): string | undefined {
  try {
    replayCase(line, modelsDir);
  } catch (error) {
    THROW_PAIRS.push(`${line.class}(${line.frame ?? '-'})->${nameOf(error)}: ${messageOf(error)}`);
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
const throwsOf = (line: SweepLine): string | undefined =>
  isThrows(line) ? `${partOf(line)} ${line.class} ${(line as unknown as CompoundSweepThrows).frame ?? '-'}` : undefined;

/** Per part: the cases of the sweep by status, then the cases checked, with the replay time of the part. */
function partSummary(part: string, lines: readonly SweepLine[], checked: Map<string, number>, ms: Map<string, number>): string {
  const own = lines.filter((line) => partOf(line) === part);
  return (
    `part ${part}: cases=${String(own.length)} status: ${tally(own, statusOf)} ` +
    `checked=${String(checked.get(part) ?? 0)} replay-seconds=${String((ms.get(part) ?? 0) / MS_PER_SECOND)}`
  );
}

describe('layered compound sweep vs the oracle', () => {
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
        const replayLine = line as unknown as CompoundSweepCase;
        const verdict = isThrows(line)
          ? throwsVerdict(replayLine as CompoundSweepThrows, dir)
          : okVerdict(replayLine as CompoundSweepOk, dir);
        ms.set(part, (ms.get(part) ?? 0) + Date.now() - began);
        checked.set(part, (checked.get(part) ?? 0) + 1);
        okChecked += isOk(line) && verdict === undefined ? 1 : 0;
        if (verdict !== undefined) {
          mismatches.push(verdict);
        }
      });
      const summary = [
        `compound sweep: cases=${String(lines.length)} checked=${String([...checked.values()].reduce((a, b) => a + b, 0))} ` +
          `ok-matched=${String(okChecked)} mismatches=${String(mismatches.length)} stride=${String(stride)} ` +
          `status: ${tally(lines, statusOf)} throws: ${tally(lines, throwsOf)} ` +
          `throw-pairs: ${[...new Set(THROW_PAIRS)].map((pair) => `${pair}=${String(THROW_PAIRS.filter((p) => p === pair).length)}`).join(' | ')} ` +
          `timeout=${String(lines.filter((l) => 'status' in l && l.status === STATUS_TIMEOUT).length)} ` +
          `replay-seconds=${String((Date.now() - started) / MS_PER_SECOND)}`,
        ...PARTS.map((part) => partSummary(part, lines, checked, ms)),
      ].join('\n');
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
