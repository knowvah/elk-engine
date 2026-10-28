// SPDX-License-Identifier: EPL-2.0
import { readdirSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSiteRow } from '../../../test/helpers/transform-site-rows.js';
import { ElkLayered } from './ElkLayered.js';
import { LayeredLayoutProvider } from './LayeredLayoutProvider.js';
import {
  HIERARCHY_AWARE,
  type IHierarchyAwareLayoutProcessor,
  isHierarchyAwareLayoutProcessor,
} from './IHierarchyAwareLayoutProcessor.js';

class Aware implements IHierarchyAwareLayoutProcessor {
  readonly [HIERARCHY_AWARE] = true as const;
}

describe('isHierarchyAwareLayoutProcessor', () => {
  it('accepts an object carrying the brand', () => {
    expect(isHierarchyAwareLayoutProcessor(new Aware())).toBe(true);
    expect(isHierarchyAwareLayoutProcessor({ [HIERARCHY_AWARE]: true })).toBe(true);
  });

  it('rejects objects without the brand or with another value', () => {
    expect(isHierarchyAwareLayoutProcessor({})).toBe(false);
    expect(isHierarchyAwareLayoutProcessor({ [HIERARCHY_AWARE]: false })).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(class Plain {})).toBe(false);
  });

  it('rejects null and non-objects', () => {
    expect(isHierarchyAwareLayoutProcessor(null)).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(undefined)).toBe(false);
    expect(isHierarchyAwareLayoutProcessor('aware')).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(1)).toBe(false);
  });
});

describe('isHierarchyAwareLayoutProcessor (oracle site row)', () => {
  const row = loadSiteRow('site/strings/hierarchyAware');
  const expected = row.expected as { classes: string[]; LayeredLayoutProvider: boolean; ElkLayered: boolean };
  const layeredDir = fileURLToPath(new URL('.', import.meta.url));

  it('is false for the provider and the algorithm driver, as for the Java instances', () => {
    // oracle: site/strings/hierarchyAware; IHierarchyAwareLayoutProcessor.java:23 (marker interface)
    expect(expected.LayeredLayoutProvider).toBe(false);
    expect(expected.ElkLayered).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(new LayeredLayoutProvider())).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(new ElkLayered())).toBe(false);
  });

  it('lists only LayerSweepCrossingMinimizer as implementor, which no 7a source file defines (sentinel for 7c)', () => {
    // oracle: site/strings/hierarchyAware; IHierarchyAwareLayoutProcessor.java:23 (marker interface)
    expect(expected.classes).toEqual(['org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer']);
    const sources = new Set(
      readdirSync(layeredDir, { recursive: true, encoding: 'utf8' })
        .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
        .map((path) => basename(path, '.ts')),
    );
    for (const binaryName of expected.classes) {
      expect(sources.has(binaryName.slice(binaryName.lastIndexOf('.') + 1))).toBe(false);
    }
    expect(sources.has('ElkLayered')).toBe(true);
  });
});
