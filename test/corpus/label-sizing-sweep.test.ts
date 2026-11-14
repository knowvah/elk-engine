// SPDX-License-Identifier: EPL-2.0
// Mission text-sizing-seam (T4, TX6b): every label-bearing model of the models repository (census `labels > 0`, parse ok)
// sized by the TS test framework with the fixed measurer, against the sizes the patched oracle's framework gave the same
// model (`tools/vectors/label-sizing-vectors.sh --corpus <modelsDir> <dir>` writes <dir>/label-sizing-corpus.json; patch
// 0003, property `fixed`). The label rows must be equal in order: key, text, size and `preset`, exactly. The oracle file is
// local (AD-5): $LABEL_SIZING_SWEEP_DIR, default <ELK_ORACLE_DIR or ../elk-oracle>/sweep/label-sizing. Skipped with a
// message when the models dir or that file is absent (the gates set LABEL_SIZING_SWEEP_DIR=/nonexistent). A mismatch is a
// divergence to diagnose (stop 6), never a reason to touch the oracle file or the derivation.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { COMMITTED_CENSUS_RELATIVE, DEFAULT_ORACLE_RELATIVE, ORACLE_DIR_ENV, type Census } from '../../tools/corpus/census.js';
import { labelRows, type LabelRow } from '../helpers/label-sizing-rows.js';
import { FIXED_ADVANCE_TEXT_MEASURER } from '../helpers/layout-test-text-measurer.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

interface CorpusModel {
  readonly id: string;
  readonly source: string;
  readonly labels: readonly LabelRow[];
}

interface CorpusSizes {
  readonly measurer: string;
  readonly models: readonly CorpusModel[];
  readonly failures: readonly { readonly id: string; readonly error: string }[];
}

const SWEEP_DIR_ENV = 'LABEL_SIZING_SWEEP_DIR';
const SWEEP_SCRIPT = 'tools/vectors/label-sizing-vectors.sh --corpus';
const ORACLE_DIR = process.env[ORACLE_DIR_ENV] ?? path.resolve(repoRoot(), DEFAULT_ORACLE_RELATIVE);
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(ORACLE_DIR, 'sweep', 'label-sizing');
const SIZES_FILE = path.join(SWEEP_DIR, 'label-sizing-corpus.json');
const ELKT_SOURCE = 'elkt';
const PARSE_OK = 'ok';
const MEASURER_FIXED = 'fixed';
const MAX_REPORTED = 20;
const SWEEP_TIMEOUT_MS = 600_000;

const models = resolveModelsDir();
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(SIZES_FILE)
      ? undefined
      : `no oracle label sizes at ${SWEEP_DIR} (${SWEEP_DIR_ENV}); run ${SWEEP_SCRIPT}`;

function load(file: string, source: string): ElkNode {
  const text = readFileSync(file, 'utf8');
  if (source !== ELKT_SOURCE) {
    return ElkGraphJson.forGraph(text).toElk();
  }
  const loaded = ElkGraphText.load(text);
  if (loaded.root === null || loaded.errors.length > 0) {
    throw new Error(`elkt load failed: ${loaded.errors[0]?.message ?? 'no root'}`);
  }
  return loaded.root;
}

/** The first difference between the oracle's rows and the port's, or undefined when they are equal. */
function firstDifference(expected: readonly LabelRow[], actual: readonly LabelRow[]): string | undefined {
  if (expected.length !== actual.length) {
    return `oracle has ${String(expected.length)} labels, port ${String(actual.length)}`;
  }
  for (let i = 0; i < expected.length; i++) {
    const want = JSON.stringify(expected[i]);
    const got = JSON.stringify(actual[i]);
    if (want !== got) {
      return `row ${String(i)}: oracle ${want} port ${got}`;
    }
  }
  return undefined;
}

/** A mismatch line for one model, or undefined when every row is equal. */
function verdict(model: CorpusModel, modelsDir: string): string | undefined {
  try {
    const graph = load(path.join(modelsDir, `${model.id}.${model.source}`), model.source);
    const rows = labelRows(graph, FIXED_ADVANCE_TEXT_MEASURER).map(({ key, text, size, preset }) => ({
      key,
      text,
      size,
      preset,
    }));
    const difference = firstDifference(model.labels, rows);
    return difference === undefined ? undefined : `${model.id} ${difference}`;
  } catch (error) {
    return `${model.id} PORT THREW ${error instanceof Error ? error.message : String(error)}`;
  }
}

function labelBearingCensusCount(): number {
  const census = JSON.parse(readFileSync(path.join(repoRoot(), COMMITTED_CENSUS_RELATIVE), 'utf8')) as Census;
  return census.models.filter((model) => model.labels > 0 && model.parse === PARSE_OK).length;
}

describe('label sizes of the corpus vs the oracle (fixed measurer)', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const modelsDir = (models as { dir: string }).dir;
  const sizes = JSON.parse(readFileSync(SIZES_FILE, 'utf8')) as CorpusSizes;

  it('the oracle file is in fixed mode and covers every label-bearing census model', () => {
    expect(sizes.measurer).toBe(MEASURER_FIXED);
    expect(sizes.failures).toEqual([]);
    expect(sizes.models.length).toBe(labelBearingCensusCount());
  });

  it(
    'every model has the oracle label rows',
    () => {
      const mismatches = sizes.models.flatMap((model) => verdict(model, modelsDir) ?? []);
      const labels = sizes.models.reduce((sum, model) => sum + model.labels.length, 0);
      const equal = sizes.models.length - mismatches.length;
      console.log(
        `label-sizing sweep: models=${String(equal)}/${String(sizes.models.length)} labels=${String(labels)}`,
      );
      const report = [...mismatches.slice(0, MAX_REPORTED), `${String(mismatches.length)} mismatching models`];
      expect(mismatches.length === 0 ? '' : report.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
