// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (AD-8): every code file under `src/`, `test/`, `tools/`
 * carries the SPDX license line within its first 3 lines (after a shebang,
 * if present). Scanned extensions: .ts, .mjs, .java, .sh. JSON files, build
 * output, and the generated Java reference corpus (`test/golden/refs/**`)
 * are skipped.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCAN_DIRS = ['src', 'test', 'tools'] as const;
const SCAN_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.mjs', '.java', '.sh']);
const SKIP_DIR_NAMES: ReadonlySet<string> = new Set(['node_modules', 'dist', 'coverage']);
const SKIP_PATH_PREFIXES = ['test/golden/refs/'] as const;
const SPDX_LINE = 'SPDX-License-Identifier: EPL-2.0';
const SHEBANG_PREFIX = '#!';
const HEADER_WINDOW = 3;

/** True when the path is a file kind this rule applies to. */
function isScanned(relPath: string): boolean {
  if (SKIP_PATH_PREFIXES.some((p) => relPath.startsWith(p))) return false;
  return SCAN_EXTENSIONS.has(extname(relPath));
}

/** Returns [relPath] when the source lacks the SPDX header, else []. */
function findSpdxOffenders(relPath: string, source: string): string[] {
  if (!isScanned(relPath)) return [];
  const lines = source.split('\n');
  const body = lines[0]?.startsWith(SHEBANG_PREFIX) ? lines.slice(1) : lines;
  const hasHeader = body.slice(0, HEADER_WINDOW).some((l) => l.includes(SPDX_LINE));
  return hasHeader ? [] : [relPath];
}

/** Recursively collect file paths (posix, relative to ROOT) under dir. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(ent.name)) out.push(...walk(full));
    } else {
      out.push(relative(ROOT, full).split('\\').join('/'));
    }
  }
  return out;
}

function scanTree(): string[] {
  return SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))).flatMap((rel) =>
    isScanned(rel) ? findSpdxOffenders(rel, readFileSync(join(ROOT, rel), 'utf8')) : [],
  );
}

describe('fitness: SPDX license header', () => {
  it('self-check: flags a file without the header', () => {
    expect(findSpdxOffenders('src/x.ts', 'export const a = 1;\n')).toEqual(['src/x.ts']);
  });

  it('self-check: header beyond line 3 is flagged', () => {
    const src = `// a\n// b\n// c\n// ${SPDX_LINE}\n`;
    expect(findSpdxOffenders('tools/y.ts', src)).toEqual(['tools/y.ts']);
  });

  it('self-check: shebang is skipped; header on its next line passes', () => {
    const src = `#!/usr/bin/env bash\n# ${SPDX_LINE}\necho hi\n`;
    expect(findSpdxOffenders('tools/z.sh', src)).toEqual([]);
    expect(findSpdxOffenders('tools/z.sh', '#!/bin/sh\necho hi\n')).toEqual(['tools/z.sh']);
  });

  it('self-check: json, refs, and non-code extensions are skipped', () => {
    expect(findSpdxOffenders('test/architecture/bundle-deps.json', '{}')).toEqual([]);
    expect(findSpdxOffenders('test/golden/refs/java/a.ts', 'x')).toEqual([]);
    expect(findSpdxOffenders('tools/oracle/ELK_COMMIT', 'abc')).toEqual([]);
  });

  it('every code file under src/, test/, tools/ has the SPDX header', () => {
    const offenders = scanTree();
    expect(offenders, `Missing "${SPDX_LINE}" in first ${HEADER_WINDOW} lines:\n${offenders.join('\n')}`).toEqual([]);
  });
});
