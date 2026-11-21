// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (issue #96, AD-2): under `tools/` the pinned ELK commit is written in `tools/oracle/ELK_COMMIT`
 * and nowhere else. The recorders of `tools/vectors` stamp their vector files with it, and read it from the system
 * property `elk.commit`, which their scripts pass from that file; a recorder that held its own copy would stamp a ref
 * with a stale sha after a pin move.
 *
 * 1. The pin occurs in no file under `tools/` apart from PIN_HOLDERS.
 * 2. No `tools/vectors/*.java` holds a quoted 40-hex literal (a copy at an older pin, which rule 1 cannot see).
 * 3. Every recorder that calls `elkCommit()` is run by a `tools/vectors/*-vectors.sh` that passes `-Delk.commit=`,
 *    on its own `java` lines or through `vc_run` of `vector-cache.sh`, whose `java` lines all pass it.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { scriptNames } from '../helpers/recorder-scripts.js';

const TOOLS_DIR = 'tools';
const VECTORS_DIR = 'tools/vectors';
const PIN_FILE = 'tools/oracle/ELK_COMMIT';
const CACHE_LAYER = 'tools/vectors/vector-cache.sh';
/** The files under `tools/` that may hold the pin, each with the reason. */
const PIN_HOLDERS: ReadonlyMap<string, string> = new Map([
  [PIN_FILE, 'the single source (AD-2)'],
  [
    'tools/melk/sources/manifest.json',
    'a generated stamp: written by tools/melk/sync-sources.sh, checked by test/melk/sources.test.ts',
  ],
]);
const SKIP_DIR_NAMES: ReadonlySet<string> = new Set(['node_modules']);
const SHA = /^[0-9a-f]{40}$/;
const QUOTED_SHA = /"[0-9a-f]{40}"/;
const RECORDER_PROGRAM = /\.java$/;
const VECTOR_SCRIPT = /-vectors\.sh$/;
const ACCESSOR_CALL = 'elkCommit()';
const PROPERTY_FLAG = '-Delk.commit=';
const CACHE_RUN = /\bvc_run\b/;
const COMMENT_LINE = /^\s*#/;
/** `java` as a command word followed by an option; `java -version` and `java -XshowSettings` run no recorder. */
const JAVA_LAUNCH = /(?:^|[\s{(])java\s+-(?!version\b|XshowSettings\b)/;
const EXPECTED_STAMPING_RECORDERS = 41;
const EXPECTED_CACHE_LAUNCHES = 3;

type Texts = ReadonlyMap<string, string>;

/** The files of `texts` that contain the pin and are not allowed to. */
export function pinCopies(texts: Texts, pin: string, allowed: ReadonlySet<string>): string[] {
  return [...texts].filter(([file, text]) => !allowed.has(file) && text.includes(pin)).map(([file]) => file);
}

/** The files of `texts` that hold a quoted 40-hex literal. */
export function quotedShaHolders(texts: Texts): string[] {
  return [...texts].filter(([, text]) => QUOTED_SHA.test(text)).map(([file]) => file);
}

/** The lines of a shell script that launch `java` with options, comments left out. */
export function launchLines(scriptText: string): string[] {
  return scriptText.split('\n').filter((line) => !COMMENT_LINE.test(line) && JAVA_LAUNCH.test(line));
}

/** The launch lines of a script that do not pass the property. */
export function launchesWithoutPin(scriptText: string): string[] {
  return launchLines(scriptText).filter((line) => !line.includes(PROPERTY_FLAG));
}

/** Whether a vector script hands the pin to the recorder it runs: through the cache layer, or on every `java` line. */
function passesPin(scriptText: string): boolean {
  if (CACHE_RUN.test(scriptText)) return true;
  return launchLines(scriptText).length > 0 && launchesWithoutPin(scriptText).length === 0;
}

/**
 * The recorders (of `programs`) that call `elkCommit()` and are not handed the pin: one `<file>: <why>` per offender.
 * A recorder is reached when at least one vector script names it and every script that names it passes the pin.
 */
export function unfedRecorders(programs: Texts, vectorScripts: Texts): string[] {
  const offenders: string[] = [];
  for (const [program, source] of programs) {
    if (!source.includes(ACCESSOR_CALL)) continue;
    const runners = [...vectorScripts].filter(([, text]) => scriptNames(text, path.basename(program)));
    if (runners.length === 0) offenders.push(`${program}: no *-vectors.sh runs it`);
    for (const [script, text] of runners)
      if (!passesPin(text)) offenders.push(`${program}: ${script} does not pass ${PROPERTY_FLAG}`);
  }
  return offenders;
}

/** Recursively collects file paths (posix, relative to `root`) under `dir`. */
function walk(root: string, dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return SKIP_DIR_NAMES.has(entry.name) ? [] : walk(root, rel);
    return entry.isFile() ? [rel] : [];
  });
}

function readAll(root: string, files: readonly string[]): Map<string, string> {
  return new Map(files.map((file) => [file, readFileSync(path.join(root, file), 'utf8')]));
}

function listFiles(root: string, dir: string, name: RegExp): string[] {
  return readdirSync(path.join(root, dir))
    .filter((file) => name.test(file))
    .map((file) => `${dir}/${file}`)
    .sort();
}

const root = repoRoot();
const pin = readFileSync(path.join(root, PIN_FILE), 'utf8').trim();
const programs = readAll(root, listFiles(root, VECTORS_DIR, RECORDER_PROGRAM));
const vectorScripts = readAll(root, listFiles(root, VECTORS_DIR, VECTOR_SCRIPT));

