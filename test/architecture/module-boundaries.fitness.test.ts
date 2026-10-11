// SPDX-License-Identifier: EPL-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMMITTED_JSON_RELATIVE,
  REPO_ROOT,
  TS_ROOT,
  buildBundleDeps,
  generateBundleDeps,
  parseManifestHeaders,
  parseRequireBundle,
  readElkCommit,
  resolveElkDir,
  serializeBundleDeps,
  type BundleDeps,
} from '../../tools/bundle-deps.js';

const JAVA_DIR = `${TS_ROOT}/java`;
const INDEX_FILE = `${TS_ROOT}/index.ts`;
const TEST_SUFFIX = '.test.ts';
const TS_SUFFIX = '.ts';
const JS_SUFFIX = '.js';

const committed: BundleDeps = JSON.parse(
  readFileSync(join(REPO_ROOT, COMMITTED_JSON_RELATIVE), 'utf8'),
) as BundleDeps;

const IMPORT_PATTERNS: readonly RegExp[] = [
  /\b(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/** Relative import specifiers found in TypeScript source text. */
export function extractRelativeSpecifiers(source: string): string[] {
  const found = IMPORT_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((m) => m[1] ?? ''),
  );
  return found.filter((spec) => spec.startsWith('.'));
}

/** Resolves a relative specifier from a repo-relative file to a repo-relative `.ts` path. */
export function resolveTarget(fromFile: string, specifier: string): string {
  const joined = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  return joined.endsWith(JS_SUFFIX)
    ? joined.slice(0, -JS_SUFFIX.length) + TS_SUFFIX
    : joined;
}

function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}

/** Longest-tsDir-prefix bundle lookup; undefined when no bundle owns the path. */
export function bundleOf(path: string, deps: BundleDeps): string | undefined {
  return Object.keys(deps.bundles)
    .filter((dir) => isUnder(path, dir))
    .sort((a, b) => b.length - a.length)[0];
}

function violationFor(
  file: string,
  target: string,
  deps: BundleDeps,
): string | undefined {
  const edge = `${file} -> ${target}`;
  if (isUnder(file, JAVA_DIR)) {
    return isUnder(target, JAVA_DIR)
      ? undefined
      : `${edge}: src/java may import only src/java`;
  }
  if (isUnder(target, JAVA_DIR)) {
    return undefined;
  }
  const from = bundleOf(file, deps);
  const to = bundleOf(target, deps);
  if (from === undefined) {
    return `${edge}: unmapped directory for ${file}`;
  }
  if (to === undefined) {
    return `${edge}: unmapped directory for ${target}`;
  }
  const allowed = from === to || deps.bundles[from]?.requires.includes(to);
  return allowed ? undefined : `${edge}: ${from} may not import ${to}`;
}

/** Boundary violations for one file's source text (repo-relative `file`). */
export function checkFile(
  file: string,
  source: string,
  deps: BundleDeps,
): string[] {
  if (file === INDEX_FILE) {
    return [];
  }
  return extractRelativeSpecifiers(source)
    .map((spec) => violationFor(file, resolveTarget(file, spec), deps))
    .filter((v): v is string => v !== undefined);
}

function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(TS_SUFFIX))
    .filter((e) => !e.name.endsWith(TEST_SUFFIX))
    .map((e) =>
      relative(REPO_ROOT, resolve(e.parentPath, e.name)).split(sep).join('/'),
    );
}

function unmappedFile(file: string, deps: BundleDeps): string | undefined {
  const exempt =
    file === INDEX_FILE ||
    isUnder(file, JAVA_DIR) ||
    bundleOf(file, deps) !== undefined;
  return exempt ? undefined : `${file}: unmapped directory`;
}

