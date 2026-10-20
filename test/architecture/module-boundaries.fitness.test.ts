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
const GUAVA_DIR = `${TS_ROOT}/guava`;
const EMF_DIR = `${TS_ROOT}/emf`;
const EQUINOX_DIR = `${TS_ROOT}/equinox`;
const GSON_DIR = `${TS_ROOT}/gson`;
const XTEXT_DIR = `${TS_ROOT}/xtext`;
const INDEX_FILE = `${TS_ROOT}/index.ts`;
const TEST_SUFFIX = '.test.ts';
const TS_SUFFIX = '.ts';
const JS_SUFFIX = '.js';

/**
 * Require-Bundle of org.eclipse.elk.graph.text (MANIFEST.MF:9-16) mapped to directories:
 * - org.eclipse.elk.core -> src/core (incl. src/core/util/internal, resolved by longest prefix)
 * - org.eclipse.elk.graph -> src/graph
 * - org.eclipse.xtext, org.eclipse.xtext.util -> src/xtext
 * - org.eclipse.xtext.xbase.lib, org.eclipse.xtend.lib -> no directory (Xtend library calls become
 *   plain TypeScript at the call site, docs/translation-rules.md section 8)
 * - org.eclipse.equinox.common -> src/equinox (only OperationCanceledException, thrown by Xtext's
 *   OperationCanceledManager; text-follow-ups D7)
 * - org.antlr.runtime -> no directory (G6: lexer/parser are hand-written)
 * Only the graph.text and graph.json.text bundles require Xtext; src/index.ts stays exempt.
 */
const XTEXT_CLIENT_BUNDLES: readonly string[] = ['src/graph/text', 'src/graph/json/text'];

const committed: BundleDeps = JSON.parse(readFileSync(join(REPO_ROOT, COMMITTED_JSON_RELATIVE), 'utf8')) as BundleDeps;

const IMPORT_PATTERNS: readonly RegExp[] = [
  /\b(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/** Relative import specifiers found in TypeScript source text. */
export function extractRelativeSpecifiers(source: string): string[] {
  const found = IMPORT_PATTERNS.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1] ?? ''));
  return found.filter((spec) => spec.startsWith('.'));
}

