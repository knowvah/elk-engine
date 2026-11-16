// SPDX-License-Identifier: EPL-2.0
// Pins H13: `STRESS_PENDING` holds exactly the two `elk.stress` models and, applied to the providers of `Issue665Test` and
// `Issue700Test` over a tree with the Java's file names, removes exactly 3 cases (1 + 2) and nothing else.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ISSUE665_GRAPHS,
  ISSUE700_GRAPHS,
  STRESS_PENDING,
  STRESS_PENDING_ISSUE,
  vendored,
  withoutStressPending,
} from './stress-pending.js';
import { listGraphFiles, type FileGraphSource } from './layout-test-sources.js';

const MODELS = [
  'tickets/layered/665_includeChildrenDoesntStop.elkt',
  'tickets/layered/700_brokenHierarchyHandling.elkt',
  'tickets/layered/628_hierarchyAwareLayoutProcessor.elkt',
  'examples/hierarchy/hierarchicalEdges.elkt',
  'examples/hierarchy/hierarchicalLayoutMixing.elkt',
];

const root = mkdtempSync(path.join(tmpdir(), 'stress-pending-'));
for (const model of MODELS) {
  mkdirSync(path.dirname(path.join(root, model)), { recursive: true });
  writeFileSync(path.join(root, model), '');
}
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function count(sources: readonly FileGraphSource[]): number {
  return sources.flatMap((source) => listGraphFiles(source, root)).length;
}

describe('STRESS_PENDING (H13)', () => {
  it('holds exactly the two elk.stress models and cites issue #58', () => {
    expect([...STRESS_PENDING]).toEqual([
      'tickets/layered/665_includeChildrenDoesntStop.elkt',
      'examples/hierarchy/hierarchicalLayoutMixing.elkt',
    ]);
    expect(STRESS_PENDING_ISSUE).toBe('https://github.com/knowvah/elk-engine/issues/58');
  });

  it('removes 1 case from Issue665Test and 2 from Issue700Test, 3 in all', () => {
    const before665 = count(ISSUE665_GRAPHS);
    const after665 = withoutStressPending(ISSUE665_GRAPHS, root).length;
    const before700 = count(ISSUE700_GRAPHS);
    const after700 = withoutStressPending(ISSUE700_GRAPHS, root).length;
    expect([before665, after665]).toEqual([1, 0]);
    expect([before700, after700]).toEqual([4, 2]);
    expect(before665 - after665 + (before700 - after700)).toBe(3);
  });

  it('keeps every other model of the two providers', () => {
    const kept = withoutStressPending(ISSUE700_GRAPHS, root).map((source) => source.path);
    expect(kept.sort()).toEqual([
      'examples/hierarchy/hierarchicalEdges.elkt',
      'tickets/layered/700_brokenHierarchyHandling.elkt',
    ]);
  });

  it('finds the models of the vendored inputs through their compound/ twins', () => {
    const twins = ISSUE700_GRAPHS.map(vendored);
    expect(twins.map((source) => source.path)).toEqual([
      'compound/tickets/layered/**',
      'compound/tickets/layered/**',
      'compound/examples/hierarchy/**',
    ]);
    const vendoredRoot = mkdtempSync(path.join(tmpdir(), 'stress-pending-vendored-'));
    try {
      for (const model of MODELS) {
        mkdirSync(path.dirname(path.join(vendoredRoot, 'compound', model)), { recursive: true });
        writeFileSync(path.join(vendoredRoot, 'compound', model), '');
      }
      const kept = withoutStressPending(twins, vendoredRoot).map((source) => source.path);
      expect(kept.sort()).toEqual([
        'compound/examples/hierarchy/hierarchicalEdges.elkt',
        'compound/tickets/layered/700_brokenHierarchyHandling.elkt',
      ]);
    } finally {
      rmSync(vendoredRoot, { recursive: true, force: true });
    }
  });
});