describe('committed bundle-deps.json', () => {
  it('graph requires nothing', () => {
    expect(committed.bundles['src/graph']?.requires).toEqual([]);
  });

  it('layered requires common, core, graph', () => {
    expect(committed.bundles['src/alg/layered']?.requires).toEqual([
      'src/alg/common',
      'src/core',
      'src/graph',
    ]);
  });

  it('maps graph.json to src/graph/json requiring core and graph', () => {
    expect(committed.bundles['src/graph/json']).toEqual({
      bundle: 'org.eclipse.elk.graph.json',
      requires: ['src/core', 'src/graph'],
    });
  });

  it('has a 40-hex elkCommit and sorted keys and requires', () => {
    expect(committed.elkCommit).toMatch(/^[0-9a-f]{40}$/);
    const dirs = Object.keys(committed.bundles);
    expect(dirs).toEqual([...dirs].sort());
    for (const entry of Object.values(committed.bundles)) {
      expect(entry.requires).toEqual([...entry.requires].sort());
    }
  });
});

describe('manifest parsing', () => {
  it('joins continuation lines and strips attributes', () => {
    const text = [
      'Bundle-Name: x',
      'Require-Bundle: com.google.guava,',
      ' org.eclipse.emf.ecore;bundle-version="[2.10.0,3.0.0)";visibility:=reexport,',
      ' org.eclipse.elk.graph;resolution:=optional',
      'Export-Package: a',
    ].join('\r\n');
    const headers = parseManifestHeaders(text);
    expect(headers['Export-Package']).toBe('a');
    expect(parseRequireBundle(headers['Require-Bundle'])).toEqual([
      'com.google.guava',
      'org.eclipse.emf.ecore',
      'org.eclipse.elk.graph',
    ]);
  });

  it('returns no requirements for a missing header', () => {
    expect(parseRequireBundle(undefined)).toEqual([]);
    expect(parseRequireBundle('  ')).toEqual([]);
  });

  it('keeps only in-scope ELK bundles and maps them to tsDirs', () => {
    const deps = buildBundleDeps(
      {
        'org.eclipse.elk.graph.json':
          'Require-Bundle: com.google.gson,\n org.eclipse.elk.core,\n org.eclipse.elk.graph.text\n',
        'org.eclipse.elk.core': 'Bundle-Name: core\n',
      },
      'abc',
    );
    expect(deps).toEqual({
      elkCommit: 'abc',
      bundles: {
        'src/core': { bundle: 'org.eclipse.elk.core', requires: [] },
        'src/graph/json': {
          bundle: 'org.eclipse.elk.graph.json',
          requires: ['src/core'],
        },
      },
    });
  });

  it('rejects non-ELK bundle names', () => {
    expect(() => buildBundleDeps({ 'com.example.x': '' }, 'abc')).toThrow(
      'Not an ELK bundle: com.example.x',
    );
  });

  it('serializes with 2-space indent and trailing newline', () => {
    expect(serializeBundleDeps({ elkCommit: 'a', bundles: {} })).toBe(
      '{\n  "elkCommit": "a",\n  "bundles": {}\n}\n',
    );
  });

  it('resolves the ELK dir from arg, env, then default', () => {
    expect(resolveElkDir('x', { ELK_SOURCE_DIR: '/e' }, '/r/a')).toBe('/r/a/x');
    expect(resolveElkDir(undefined, { ELK_SOURCE_DIR: '/e' }, '/r/a')).toBe('/e');
    expect(resolveElkDir(undefined, {}, '/r/a')).toBe('/r/elk');
  });
});

