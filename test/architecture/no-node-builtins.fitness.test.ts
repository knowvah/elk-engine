// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (AD-8): `src/` is browser-safe. Non-test sources under
 * `src/` may not import/require `node:*` or any bare Node built-in
 * (`builtinModules`), and may not reference `process.<member>`. Only `tools/`
 * and `test/` may touch Node APIs.
 *
 * Detection is textual (regex per line). Whole-line comments (`//`, `/*`, `*`)
 * are ignored; trailing comments and string contents are NOT stripped.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const NODE_PREFIX = 'node:';
const BUILTINS: ReadonlySet<string> = new Set(builtinModules);
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;
const PROCESS_REF = /(?<![\w$.])process\.[A-Za-z_$]/;
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;

/** True when the module specifier names a Node built-in. */
function isNodeBuiltin(specifier: string): boolean {
  return specifier.startsWith(NODE_PREFIX) || BUILTINS.has(specifier);
}

/** Offenders as `path:line: reason` for one source file. */
function findNodeUsage(relPath: string, source: string): string[] {
  const out: string[] = [];
  source.split('\n').forEach((line, i) => {
    if (COMMENT_LINE.test(line)) return;
    const where = `${relPath}:${i + 1}`;
    for (const m of line.matchAll(SPECIFIER)) {
      if (isNodeBuiltin(m[1] ?? '')) out.push(`${where}: imports Node built-in '${m[1]}'`);
    }
    if (PROCESS_REF.test(line)) out.push(`${where}: references process`);
  });
  return out;
}

/** Recursively collect non-test .ts files under dir. */
function collectSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) return collectSrc(full);
    return ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('fitness: src/ is browser-safe (no Node built-ins)', () => {
  it('self-check: flags node: and bare built-in imports, require, export-from', () => {
    expect(findNodeUsage('src/a.ts', "import { x } from 'node:fs';\n")).toEqual([
      "src/a.ts:1: imports Node built-in 'node:fs'",
    ]);
    expect(findNodeUsage('src/a.ts', "\nimport path from 'path';")).toEqual([
      "src/a.ts:2: imports Node built-in 'path'",
    ]);
    expect(findNodeUsage('src/a.ts', "const f = require('fs/promises');")).toEqual([
      "src/a.ts:1: imports Node built-in 'fs/promises'",
    ]);
    expect(findNodeUsage('src/a.ts', "export * from 'os';")).toEqual(["src/a.ts:1: imports Node built-in 'os'"]);
  });

  it('self-check: flags process.env; ignores relative imports and comments', () => {
    expect(findNodeUsage('src/b.ts', 'const v = process.env.X;')).toEqual(['src/b.ts:1: references process']);
    const clean = "import { a } from './fs.js';\n// uses process.env\nconst myprocess = obj.process.x;\n";
    expect(findNodeUsage('src/c.ts', clean)).toEqual([]);
  });

  it('src/ contains no Node built-in imports or process references', () => {
    const offenders = collectSrc(SRC).flatMap((f) =>
      findNodeUsage(relative(ROOT, f).split('\\').join('/'), readFileSync(f, 'utf8')),
    );
    expect(offenders, `Node-only API in browser-safe src/:\n${offenders.join('\n')}`).toEqual([]);
  });
});