/** Resolves a relative specifier from a repo-relative file to a repo-relative `.ts` path. */
export function resolveTarget(fromFile: string, specifier: string): string {
  const joined = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  return joined.endsWith(JS_SUFFIX) ? joined.slice(0, -JS_SUFFIX.length) + TS_SUFFIX : joined;
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

function violationFor(file: string, target: string, deps: BundleDeps): string | undefined {
  const edge = `${file} -> ${target}`;
  if (isUnder(file, JAVA_DIR)) {
    return isUnder(target, JAVA_DIR) ? undefined : `${edge}: src/java may import only src/java`;
  }
  if (isUnder(file, GUAVA_DIR)) {
    return isUnder(target, GUAVA_DIR) || isUnder(target, JAVA_DIR)
      ? undefined
      : `${edge}: src/guava may import only src/guava and src/java`;
  }
  if (isUnder(file, GSON_DIR)) {
    return isUnder(target, GSON_DIR) || isUnder(target, JAVA_DIR)
      ? undefined
      : `${edge}: src/gson may import only src/gson and src/java`;
  }
  if (isUnder(file, EMF_DIR)) {
    return isUnder(target, EMF_DIR) || isUnder(target, JAVA_DIR) || isUnder(target, GUAVA_DIR)
      ? undefined
      : `${edge}: src/emf may import only src/emf, src/java and src/guava`;
  }
  if (isUnder(file, EQUINOX_DIR)) {
    return isUnder(target, EQUINOX_DIR) || isUnder(target, JAVA_DIR)
      ? undefined
      : `${edge}: src/equinox may import only src/equinox and src/java`;
  }
  if (isUnder(file, XTEXT_DIR)) {
    return isUnder(target, XTEXT_DIR) ||
      isUnder(target, JAVA_DIR) ||
      isUnder(target, EMF_DIR) ||
      isUnder(target, GUAVA_DIR) ||
      isUnder(target, EQUINOX_DIR)
      ? undefined
      : `${edge}: src/xtext may import only src/xtext, src/java, src/emf, src/guava and src/equinox`;
  }
  if (
    isUnder(target, JAVA_DIR) ||
    isUnder(target, GUAVA_DIR) ||
    isUnder(target, EMF_DIR) ||
    isUnder(target, GSON_DIR)
  ) {
    return undefined;
  }
  const from = bundleOf(file, deps);
  if (isUnder(target, XTEXT_DIR)) {
    return from !== undefined && XTEXT_CLIENT_BUNDLES.includes(from)
      ? undefined
      : `${edge}: ${from ?? file} may not import src/xtext`;
  }
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
export function checkFile(file: string, source: string, deps: BundleDeps): string[] {
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
    .map((e) => relative(REPO_ROOT, resolve(e.parentPath, e.name)).split(sep).join('/'));
}

function unmappedFile(file: string, deps: BundleDeps): string | undefined {
  const exempt =
    file === INDEX_FILE ||
    isUnder(file, JAVA_DIR) ||
    isUnder(file, GUAVA_DIR) ||
    isUnder(file, EMF_DIR) ||
    isUnder(file, EQUINOX_DIR) ||
    isUnder(file, GSON_DIR) ||
    isUnder(file, XTEXT_DIR) ||
    bundleOf(file, deps) !== undefined;
  return exempt ? undefined : `${file}: unmapped directory`;
}

describe('committed bundle-deps.json', () => {
  it('graph requires nothing', () => {
    expect(committed.bundles['src/graph']?.requires).toEqual([]);
  });

  it('layered requires common, core, graph', () => {
    expect(committed.bundles['src/alg/layered']?.requires).toEqual(['src/alg/common', 'src/core', 'src/graph']);
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
          'Require-Bundle: com.google.gson,\n org.eclipse.elk.core,\n org.eclipse.elk.core.service\n',
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
    expect(() => buildBundleDeps({ 'com.example.x': '' }, 'abc')).toThrow('Not an ELK bundle: com.example.x');
  });

  it('serializes with 2-space indent and trailing newline', () => {
    expect(serializeBundleDeps({ elkCommit: 'a', bundles: {} })).toBe('{\n  "elkCommit": "a",\n  "bundles": {}\n}\n');
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
    const v = checkFile('src/alg/force/X.ts', "import { Y } from '../layered/Y.js';", committed);
    expect(v).toEqual(['src/alg/force/X.ts -> src/alg/layered/Y.ts: src/alg/force may not import src/alg/layered']);
  });

  it('resolves graph.json -> graph by longest prefix and allows it', () => {
    expect(bundleOf('src/graph/json/A.ts', committed)).toBe('src/graph/json');
    expect(bundleOf('src/graph/B.ts', committed)).toBe('src/graph');
    expect(checkFile('src/graph/json/A.ts', "import { B } from '../B.js';", committed)).toEqual([]);
  });

  it('forbids graph -> graph.json (not required)', () => {
    expect(checkFile('src/graph/A.ts', "import { J } from './json/J.js';", committed)).toHaveLength(1);
  });

  it('allows importing src/java everywhere, and java -> java only', () => {
    const imp = "import { R } from '../../java/util/Random.js';";
    expect(checkFile('src/alg/layered/A.ts', imp, committed)).toEqual([]);
    expect(checkFile('src/java/util/A.ts', "import { B } from './B.js';", committed)).toEqual([]);
    expect(checkFile('src/java/util/A.ts', "import { G } from '../../graph/G.js';", committed)).toEqual([
      'src/java/util/A.ts -> src/graph/G.ts: src/java may import only src/java',
    ]);
  });

  it('flags unmapped source and target directories', () => {
    expect(checkFile('src/mystery/A.ts', "import { B } from './B.js';", committed)).toEqual([
      'src/mystery/A.ts -> src/mystery/B.ts: unmapped directory for src/mystery/A.ts',
    ]);
    expect(checkFile('src/core/A.ts', "import { B } from '../mystery/B.js';", committed)).toEqual([
      'src/core/A.ts -> src/mystery/B.ts: unmapped directory for src/mystery/B.ts',
    ]);
  });

  it('exempts src/index.ts as a source', () => {
    expect(checkFile('src/index.ts', "export * from './mystery/B.js';", committed)).toEqual([]);
  });

  it('flags files in directories that belong to no bundle', () => {
    expect(unmappedFile('src/mystery/A.ts', committed)).toBe('src/mystery/A.ts: unmapped directory');
    expect(unmappedFile('src/index.ts', committed)).toBeUndefined();
    expect(unmappedFile('src/java/util/R.ts', committed)).toBeUndefined();
    expect(unmappedFile('src/core/A.ts', committed)).toBeUndefined();
  });
});

describe('src tree respects bundle boundaries', () => {
  const files = listSourceFiles(join(REPO_ROOT, TS_ROOT));

  it('has no import-direction violations', () => {
    const violations = files.flatMap((file) => checkFile(file, readFileSync(join(REPO_ROOT, file), 'utf8'), committed));
    expect(violations).toEqual([]);
  });

  it('has no unmapped directories', () => {
    const unmapped = files.map((file) => unmappedFile(file, committed)).filter((v): v is string => v !== undefined);
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

describe('grammar bundles (conformance-corpus D0)', () => {
  const CORE_AND_GRAPH = ['src/core', 'src/graph'];

  it('maps graph.text to src/graph/text requiring core and graph', () => {
    expect(committed.bundles['src/graph/text']).toEqual({
      bundle: 'org.eclipse.elk.graph.text',
      requires: CORE_AND_GRAPH,
    });
  });

  it('maps graph.json.text to src/graph/json/text requiring core and graph', () => {
    expect(committed.bundles['src/graph/json/text']).toEqual({
      bundle: 'org.eclipse.elk.graph.json.text',
      requires: CORE_AND_GRAPH,
    });
  });

  it('maps core.debug.grandom to src/core/debug/grandom requiring core and graph', () => {
    expect(committed.bundles['src/core/debug/grandom']).toEqual({
      bundle: 'org.eclipse.elk.core.debug.grandom',
      requires: CORE_AND_GRAPH,
    });
  });

  it('resolves src/graph/json/text to graph.json.text, not graph.json', () => {
    const dir = bundleOf('src/graph/json/text/X.ts', committed);
    expect(dir).toBe('src/graph/json/text');
    expect(committed.bundles[dir ?? '']?.bundle).toBe('org.eclipse.elk.graph.json.text');
  });

  it('resolves reference-only src/core/debug to core, not grandom (known hole)', () => {
    expect(bundleOf('src/core/debug/X.ts', committed)).toBe('src/core');
  });
});

describe('src/guava boundary (java-foundations M6)', () => {
  it('lets src/guava import src/java', () => {
    expect(checkFile('src/guava/Lists.ts', "import { Int32 } from '../java/lang/Int32.js';", committed)).toEqual([]);
  });

  it('forbids src/guava importing a bundle, naming both files', () => {
    expect(checkFile('src/guava/Lists.ts', "import { G } from '../graph/G.js';", committed)).toEqual([
      'src/guava/Lists.ts -> src/graph/G.ts: src/guava may import only src/guava and src/java',
    ]);
  });

  it('lets src/guava import src/guava', () => {
    expect(checkFile('src/guava/Lists.ts', "import { Iterables } from './Iterables.js';", committed)).toEqual([]);
  });

  it('lets bundles and src/index.ts import src/guava', () => {
    expect(checkFile('src/alg/layered/X.ts', "import { Lists } from '../../guava/Lists.js';", committed)).toEqual([]);
    expect(checkFile('src/index.ts', "export * from './guava/Lists.js';", committed)).toEqual([]);
  });

  it('forbids src/java importing src/guava', () => {
    expect(checkFile('src/java/util/A.ts', "import { Lists } from '../../guava/Lists.js';", committed)).toEqual([
      'src/java/util/A.ts -> src/guava/Lists.ts: src/java may import only src/java',
    ]);
  });

  it('does not treat src/guava as an unmapped directory', () => {
    expect(unmappedFile('src/guava/Lists.ts', committed)).toBeUndefined();
  });
});

describe('src/emf boundary (elkgraph-model D1)', () => {
  it('lets src/emf import src/emf, src/java and src/guava', () => {
    const source = [
      "import { BasicEList } from '../common/util/BasicEList.js';",
      "import { Int32 } from '../../java/lang/Int32.js';",
      "import { Lists } from '../../guava/Lists.js';",
    ].join('\n');
    expect(checkFile('src/emf/ecore/EObject.ts', source, committed)).toEqual([]);
  });

  it('forbids src/emf importing a bundle, naming both files', () => {
    expect(checkFile('src/emf/ecore/EObject.ts', "import { C } from '../../core/C.js';", committed)).toEqual([
      'src/emf/ecore/EObject.ts -> src/core/C.ts: src/emf may import only src/emf, src/java and src/guava',
    ]);
  });

  it('lets bundles and src/index.ts import src/emf', () => {
    const imp = "import { EList } from '../emf/common/util/EList.js';";
    expect(checkFile('src/graph/ElkNode.ts', imp, committed)).toEqual([]);
    expect(checkFile('src/index.ts', "export * from './emf/ecore/EObject.js';", committed)).toEqual([]);
  });

  it('forbids src/java and src/guava importing src/emf', () => {
    const imp = "import { EList } from '../../emf/common/util/EList.js';";
    expect(checkFile('src/java/util/A.ts', imp, committed)).toEqual([
      'src/java/util/A.ts -> src/emf/common/util/EList.ts: src/java may import only src/java',
    ]);
    expect(checkFile('src/guava/Lists.ts', "import { EList } from '../emf/common/util/EList.js';", committed)).toEqual([
      'src/guava/Lists.ts -> src/emf/common/util/EList.ts: src/guava may import only src/guava and src/java',
    ]);
  });

  it('does not treat src/emf as an unmapped directory', () => {
    expect(unmappedFile('src/emf/ecore/EObject.ts', committed)).toBeUndefined();
  });
});

describe('src/gson boundary (elk-json-adapter J1)', () => {
  it('lets src/gson import src/gson and src/java', () => {
    const source = [
      "import { JsonElement } from './JsonElement.js';",
      "import { Int32 } from '../java/lang/Int32.js';",
    ].join('\n');
    expect(checkFile('src/gson/JsonObject.ts', source, committed)).toEqual([]);
  });

  it('forbids src/gson importing a bundle, naming both files', () => {
    expect(checkFile('src/gson/JsonObject.ts', "import { G } from '../graph/G.js';", committed)).toEqual([
      'src/gson/JsonObject.ts -> src/graph/G.ts: src/gson may import only src/gson and src/java',
    ]);
  });

  it('forbids src/gson importing src/guava or src/emf', () => {
    expect(checkFile('src/gson/JsonObject.ts', "import { Lists } from '../guava/Lists.js';", committed)).toEqual([
      'src/gson/JsonObject.ts -> src/guava/Lists.ts: src/gson may import only src/gson and src/java',
    ]);
    expect(checkFile('src/gson/JsonObject.ts', "import { E } from '../emf/E.js';", committed)).toEqual([
      'src/gson/JsonObject.ts -> src/emf/E.ts: src/gson may import only src/gson and src/java',
    ]);
  });

  it('lets graph.json, other bundles and src/index.ts import src/gson', () => {
    const imp = "import { JsonObject } from '../../gson/JsonObject.js';";
    expect(checkFile('src/graph/json/JsonAdapter.ts', imp, committed)).toEqual([]);
    expect(checkFile('src/index.ts', "export * from './gson/JsonObject.js';", committed)).toEqual([]);
  });

  it('forbids src/java, src/guava and src/emf importing src/gson', () => {
    expect(checkFile('src/java/util/A.ts', "import { J } from '../../gson/J.js';", committed)).toEqual([
      'src/java/util/A.ts -> src/gson/J.ts: src/java may import only src/java',
    ]);
    expect(checkFile('src/guava/Lists.ts', "import { J } from '../gson/J.js';", committed)).toEqual([
      'src/guava/Lists.ts -> src/gson/J.ts: src/guava may import only src/guava and src/java',
    ]);
    expect(checkFile('src/emf/ecore/E.ts', "import { J } from '../../gson/J.js';", committed)).toEqual([
      'src/emf/ecore/E.ts -> src/gson/J.ts: src/emf may import only src/emf, src/java and src/guava',
    ]);
  });

  it('does not treat src/gson as an unmapped directory', () => {
    expect(unmappedFile('src/gson/JsonObject.ts', committed)).toBeUndefined();
  });
});

describe('src/equinox boundary (text-follow-ups D7)', () => {
  it('lets src/equinox import src/equinox and src/java', () => {
    const source = [
      "import { RuntimeException } from '../../../java/lang/RuntimeException.js';",
      "import { Other } from './Other.js';",
    ].join('\n');
    expect(checkFile('src/equinox/core/runtime/OperationCanceledException.ts', source, committed)).toEqual([]);
  });

  it('forbids src/equinox importing src/xtext, naming both files', () => {
    expect(
      checkFile(
        'src/equinox/core/runtime/OperationCanceledException.ts',
        "import { X } from '../../../xtext/util/Strings.js';",
        committed,
      ),
    ).toEqual([
      'src/equinox/core/runtime/OperationCanceledException.ts -> src/xtext/util/Strings.ts: ' +
        'src/equinox may import only src/equinox and src/java',
    ]);
  });

  it('lets src/xtext and src/index.ts import src/equinox', () => {
    const imp = "import { E } from '../../equinox/core/runtime/OperationCanceledException.js';";
    expect(checkFile('src/xtext/service/OperationCanceledManager.ts', imp, committed)).toEqual([]);
    expect(
      checkFile('src/index.ts', "export * from './equinox/core/runtime/OperationCanceledException.js';", committed),
    ).toEqual([]);
  });

  it('forbids bundles, src/java and src/guava importing src/equinox', () => {
    const imp = "import { E } from '../equinox/core/runtime/OperationCanceledException.js';";
    expect(checkFile('src/core/X.ts', imp, committed)).toEqual([
      'src/core/X.ts -> src/equinox/core/runtime/OperationCanceledException.ts: ' +
        'unmapped directory for src/equinox/core/runtime/OperationCanceledException.ts',
    ]);
    expect(checkFile('src/java/util/A.ts', "import { E } from '../../equinox/core/runtime/E.js';", committed)).toEqual([
      'src/java/util/A.ts -> src/equinox/core/runtime/E.ts: src/java may import only src/java',
    ]);
  });

  it('does not treat src/equinox as an unmapped directory', () => {
    expect(unmappedFile('src/equinox/core/runtime/OperationCanceledException.ts', committed)).toBeUndefined();
  });
});

describe('src/xtext boundary (graph-text T6)', () => {
  it('lets src/xtext import src/xtext, src/java, src/emf and src/guava', () => {
    const source = [
      "import { Strings } from './util/Strings.js';",
      "import { JavaString } from '../../java/lang/JavaString.js';",
      "import { EObject } from '../emf/ecore/EObject.js';",
      "import { Lists } from '../guava/Lists.js';",
    ].join('\n');
    expect(checkFile('src/xtext/util/Strings.ts', source, committed)).toEqual([]);
  });

  it('forbids src/xtext importing src/graph or src/core', () => {
    const suffix = 'src/xtext may import only src/xtext, src/java, src/emf, src/guava and src/equinox';
    expect(checkFile('src/xtext/X.ts', "import { N } from '../graph/ElkNode.js';", committed)).toEqual([
      `src/xtext/X.ts -> src/graph/ElkNode.ts: ${suffix}`,
    ]);
    expect(checkFile('src/xtext/X.ts', "import { C } from '../core/CoreOptions.js';", committed)).toEqual([
      `src/xtext/X.ts -> src/core/CoreOptions.ts: ${suffix}`,
    ]);
  });

  it('lets graph.text import src/xtext', () => {
    const imp = "import { IScope } from '../../xtext/scoping/IScope.js';";
    expect(checkFile('src/graph/text/ElkGraphText.ts', imp, committed)).toEqual([]);
  });

  it('lets graph.json.text import src/xtext but not graph.text', () => {
    const xtext = "import { Token } from '../../../../xtext/parser/Token.js';";
    expect(checkFile('src/graph/json/text/parser/ElkGraphJsonLexer.ts', xtext, committed)).toEqual([]);
    const sibling = "import { tokenize } from '../../../text/parser/ElkGraphLexer.js';";
    expect(checkFile('src/graph/json/text/parser/ElkGraphJsonLexer.ts', sibling, committed)).toEqual([
      'src/graph/json/text/parser/ElkGraphJsonLexer.ts -> src/graph/text/parser/ElkGraphLexer.ts: ' +
        'src/graph/json/text may not import src/graph/text',
    ]);
  });

  it('forbids other bundles importing src/xtext', () => {
    const cases: readonly [string, string, string][] = [
      ['src/graph/json/JsonAdapter.ts', "import { X } from '../../xtext/X.js';", 'src/graph/json'],
      ['src/alg/layered/X.ts', "import { X } from '../../xtext/X.js';", 'src/alg/layered'],
      ['src/core/X.ts', "import { X } from '../xtext/X.js';", 'src/core'],
    ];
    for (const [file, source, bundle] of cases) {
      const violations = checkFile(file, source, committed);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(new RegExp(`: ${bundle} may not import src/xtext$`));
    }
  });

  it('forbids src/java, src/emf, src/guava and src/gson importing src/xtext', () => {
    expect(checkFile('src/java/util/A.ts', "import { X } from '../../xtext/X.js';", committed)).toEqual([
      'src/java/util/A.ts -> src/xtext/X.ts: src/java may import only src/java',
    ]);
    expect(checkFile('src/emf/ecore/E.ts', "import { X } from '../../xtext/X.js';", committed)).toEqual([
      'src/emf/ecore/E.ts -> src/xtext/X.ts: src/emf may import only src/emf, src/java and src/guava',
    ]);
    expect(checkFile('src/guava/Lists.ts', "import { X } from '../xtext/X.js';", committed)).toEqual([
      'src/guava/Lists.ts -> src/xtext/X.ts: src/guava may import only src/guava and src/java',
    ]);
    expect(checkFile('src/gson/J.ts', "import { X } from '../xtext/X.js';", committed)).toEqual([
      'src/gson/J.ts -> src/xtext/X.ts: src/gson may import only src/gson and src/java',
    ]);
  });

  it('lets src/index.ts export src/xtext and does not treat it as unmapped', () => {
    expect(checkFile('src/index.ts', "export * from './xtext/X.js';", committed)).toEqual([]);
    expect(unmappedFile('src/xtext/util/Strings.ts', committed)).toBeUndefined();
  });
});

describe('graph.text Require-Bundle mapping', () => {
  it('requires exactly src/core and src/graph (Xtext is not a manifest-derived bundle)', () => {
    expect(committed.bundles['src/graph/text']?.requires).toEqual(['src/core', 'src/graph']);
  });

  it('maps src/core/util/internal to src/core', () => {
    expect(bundleOf('src/core/util/internal/LayoutOptionProxy.ts', committed)).toBe('src/core');
  });
});
