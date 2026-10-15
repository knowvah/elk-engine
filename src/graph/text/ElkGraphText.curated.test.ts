// SPDX-License-Identifier: EPL-2.0
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { resolveModelsDir, repoRoot } from '../../../test/corpus/corpus.js';
import { compareLayout, formatDiffs } from '../../../test/golden/compare-json.js';
import { isCoverageRun } from '../../../test/helpers/coverage-run.js';
import { exportLikeOracle } from '../../../test/helpers/graph-json-oracle.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkGraphText } from './ElkGraphText.js';

const REFS_DIR = path.join(repoRoot(), 'test', 'golden', 'refs', 'elkt-parse');
// The curated inputs, vendored byte-for-byte from the pinned elk-models by test/corpus/vendor-elkt-curated.sh.
const INPUTS_DIR = path.join(repoRoot(), 'test', 'corpus', 'elkt-curated');
const META_FILE = '_meta.json';
const LARGEST_MODEL = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt';
const LOAD_BUDGET_MS = 1000;
const LOAD_BUDGET_COVERAGE_MS = 4000;

interface CuratedModel {
  readonly id: string;
  readonly path: string;
}

const curated = (
  JSON.parse(readFileSync(path.join(repoRoot(), 'test', 'corpus', 'elkt-curated.json'), 'utf8')) as {
    models: CuratedModel[];
  }
).models;
const inputSha256 = (
  JSON.parse(readFileSync(path.join(REFS_DIR, META_FILE), 'utf8')) as { inputSha256: Record<string, string> }
).inputSha256;
const models = resolveModelsDir();
const skipReason = 'skip' in models ? models.skip : '';
const modelsDir = 'dir' in models ? models.dir : '';
const note = skipReason === '' ? '' : ` (skipped: ${skipReason})`;

const refFile = (id: string): string => path.join(REFS_DIR, `${id.replaceAll('/', '__')}.json`);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphText.load: curated elk-models refs', () => {
  it('has a ref and an input hash for every curated model', () => {
    expect(curated.length).toBeGreaterThan(0);
    expect(Object.keys(inputSha256).sort()).toEqual(curated.map((m) => m.id).sort());
  });

  describe('against the oracle', () => {
    it.each(curated.map((m) => [m.id, m] as const))('%s', (id, model) => {
      const bytes = readFileSync(path.join(INPUTS_DIR, model.path));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(inputSha256[id]);
      const text = bytes.toString('utf8');
      const { root, errors } = ElkGraphText.load(text);
      expect(errors).toEqual([]);
      const ref: unknown = JSON.parse(readFileSync(refFile(id), 'utf8'));
      const result = compareLayout(ref, JSON.parse(exportLikeOracle(root as never)));
      expect(result.ok, formatDiffs(result.diffs)).toBe(true);
    });
  });

  it.skipIf(skipReason !== '')(`loads the 253 KB Trilateration model in under ${LOAD_BUDGET_MS} ms${note}`, () => {
    const text = readFileSync(path.join(modelsDir, LARGEST_MODEL), 'utf8');
    const started = performance.now();
    const { errors } = ElkGraphText.load(text);
    const elapsed = performance.now() - started;
    expect(errors).toEqual([]);
    expect(elapsed).toBeLessThan(isCoverageRun() ? LOAD_BUDGET_COVERAGE_MS : LOAD_BUDGET_MS);
  });
});
