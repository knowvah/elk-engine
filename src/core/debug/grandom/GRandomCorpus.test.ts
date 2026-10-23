// SPDX-License-Identifier: EPL-2.0
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphJson } from '../../../graph/json/ElkGraphJson.js';
import type { Random } from '../../../java/util/Random.js';
import { GRandomText } from './GRandomText.js';
import { RandomGraphGenerator } from './generators/RandomGraphGenerator.js';

const CORPUS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../test/corpus/generated');
/** The corpus files: every generated `.elkr` input. */
const CORPUS_FILES: readonly string[] = [
  'disco-components-small',
  'force-graph-small',
  'mrtree-tree-small',
  'radial-tree-small',
  'random-graph-small',
  'sporeCompaction-graph-small',
  'sporeOverlap-graph-small',
  'topdownpacking-hierarchy-small',
  'vertiflex-tree-small',
];
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

/** `GrandomGenerator` plus `CaseRunner.export` for the first graph of the first configuration, plus the corpus newline. */
function regenerate(elkr: string): string {
  const config = GRandomText.parse(elkr).model!.getConfigs()[0]!;
  const root: ElkNode = new RandomGraphGenerator(null as unknown as Random).generate(config)[0]!;
  if (root.getIdentifier() === null) {
    root.setIdentifier(ROOT_IDENTIFIER);
  }
  const json = ElkGraphJson.forGraph(root)
    .omitLayout(false)
    .omitZeroDimension(false)
    .omitZeroPositions(false)
    .omitUnknownLayoutOptions(true)
    .prettyPrint(true)
    .toJson();
  return `${json}\n`;
}

describe('generated corpus regenerates byte for byte', () => {
  it('lists the nine corpus files, equal to the directory listing of *.elkr', () => {
    const listed = readdirSync(CORPUS_DIR)
      .filter((file) => file.endsWith('.elkr'))
      .map((file) => file.slice(0, -'.elkr'.length))
      .sort();
    expect(CORPUS_FILES).toHaveLength(9);
    expect([...CORPUS_FILES].sort()).toEqual(listed);
  });

  for (const name of CORPUS_FILES) {
    it(`${name}: the .elkr regenerates the frozen .json`, () => {
      const elkr = readFileSync(resolve(CORPUS_DIR, `${name}.elkr`), 'utf8');
      const expected = readFileSync(resolve(CORPUS_DIR, `${name}.json`), 'utf8');
      expect(expected.length).toBeGreaterThan(0);
      expect(describeMismatch(regenerate(elkr), expected)).toBe('identical');
    });
  }
});
