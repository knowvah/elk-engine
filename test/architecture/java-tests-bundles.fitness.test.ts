// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (issue #97; plans/java-tests-bundles/decisions.md, D3): every ELK test bundle a TS file cites by
 * path (`<bundle>/src/<path>Test.java` or `.xtend`, the `@see` of a ported JUnit suite) is on the classpath
 * `tools/oracle/java-tests.sh` builds, so one call of the script runs every ported JUnit class on the oracle. A port
 * that cites a new test bundle fails here until `TEST_BUNDLES` carries it. Whether a bundle is built is the script's
 * own check (it dies naming a missing one); this test needs no oracle.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCANNED_DIRS = ['src', 'test'] as const;
const SCRIPT = join(ROOT, 'tools', 'oracle', 'java-tests.sh');
/** A ported JUnit suite's source path, from the bundle name on; the same pattern as the upgrade runbook's grep. */
const CITATION = /org\.eclipse\.elk\.[a-z.]+test[a-z.]*\/src\/[A-Za-z0-9_/]+Test\.(java|xtend)/g;
const TEST_BUNDLES_ARRAY = /^TEST_BUNDLES=\(([^)]*)\)/m;
/** The test framework every layout test builds on; no suite of its own is ported, so no path cites it. */
const FRAMEWORK_BUNDLE = 'org.eclipse.elk.alg.test';
const JSON_TEST_BUNDLE = 'org.eclipse.elk.graph.json.test';
const XTEND_EXTENSION = '.xtend';

/** Every citation in the `.ts` files under `dir`, repeats included. */
function citations(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return citations(full);
    if (!entry.name.endsWith('.ts')) return [];
    return readFileSync(full, 'utf8').match(CITATION) ?? [];
  });
}

/** The bundle a citation names: the text before its first `/`. */
function bundleOf(citation: string): string {
  return citation.slice(0, citation.indexOf('/'));
}

/** The entries of the script's `TEST_BUNDLES=( … )` array, which may wrap over several lines. */
function carriedBundles(script: string): string[] {
  const match = TEST_BUNDLES_ARRAY.exec(script);
  if (match === null) {
    throw new Error('tools/oracle/java-tests.sh has no TEST_BUNDLES=( … ) array; update this test with the script');
  }
  return match[1]!.split(/\s+/).filter((bundle) => bundle !== '');
}

describe('java-tests.sh test bundles (#97)', () => {
  const cited = SCANNED_DIRS.flatMap((dir) => citations(join(ROOT, dir)));
  const carried = carriedBundles(readFileSync(SCRIPT, 'utf8'));

  it('reads an array that wraps over several lines', () => {
    expect(carriedBundles('X=1\nTEST_BUNDLES=(a.test b.test\n  c.test)\nY=(d.test)\n')).toEqual([
      'a.test',
      'b.test',
      'c.test',
    ]);
  });

  it('finds the citations, the Xtend suites included', () => {
    const xtendBundles = cited.filter((citation) => citation.endsWith(XTEND_EXTENSION)).map(bundleOf);
    expect(xtendBundles).toContain(JSON_TEST_BUNDLE);
  });

  it('carries every test bundle a TS file cites', () => {
    const missing = [...new Set(cited.map(bundleOf))].filter((bundle) => !carried.includes(bundle)).sort();
    expect(missing, 'add these to TEST_BUNDLES in tools/oracle/java-tests.sh').toEqual([]);
  });

  it('carries the test framework bundle', () => {
    expect(carried).toContain(FRAMEWORK_BUNDLE);
  });
});
