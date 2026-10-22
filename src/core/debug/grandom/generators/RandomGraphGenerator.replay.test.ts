// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ElkGraphJson } from '../../../../graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { Random } from '../../../../java/util/Random.js';
import { isCoverageRun } from '../../../../../test/helpers/coverage-run.js';
import { Form } from '../gRandom/Form.js';
import { GRandomText } from '../GRandomText.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

interface GenerateRow {
  readonly id: string;
  readonly input: string;
  readonly kind: string;
  readonly configs?: readonly { readonly graphs: readonly string[] }[];
}

const VECTORS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../test/golden/refs/java/grandom-generate.json',
);

/** The forms whose generators are ported; T13 and T14 widen this list. */
const ACCEPTED_FORMS: readonly Form[] = [Form.CUSTOM];
/** Mission stop 12: the 200-node stress row must replay within this wall-clock budget. */
const STRESS_ROW_ID = 'stress-200';
const STRESS_BUDGET_MS = 1000;
const STRESS_BUDGET_COVERAGE_MS = 5000;
const STRESS_RUNS = 3;
const ROOT_IDENTIFIER = 'root';
const CONTEXT_CHARS = 40;

/** Describes the first differing offset of two strings with context, or `identical`. */
function describeMismatch(actual: string, expected: string): string {
  if (actual === expected) {
    return 'identical';
  }
  let offset = 0;
  while (offset < actual.length && offset < expected.length && actual[offset] === expected[offset]) {
    offset++;
  }
  const from = Math.max(0, offset - CONTEXT_CHARS);
  const slice = (text: string): string => JSON.stringify(text.slice(from, offset + CONTEXT_CHARS));
  return `first difference at offset ${offset} (lengths ${actual.length} vs ${expected.length}): actual ${slice(actual)} expected ${slice(expected)}`;
}

/** `CaseRunner.export`: the export flags of the oracle harness. */
function exportGraph(root: ElkNode): string {
  return ElkGraphJson.forGraph(root)
    .omitLayout(false)
    .omitZeroDimension(false)
    .omitZeroPositions(false)
    .omitUnknownLayoutOptions(true)
    .prettyPrint(true)
    .toJson();
}

/** Generates the graphs of every configuration of the text, as `GrandomGenerator` plus `CaseRunner.export` do. */
function generateExports(text: string): string[][] {
  const model = GRandomText.parse(text).model;
  return (model?.getConfigs() ?? []).map((config) =>
    new RandomGraphGenerator(null as unknown as Random).generate(config).map((root) => {
      if (root.getIdentifier() === null) {
        root.setIdentifier(ROOT_IDENTIFIER);
      }
      return exportGraph(root);
    }),
  );
}

const allRows = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { rows: GenerateRow[] }).rows;
const seededRows = allRows.filter((row) => row.kind === 'seeded');
const replayedRows = seededRows.filter((row) =>
  (GRandomText.parse(row.input).model?.getConfigs() ?? []).every((config) => ACCEPTED_FORMS.includes(config.getForm())),
);

describe('describeMismatch', () => {
  it('reports identical strings', () => {
    expect(describeMismatch('abc', 'abc')).toBe('identical');
  });

  it('reports the first differing offset with context and both lengths', () => {
    expect(describeMismatch('abcXef', 'abcYefg')).toBe(
      'first difference at offset 3 (lengths 6 vs 7): actual "abcXef" expected "abcYefg"',
    );
  });

  it('reports a prefix as a difference at the end of the shorter string', () => {
    expect(describeMismatch('ab', 'abc')).toBe(
      'first difference at offset 2 (lengths 2 vs 3): actual "ab" expected "abc"',
    );
  });
});

describe('RandomGraphGenerator replay of the JVM vectors', () => {
  it('replays the graphs-form rows: 58 seeded rows, the accepted forms are selected', () => {
    expect(seededRows).toHaveLength(58);
    expect(replayedRows.length).toBeGreaterThan(0);
    expect(replayedRows.length).toBeLessThan(seededRows.length);
    expect(replayedRows.some((row) => row.id === STRESS_ROW_ID)).toBe(true);
  });

  for (const row of replayedRows) {
    it(`${row.id}: every generated graph export equals the recorded export`, () => {
      const actual = generateExports(row.input);
      const recorded = (row.configs ?? []).map((config) => config.graphs);
      expect(actual.map((graphs) => graphs.length)).toEqual(recorded.map((graphs) => graphs.length));
      actual.forEach((graphs, configIndex) => {
        graphs.forEach((graph, graphIndex) => {
          const expected = recorded[configIndex]?.[graphIndex] ?? '';
          expect(describeMismatch(graph, expected), `${row.id} config ${configIndex} sample ${graphIndex}`).toBe(
            'identical',
          );
        });
      });
    });
  }

  it(`${STRESS_ROW_ID} replays within the wall-clock budget`, () => {
    const row = replayedRows.find((r) => r.id === STRESS_ROW_ID)!;
    let best = Number.POSITIVE_INFINITY;
    for (let run = 0; run < STRESS_RUNS; run++) {
      const start = performance.now();
      generateExports(row.input);
      best = Math.min(best, performance.now() - start);
    }
    expect(best).toBeLessThan(isCoverageRun() ? STRESS_BUDGET_COVERAGE_MS : STRESS_BUDGET_MS);
  });
});
