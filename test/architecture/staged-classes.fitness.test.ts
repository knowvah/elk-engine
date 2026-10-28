// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (decision L1, mission 7a): a staged class is a file at its Java path that ports only the members
 * earlier code references and throws for the rest until the named mission completes it. Each such file carries the
 * header marker `// @staged <mission>` within its first lines, and `staged-classes.json` lists every one as
 * `{ path, mission }`, sorted by path. The two must agree in both directions; the list is empty after mission 7h.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface StagedClass {
  readonly path: string;
  readonly mission: string;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const MARKER = /^\/\/ @staged (7[b-h])$/;
const HEADER_WINDOW = 3;
const STAGED: readonly StagedClass[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'staged-classes.json'), 'utf8'),
) as StagedClass[];

/** The mission named by the file's header marker, or `null` without one. */
function markerMission(source: string): string | null {
  for (const line of source.split('\n').slice(0, HEADER_WINDOW)) {
    const match = MARKER.exec(line);
    if (match !== null) {
      return match[1]!;
    }
  }
  return null;
}

/** Every `src/` code file (tests excluded) whose header carries the marker, as registry entries. */
function markedFiles(dir: string): StagedClass[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return markedFiles(full);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    const mission = markerMission(readFileSync(full, 'utf8'));
    return mission === null ? [] : [{ path: relative(ROOT, full).split('\\').join('/'), mission }];
  });
}

describe('staged classes (L1)', () => {
  it('lists the registry sorted by path', () => {
    const paths = STAGED.map((entry) => entry.path);
    expect(paths).toEqual([...paths].sort());
  });

  it('lists every marked file with the mission its marker names', () => {
    const marked = markedFiles(SRC).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    expect(marked).toEqual([...STAGED]);
  });

  it.each(STAGED.map((entry) => [entry.path, entry.mission] as const))(
    '%s exists and carries the marker for mission %s',
    (path, mission) => {
      const file = join(ROOT, path);
      expect(existsSync(file)).toBe(true);
      expect(markerMission(readFileSync(file, 'utf8'))).toBe(mission);
    },
  );
});
