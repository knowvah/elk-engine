// SPDX-License-Identifier: EPL-2.0
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareLayout, formatDiffs } from '../../../../test/golden/compare-json.js';
import { isCoverageRun } from '../../../../test/helpers/coverage-run.js';
import { exportLikeOracle } from '../../../../test/helpers/graph-json-oracle.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText, diagnosticsOf } from './ElkGraphJsonText.js';

const REFS_DIR = path.join(repoRoot(), 'test', 'golden', 'refs', 'elkj-parse');
// The curated inputs, vendored byte-for-byte by tools/oracle/regen-elkj-refs.sh (the files the refs were recorded from).
const INPUTS_DIR = path.join(repoRoot(), 'test', 'corpus', 'elkj-curated');
const META_FILE = '_meta.json';
const LARGEST_MODEL = 'json/ptolemy_Trilateration_largest';
const LOAD_BUDGET_MS = 1000;
const LOAD_BUDGET_COVERAGE_MS = 4000;
const LOAD_ATTEMPTS = 3;
const STATUS_OK = 'ok';
const NULL_POINTER = 'java.lang.NullPointerException';

interface Outcome {
  readonly status: string;
  readonly exception?: { readonly class: string; readonly message: string | null };
}

interface Meta {
  readonly files: Record<string, string>;
  readonly inputSha256: Record<string, string>;
  readonly outcomes: Record<string, Outcome>;
}

const curated = (
  JSON.parse(readFileSync(path.join(repoRoot(), 'test', 'corpus', 'elkj-curated.json'), 'utf8')) as {
    models: { id: string }[];
  }
).models;
const meta = JSON.parse(readFileSync(path.join(REFS_DIR, META_FILE), 'utf8')) as Meta;

const refFile = (id: string): string => path.join(REFS_DIR, `${id.replaceAll('/', '__')}.json`);
const inputBytes = (id: string): Buffer => readFileSync(path.join(INPUTS_DIR, meta.files[id] as string));

/** Whether the oracle rejected the input in its reader (an `ElkTextException`), so no ref file exists. */
const rejectedByReader = (id: string): boolean => meta.outcomes[id]?.exception?.class === 'ElkTextException';
/** Whether the oracle read it, and the export then failed at an unresolved reference. */
const unknownEndpoint = (id: string): boolean => meta.outcomes[id]?.exception?.class === NULL_POINTER;

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphJsonText.load: curated refs', () => {
  it('has an input hash and an outcome for every curated model, 15 clean, 18 rejected, 1 unresolved', () => {
    const ids = curated.map((m) => m.id).sort();
    expect(Object.keys(meta.inputSha256).sort()).toEqual(ids);
    expect(Object.keys(meta.outcomes).sort()).toEqual(ids);
    expect(ids.filter((id) => meta.outcomes[id]?.status === STATUS_OK)).toHaveLength(15);
    expect(ids.filter(rejectedByReader)).toHaveLength(18);
    expect(ids.filter(unknownEndpoint)).toHaveLength(1);
  });

  describe.each(curated.map((m) => [m.id] as const))('%s', (id) => {
    it('is the vendored input the ref was recorded from', () => {
      expect(createHash('sha256').update(inputBytes(id)).digest('hex')).toBe(meta.inputSha256[id]);
    });

    it.skipIf(meta.outcomes[id]?.status !== STATUS_OK)('loads clean and exports the recorded ref', () => {
      const loaded = ElkGraphJsonText.load(inputBytes(id).toString('utf8'));
      expect(loaded.errors).toEqual([]);
      const ref: unknown = JSON.parse(readFileSync(refFile(id), 'utf8'));
      const result = compareLayout(ref, JSON.parse(exportLikeOracle(loaded.root as ElkNode)));
      expect(result.ok, formatDiffs(result.diffs)).toBe(true);
      expect(diagnosticsOf(loaded.resource)).toEqual([]);
    });

    it.skipIf(!rejectedByReader(id))(
      'reports a syntax or conversion error, as the oracle rejects it (presence-only, D6)',
      () => {
        const { errors } = ElkGraphJsonText.load(inputBytes(id).toString('utf8'));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((d) => d.kind === 'syntax' || d.kind === 'conversion')).toBe(true);
      },
    );

    it.skipIf(!unknownEndpoint(id))('loads clean, then fails the export at the unresolved reference', () => {
      const loaded = ElkGraphJsonText.load(inputBytes(id).toString('utf8'));
      expect(loaded.errors).toEqual([]);
      let thrown: unknown;
      try {
        exportLikeOracle(loaded.root as ElkNode);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(IllegalArgumentException);
      expect((thrown as Error).message).toBe('');
      expect(diagnosticsOf(loaded.resource).map((d) => d.kind)).toEqual(['linking']);
    });
  });

  it(`loads the largest curated model in under ${LOAD_BUDGET_MS} ms (best of ${LOAD_ATTEMPTS}, warm)`, () => {
    const text = inputBytes(LARGEST_MODEL).toString('utf8');
    const timings = Array.from({ length: LOAD_ATTEMPTS }, () => {
      const started = performance.now();
      const { errors } = ElkGraphJsonText.load(text);
      const elapsed = performance.now() - started;
      expect(errors).toEqual([]);
      return elapsed;
    });
    expect(Math.min(...timings)).toBeLessThan(isCoverageRun() ? LOAD_BUDGET_COVERAGE_MS : LOAD_BUDGET_MS);
  });
});
