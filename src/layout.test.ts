// SPDX-License-Identifier: EPL-2.0
// `layout(json, options?)`: the async entry point of the public surface (npm-1-0-release D2). Expected values are the
// oracle's: the input twin and the ref of the `json-roundtrip` documentation example (test/golden/examples-inputs and
// test/golden/refs/elk-examples, recorded by tools/oracle/regen-goldens.sh --set examples before this file existed,
// AD-13). The ref is compared at AD-4 (structure exact, numbers within 1e-6).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LayeredMetaDataProvider } from './alg/layered/options/LayeredMetaDataProvider.js';
import { LayoutMetaDataService } from './core/data/LayoutMetaDataService.js';
import { compareLayout, formatDiffs } from '../test/golden/compare-json.js';
import { repoRoot } from '../test/corpus/corpus.js';
import { layout } from './layout.js';
import type { ElkJsonGraph } from './layout.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden');
const EXAMPLE_ID = 'json-roundtrip';
const DIRECTION_KEY = 'elk.direction';
const DIRECTION_DOWN = 'DOWN';
const TWO_NODES = 2;

function readJson(...segments: string[]): ElkJsonGraph {
  return JSON.parse(readFileSync(path.join(GOLDEN_DIR, ...segments), 'utf8')) as ElkJsonGraph;
}

const input = (): ElkJsonGraph => readJson('examples-inputs', `${EXAMPLE_ID}.json`);
const ref = (): ElkJsonGraph => readJson('refs', 'elk-examples', `${EXAMPLE_ID}.json`);

function childrenOf(graph: ElkJsonGraph): { id: string; x: number; y: number }[] {
  return graph['children'] as { id: string; x: number; y: number }[];
}

describe('layout(json, options?) (AD-14 amendment)', () => {
  it('lays an ELK JSON object out to the oracle ref, with no provider registered by the caller', async () => {
    const result = await layout(input());
    const compared = compareLayout(ref(), result);
    expect(formatDiffs(compared.diffs)).toBe('');
    expect(compared.ok).toBe(true);
  });

  it('takes ELK JSON text and returns the same layout as for the object', async () => {
    const fromText = await layout(JSON.stringify(input()));
    const compared = compareLayout(await layout(input()), fromText);
    expect(formatDiffs(compared.diffs)).toBe('');
    expect(compared.ok).toBe(true);
  });

  it('does not mutate the graph it is given', async () => {
    const given = input();
    const before = JSON.stringify(given);
    await layout(given);
    expect(JSON.stringify(given)).toBe(before);
  });

  it('is repeatable: a second call returns the same layout as the first', async () => {
    const first = await layout(input());
    const second = await layout(input());
    const compared = compareLayout(first, second);
    expect(formatDiffs(compared.diffs)).toBe('');
    expect(compared.ok).toBe(true);
  });

  it('works when the caller registered a provider first', async () => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
    const compared = compareLayout(ref(), await layout(input()));
    expect(formatDiffs(compared.diffs)).toBe('');
    expect(compared.ok).toBe(true);
  });

  it('merges options.layoutOptions over the root layoutOptions: DOWN stacks the layers vertically', async () => {
    const right = childrenOf(await layout(input()));
    const down = childrenOf(await layout(input(), { layoutOptions: { [DIRECTION_KEY]: DIRECTION_DOWN } }));
    expect(right).toHaveLength(TWO_NODES);
    expect(down).toHaveLength(TWO_NODES);
    const [client, server] = down;
    expect(server?.y).toBeGreaterThan(client?.y ?? Number.POSITIVE_INFINITY);
    const [rightClient, rightServer] = right;
    expect(rightServer?.x).toBeGreaterThan(rightClient?.x ?? Number.POSITIVE_INFINITY);
  });

  it('rejects, rather than throws, for text that is not ELK JSON', async () => {
    const pending = layout('{');
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toBeInstanceOf(Error);
  });
});