describe('boundary self-checks', () => {
  it('extracts import, export-from, side-effect and dynamic specifiers', () => {
    const src = [
      "import { A } from '../layered/Y.js';",
      "import type { B } from 'vitest';",
      "export * from './C.js';",
      "import './D.js';",
      "const e = import('./E.js');",
      'import {',
      '  F,',
      "} from '../F.js';",
    ].join('\n');
    expect(extractRelativeSpecifiers(src).sort()).toEqual(
      ['../F.js', '../layered/Y.js', './C.js', './D.js', './E.js'].sort(),
    );
  });

  it('reports force -> layered naming both files', () => {
    const v = checkFile(
      'src/alg/force/X.ts',
      "import { Y } from '../layered/Y.js';",
      committed,
    );
    expect(v).toEqual([
      'src/alg/force/X.ts -> src/alg/layered/Y.ts: src/alg/force may not import src/alg/layered',
    ]);
  });

  it('resolves graph.json -> graph by longest prefix and allows it', () => {
    expect(bundleOf('src/graph/json/A.ts', committed)).toBe('src/graph/json');
    expect(bundleOf('src/graph/B.ts', committed)).toBe('src/graph');
    expect(
      checkFile('src/graph/json/A.ts', "import { B } from '../B.js';", committed),
    ).toEqual([]);
  });

  it('forbids graph -> graph.json (not required)', () => {
    expect(
      checkFile('src/graph/A.ts', "import { J } from './json/J.js';", committed),
    ).toHaveLength(1);
  });

  it('allows importing src/java everywhere, and java -> java only', () => {
    const imp = "import { R } from '../../java/util/Random.js';";
    expect(checkFile('src/alg/layered/A.ts', imp, committed)).toEqual([]);
    expect(
      checkFile('src/java/util/A.ts', "import { B } from './B.js';", committed),
    ).toEqual([]);
    expect(
      checkFile('src/java/util/A.ts', "import { G } from '../../graph/G.js';", committed),
    ).toEqual([
      'src/java/util/A.ts -> src/graph/G.ts: src/java may import only src/java',
    ]);
  });

  it('flags unmapped source and target directories', () => {
    expect(
      checkFile('src/mystery/A.ts', "import { B } from './B.js';", committed),
    ).toEqual([
      'src/mystery/A.ts -> src/mystery/B.ts: unmapped directory for src/mystery/A.ts',
    ]);
    expect(
      checkFile('src/core/A.ts', "import { B } from '../mystery/B.js';", committed),
    ).toEqual([
      'src/core/A.ts -> src/mystery/B.ts: unmapped directory for src/mystery/B.ts',
    ]);
  });

  it('exempts src/index.ts as a source', () => {
    expect(
      checkFile('src/index.ts', "export * from './mystery/B.js';", committed),
    ).toEqual([]);
  });

  it('flags files in directories that belong to no bundle', () => {
    expect(unmappedFile('src/mystery/A.ts', committed)).toBe(
      'src/mystery/A.ts: unmapped directory',
    );
    expect(unmappedFile('src/index.ts', committed)).toBeUndefined();
    expect(unmappedFile('src/java/util/R.ts', committed)).toBeUndefined();
    expect(unmappedFile('src/core/A.ts', committed)).toBeUndefined();
  });
});

describe('src tree respects bundle boundaries', () => {
  const files = listSourceFiles(join(REPO_ROOT, TS_ROOT));

  it('has no import-direction violations', () => {
    const violations = files.flatMap((file) =>
      checkFile(file, readFileSync(join(REPO_ROOT, file), 'utf8'), committed),
    );
    expect(violations).toEqual([]);
  });

  it('has no unmapped directories', () => {
    const unmapped = files
      .map((file) => unmappedFile(file, committed))
      .filter((v): v is string => v !== undefined);
    expect(unmapped).toEqual([]);
  });
});

function regenerationSkipReason(): string | undefined {
  const elkDir = resolveElkDir(undefined, process.env);
  if (!existsSync(elkDir)) {
    return `ELK source dir not found: ${elkDir}`;
  }
  const head = readElkCommit(elkDir);
  return head === committed.elkCommit
    ? undefined
    : `ELK HEAD ${head} differs from committed elkCommit ${committed.elkCommit}`;
}

describe('regeneration', () => {
  const reason = regenerationSkipReason();
  if (reason === undefined) {
    it('regenerated deps equal the committed file', () => {
      const elkDir = resolveElkDir(undefined, process.env);
      expect(generateBundleDeps(elkDir)).toEqual(committed);
      expect(serializeBundleDeps(generateBundleDeps(elkDir))).toBe(
        readFileSync(join(REPO_ROOT, COMMITTED_JSON_RELATIVE), 'utf8'),
      );
    });
  } else {
    it.skip(`regenerated deps equal the committed file (skipped: ${reason})`, () => {});
  }
});
