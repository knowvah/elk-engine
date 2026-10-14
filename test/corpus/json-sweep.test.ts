// SPDX-License-Identifier: EPL-2.0
// J7/J8 sweep: the port's import->export (`parse`) of every .json model under ELK_MODELS_DIR equals the oracle's
// (written by tools/oracle/json-sweep.sh into test/corpus/.json-sweep/) within 1e-6 (test/golden/compare-json.ts).
// Skipped with a message when the models dir or the sweep dir is absent. The elk-models inputs are pre-layout, so
// unlike the layout goldens they need no `resolvedAlgorithm` strip.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR = path.join(repoRoot(), 'test', 'corpus', '.json-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const STATUS_OK = 'ok';
const ID_SEPARATOR = '/';
const ID_REPLACEMENT = '__';
const SWEEP_SCRIPT = 'tools/oracle/json-sweep.sh';
const SWEEP_TIMEOUT_MS = 120_000;

interface OracleResult {
  readonly id: string;
  readonly status: string;
}

const models = resolveModelsDir();
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(RESULTS_FILE)
      ? undefined
      : `no oracle sweep at ${SWEEP_DIR}; run ${SWEEP_SCRIPT}`;

function readResults(): OracleResult[] {
  return readFileSync(RESULTS_FILE, 'utf8')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as OracleResult);
}

const oracleOutput = (id: string): string =>
  readFileSync(path.join(SWEEP_DIR, id.split(ID_SEPARATOR).join(ID_REPLACEMENT) + '.json'), 'utf8');

/** Per-model verdict: undefined when it matches, else the diff report. */
function check(modelsDir: string, result: OracleResult): string | undefined {
  const input = readFileSync(path.join(modelsDir, result.id + '.json'), 'utf8');
  if (result.status !== STATUS_OK) {
    try {
      ElkGraphJson.forGraph(input).toElk();
    } catch {
      return undefined;
    }
    return `oracle ${result.status} but the port imported it`;
  }
  const actual = exportLikeOracle(ElkGraphJson.forGraph(input).toElk());
  const { ok, diffs } = compareLayout(JSON.parse(oracleOutput(result.id)), JSON.parse(actual));
  return ok ? undefined : formatDiffs(diffs);
}

describe('json parse sweep vs the oracle', () => {
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
    'every model matches within 1e-6',
    () => {
      const results = readResults();
      const failures = results.flatMap((r) => {
        const report = check(dir, r);
        return report === undefined ? [] : [`${r.id}\n${report}`];
      });
      const oracleFailed = results.filter((r) => r.status !== STATUS_OK).length;
      const matched = results.length - failures.length;
      console.log(
        `json sweep: models=${results.length} matched=${matched} diffs=${failures.length} oracle-failed=${oracleFailed}`,
      );
      expect(failures.join('\n\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
