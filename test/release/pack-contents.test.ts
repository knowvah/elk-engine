// SPDX-License-Identifier: EPL-2.0
// docs-publish-prep T7 (DP8): the pure half of the pack rehearsal. `checkPackContents` names every problem of a tarball
// file list; `parsePackJson` reads the file list out of `npm pack --json`.
import { describe, expect, it } from 'vitest';
import {
  checkPackContents,
  FORBIDDEN_PREFIXES,
  parsePackJson,
  REQUIRED_FILES,
} from '../../tools/release/pack-contents.js';

const GOOD: readonly string[] = [
  'package.json',
  'README.md',
  'LICENSE',
  'NOTICE.md',
  'dist/index.js',
  'dist/index.js.map',
  'dist/index.d.ts',
  'dist/graph/ElkNode.d.ts',
  'src/index.ts',
  'src/graph/ElkNode.ts',
  // Not the top-level test/ directory: ELK has packages named `test` and `testing`.
  'src/core/testing/TestController.ts',
];

describe('checkPackContents', () => {
  it('accepts a list with every required file and nothing forbidden', () => {
    expect(checkPackContents(GOOD)).toEqual([]);
  });

  it('requires exactly these files', () => {
    expect(REQUIRED_FILES).toEqual([
      'package.json',
      'README.md',
      'LICENSE',
      'NOTICE.md',
      'dist/index.js',
      'dist/index.d.ts',
    ]);
  });

  it.each(REQUIRED_FILES.map((file) => [file] as const))('names the missing required file %s', (file) => {
    expect(checkPackContents(GOOD.filter((entry) => entry !== file))).toEqual([`missing required file: ${file}`]);
  });

  it('forbids exactly these top-level directories', () => {
    expect(FORBIDDEN_PREFIXES).toEqual(['test/', 'coverage/', 'plans/', 'docs-site/']);
  });

  it.each([
    ['test/golden/compare-json.ts', 'forbidden path (test/): test/golden/compare-json.ts'],
    ['coverage/cobertura-coverage.xml', 'forbidden path (coverage/): coverage/cobertura-coverage.xml'],
    ['plans/roadmap.md', 'forbidden path (plans/): plans/roadmap.md'],
    ['docs-site/index.md', 'forbidden path (docs-site/): docs-site/index.md'],
    ['src/graph/ElkNode.test.ts', 'forbidden test file: src/graph/ElkNode.test.ts'],
    ['dist/graph/ElkNode.test.d.ts', 'forbidden test file: dist/graph/ElkNode.test.d.ts'],
  ])('names the forbidden entry %s', (file, problem) => {
    expect(checkPackContents([...GOOD, file])).toEqual([problem]);
  });

  it('reports every problem, missing files first, in list order', () => {
    const files = ['README.md', 'LICENSE', 'NOTICE.md', 'dist/index.js', 'test/a.test.ts', 'plans/x.md'];
    expect(checkPackContents(files)).toEqual([
      'missing required file: package.json',
      'missing required file: dist/index.d.ts',
      'forbidden path (test/): test/a.test.ts',
      'forbidden test file: test/a.test.ts',
      'forbidden path (plans/): plans/x.md',
    ]);
  });
});

describe('parsePackJson', () => {
  const PACK = [
    {
      id: '@knowvah/elk-engine@0.0.0-development',
      name: '@knowvah/elk-engine',
      version: '0.0.0-development',
      filename: 'knowvah-elk-engine-0.0.0-development.tgz',
      files: [
        { path: 'LICENSE', size: 14198, mode: 420 },
        { path: 'dist/index.js', size: 29, mode: 420 },
      ],
    },
  ];

  it('reads the tarball name and the file paths', () => {
    expect(parsePackJson(JSON.stringify(PACK))).toEqual({
      filename: 'knowvah-elk-engine-0.0.0-development.tgz',
      files: ['LICENSE', 'dist/index.js'],
    });
  });

  it('skips lifecycle-script output printed before the JSON', () => {
    const stdout = `\n> @knowvah/elk-engine@0.0.0-development prepack\n> echo hi\n\nhi\n${JSON.stringify(PACK, null, 2)}\n`;
    expect(parsePackJson(stdout).files).toEqual(['LICENSE', 'dist/index.js']);
  });

  it.each([
    ['', 'npm pack --json printed no JSON array'],
    ['npm notice only', 'npm pack --json printed no JSON array'],
    ['[]', 'npm pack --json reported 0 packages, expected 1'],
    [JSON.stringify([{ filename: 'a.tgz' }]), 'npm pack --json entry has no filename or files'],
    [JSON.stringify([{ filename: 'a.tgz', files: [{ size: 1 }] }]), 'npm pack --json entry has a file without a path'],
  ])('rejects %j', (stdout, message) => {
    expect(() => parsePackJson(stdout)).toThrow(message);
  });
});
