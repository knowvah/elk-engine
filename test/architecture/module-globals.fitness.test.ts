// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (AD-8): no module-level mutable state in `src/`.
 *
 * Callers may run many layouts per page (and in one process). ELK layout
 * state must therefore live on per-run objects — e.g. `Random` instances,
 * the graph, the progress monitor — never in module scope, where one run's
 * state would leak into the next.
 *
 * This test pins the set of top-level `let` / `export let` declarations in
 * non-test `src/**\/*.ts` to a reviewed ALLOWLIST (keyed
 * `src/path.ts::name` -> why it cannot leak across runs). A new global fails
 * until the author moves the state onto a per-run object or adds a reviewed
 * entry. Stale entries (no longer in the source) also fail.
 *
 * Immutable `const` tables are not state and are out of scope.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const KEY_SEPARATOR = '::';
const TOP_LEVEL_LET = /^(?:export\s+)?let\s+([A-Za-z_$][\w$]*)/;

interface Global {
  readonly key: string;
  readonly line: number;
}

/** Reviewed module globals: `'src/path.ts::name'` -> why it is safe. */
const ALLOWLIST: Record<string, string> = {};

/** Top-level `let` declarations in one source file. */
function findGlobals(relPath: string, source: string): Global[] {
  const out: Global[] = [];
  source.split('\n').forEach((line, i) => {
    const m = TOP_LEVEL_LET.exec(line);
    if (m) out.push({ key: `${relPath}${KEY_SEPARATOR}${m[1]}`, line: i + 1 });
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

function findAllGlobals(): Global[] {
  return collectSrc(SRC).flatMap((f) =>
    findGlobals(relative(ROOT, f).split('\\').join('/'), readFileSync(f, 'utf8')),
  );
}

describe('fitness: module-level globals (per-run state only)', () => {
  it('self-check: detects let and export let at top level only', () => {
    const sample = 'let counter = 0;\nfunction f() {\n  let local = 1;\n}\nexport let shared: number;\nconst k = 1;\n';
    expect(findGlobals('src/s.ts', sample)).toEqual([
      { key: 'src/s.ts::counter', line: 1 },
      { key: 'src/s.ts::shared', line: 5 },
    ]);
  });

  it('introduces no module global outside the reviewed allowlist', () => {
    const unlisted = findAllGlobals()
      .filter((g) => !(g.key in ALLOWLIST))
      .map((g) => `${g.key} (line ${g.line})`);
    expect(
      unlisted,
      'New module-level `let` found. Layout state must live on per-run objects ' +
        '(e.g. Random instances), not module scope. Move it, or add a reviewed ' +
        `ALLOWLIST entry.\nUnlisted:\n${unlisted.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps the allowlist honest (no stale entries)', () => {
    const found = new Set(findAllGlobals().map((g) => g.key));
    const stale = Object.keys(ALLOWLIST).filter((k) => !found.has(k));
    expect(stale, `Stale ALLOWLIST entries — delete them:\n${stale.join('\n')}`).toEqual([]);
  });
});
