// SPDX-License-Identifier: EPL-2.0

/** Thin wrapper around the `lizard` CLI: run it on a directory, parse its CSV. */

import { spawnSync } from 'node:child_process';

/** One function as lizard reports it. Lines are 1-based. */
export interface LizardFunction {
  readonly file: string;
  readonly name: string;
  readonly nloc: number;
  readonly ccn: number;
  readonly params: number;
  readonly startLine: number;
  readonly endLine: number;
}

const LIZARD_BIN = 'lizard';
const MAX_BUFFER_BYTES = 512 * 1024 * 1024;
const CSV_COLUMNS = 11;

/** Splits one CSV line; lizard double-quotes text fields and never embeds newlines. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted && ch === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Parses `lizard --csv` output (columns: NLOC,CCN,token,PARAM,length,location,file,function,long_name,start,end). */
export function parseLizardCsv(output: string): LizardFunction[] {
  const result: LizardFunction[] = [];
  for (const line of output.split('\n')) {
    const f = splitCsvLine(line);
    if (f.length !== CSV_COLUMNS) continue;
    result.push({
      nloc: Number(f[0]),
      ccn: Number(f[1]),
      params: Number(f[3]),
      file: f[6]!,
      name: f[7]!,
      startLine: Number(f[9]),
      endLine: Number(f[10]),
    });
  }
  return result;
}

/** True when the `lizard` executable runs. */
export function lizardAvailable(): boolean {
  return spawnSync(LIZARD_BIN, ['--version'], { encoding: 'utf8' }).status === 0;
}

/** Runs lizard over every `.ts` file under `dir` and returns all functions it saw. */
export function runLizard(dir: string): LizardFunction[] {
  const run = spawnSync(LIZARD_BIN, ['--csv', '-l', 'typescript', dir], {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
  });
  if (run.status !== 0) throw new Error(`lizard failed (status ${String(run.status)}): ${run.stderr}`);
  return parseLizardCsv(run.stdout);
}