describe('fitness: the pinned ELK commit has one source under tools/ (issue #96)', () => {
  it('reads a 40-digit sha from tools/oracle/ELK_COMMIT', () => {
    expect(pin).toMatch(SHA);
  });

  it('finds the pin in no file under tools/ but its source and the melk stamp', () => {
    const copies = pinCopies(readAll(root, walk(root, TOOLS_DIR)), pin, new Set(PIN_HOLDERS.keys()));
    expect(copies, `the pin belongs in ${PIN_FILE} only:\n${copies.join('\n')}`).toEqual([]);
  });

  it('finds no quoted 40-hex literal in a recorder', () => {
    const holders = quotedShaHolders(programs);
    expect(holders, `read the pin with elkCommit(), never a literal:\n${holders.join('\n')}`).toEqual([]);
  });

  it('finds every java line of the cache layer passing the pin', () => {
    const cacheLayer = readFileSync(path.join(root, CACHE_LAYER), 'utf8');
    expect(launchLines(cacheLayer)).toHaveLength(EXPECTED_CACHE_LAUNCHES);
    expect(launchesWithoutPin(cacheLayer)).toEqual([]);
  });

  it('finds every recorder that stamps the pin run by a script that passes it', () => {
    const stamping = [...programs].filter(([, source]) => source.includes(ACCESSOR_CALL));
    expect(stamping).toHaveLength(EXPECTED_STAMPING_RECORDERS);
    expect(unfedRecorders(programs, vectorScripts)).toEqual([]);
  });
});

describe('fitness: the pin rules', () => {
  const PIN = 'a'.repeat(40);
  const OLDER = 'b'.repeat(40);
  const ACCESSOR = 'static String elkCommit() { return System.getProperty("elk.commit"); }\n';
  const STAMP = `out.append(elkCommit());\n`;

  it('reports a copy of the pin outside the allowed files', () => {
    const texts = new Map([
      ['tools/oracle/ELK_COMMIT', `${PIN}\n`],
      ['tools/vectors/AVectors.java', `static final String ELK_COMMIT = "${PIN}";`],
      ['tools/vectors/BVectors.java', `static final String ELK_COMMIT = "${OLDER}";`],
      ['tools/oracle/README.md', `pinned at ${PIN}`],
    ]);
    expect(pinCopies(texts, PIN, new Set(['tools/oracle/ELK_COMMIT']))).toEqual([
      'tools/vectors/AVectors.java',
      'tools/oracle/README.md',
    ]);
  });

  it('reports a quoted sha at any pin, and neither a shorter literal nor an unquoted sha', () => {
    const texts = new Map([
      ['A.java', `String c = "${OLDER}";`],
      ['B.java', `String c = "${OLDER.slice(1)}"; // ${OLDER}`],
      ['C.java', `String c = System.getProperty("elk.commit");`],
    ]);
    expect(quotedShaHolders(texts)).toEqual(['A.java']);
  });

  it('takes java with options as a launch, and neither a comment nor a version probe', () => {
    const script = [
      '# java -cp "$cp" "$program" "$out"',
      'VC_JAVA_VERSION="$(java -version 2>&1)"',
      'version="$(java -XshowSettings:properties -version 2>&1)"',
      '  java -cp "$cp" "$program" "$out"',
      '  { java -Delk.commit="$pin" -cp "$cp" "$program" "$out" 2>&1 >&3; } 3>&1',
      '      exec java -cp "$cp" "$PROGRAM" "$@"',
    ].join('\n');
    expect(launchLines(script)).toHaveLength(3);
    expect(launchesWithoutPin(script)).toEqual([
      '  java -cp "$cp" "$program" "$out"',
      '      exec java -cp "$cp" "$PROGRAM" "$@"',
    ]);
  });

  it('reports a stamping recorder no script runs, and one run without the property', () => {
    const recorders = new Map([
      ['tools/vectors/AVectors.java', ACCESSOR + STAMP],
      ['tools/vectors/BVectors.java', ACCESSOR + STAMP],
      ['tools/vectors/CVectors.java', ACCESSOR + STAMP],
      ['tools/vectors/DVectors.java', ACCESSOR + STAMP],
      ['tools/vectors/ElkxLexerVectors.java', ACCESSOR + STAMP],
      ['tools/vectors/PlainVectors.java', 'class PlainVectors {}\n'],
    ]);
    const scripts = new Map([
      ['tools/vectors/a-vectors.sh', 'java -Delk.commit="$pinned" -cp "$cp" "$VECTORS_DIR/AVectors.java" "$1"'],
      ['tools/vectors/b-vectors.sh', 'java -cp "$cp" "$VECTORS_DIR/BVectors.java" "$1"'],
      ['tools/vectors/c-vectors.sh', 'PROGRAM="$VECTORS_DIR/CVectors.java"\nvc_run "$0" "$cp" "$PROGRAM" "$1"'],
      ['tools/vectors/elkx-vectors.sh', 'find . -name \'Elkx*Vectors.java\'\nvc_run "$0" "$cp" "$program" "$1"'],
      ['tools/vectors/plain-vectors.sh', 'java "$VECTORS_DIR/PlainVectors.java" "$1"'],
    ]);
    expect(unfedRecorders(recorders, scripts)).toEqual([
      `tools/vectors/BVectors.java: tools/vectors/b-vectors.sh does not pass ${PROPERTY_FLAG}`,
      'tools/vectors/DVectors.java: no *-vectors.sh runs it',
    ]);
  });
});
