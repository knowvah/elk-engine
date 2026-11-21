// SPDX-License-Identifier: EPL-2.0
// Issue #50 (plans/vector-recorder-debts, D1, D2): drives the real tools/vectors/java-program.sh, and vc_salt of
// tools/vectors/vector-cache.sh, with stub `java` and `javac` commands first on PATH. Each stub appends its argv to a
// log, so a launch is asserted word for word: a single-file recorder must start exactly as it did before the helper.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const HELPER = path.resolve('tools/vectors/java-program.sh');
const CACHE_LAYER = path.resolve('tools/vectors/vector-cache.sh');
const SEPARATOR = '\t';
const CLASSPATH = '/oracle/a.jar:/p2/b.jar';
const PIN_OPTION = '-Delk.commit=0123abc';
const JAVAC_OPTIONS = ['-encoding', 'UTF-8', '-proc:none', '-implicit:class'];
const EXIT_OK = 0;
const EXIT_PROGRAM = 7;
const EXIT_COMPILE = 3;
const JAVA_STDOUT = 'java stdout\n';
const JAVAC_STDOUT = 'javac stdout\n';

// macOS reports its temp dir through the /var symlink; keep every path canonical.
const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'java-program-')));
const bin = path.join(dir, 'bin');
const log = path.join(dir, 'argv.log');
const scratch = path.join(dir, 'scratch');
const root = path.join(dir, 'repo');
const vectors = path.join(root, 'tools', 'vectors');
const single = path.join(vectors, 'SingleVectors.java');
const split = path.join(vectors, 'SplitVectors.java');
const splitDir = path.join(vectors, 'SplitVectors');
/** The helpers of SplitVectors in the order the helper must list them: C-locale path order (`C` sorts before `b`). */
const splitHelpers = [path.join(splitDir, 'A.java'), path.join(splitDir, 'C.java'), path.join(splitDir, 'b', 'Z.java')];

/** A stub that logs its name and argv on one line, runs `body`, prints `stdout` and exits with `$<exitVar>`. */
function stub(name: string, stdout: string, exitVar: string, body: string): void {
  const lines = [
    '#!/usr/bin/env bash',
    `{ printf '%s' ${name}; printf '\\t%s' "$@"; printf '\\n'; } >>"$STUB_LOG"`,
    body,
    `printf '%s\\n' '${stdout.trimEnd()}'`,
    `exit "\${${exitVar}:-${EXIT_OK}}"`,
  ];
  const file = path.join(bin, name);
  writeFileSync(file, `${lines.join('\n')}\n`);
  chmodSync(file, 0o755);
}

mkdirSync(bin);
mkdirSync(scratch);
mkdirSync(path.join(splitDir, 'b'), { recursive: true });
for (const file of [single, split, ...splitHelpers]) writeFileSync(file, `// ${path.basename(file)}\n`);
writeFileSync(path.join(splitDir, 'README.md'), 'not a source\n');
// javac: the directory after -d must exist when the compiler starts; a class file is left in it.
stub(
  'javac',
  JAVAC_STDOUT,
  'STUB_JAVAC_EXIT',
  'while [ "$#" -gt 1 ]; do [ "$1" = -d ] && : >"$2/Stub.class"; shift; done',
);
// java: records whether the first classpath entry holds the class file javac left.
stub(
  'java',
  JAVA_STDOUT,
  'STUB_JAVA_EXIT',
  'while [ "$#" -gt 1 ]; do [ "$1" = -cp ] && [ -f "${2%%:*}/Stub.class" ] && echo compiled >>"$STUB_LOG"; shift; done',
);

afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => rmSync(log, { force: true }));

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** One entry per stub call (the command name, then its arguments), or the marker line `compiled`. */
  readonly calls: readonly (readonly string[])[];
}

/** Sources the helper in a fresh bash, runs `script` with `args` as `$1`…, and reads the stubs' log. */
function bash(script: string, args: readonly string[], env: Record<string, string> = {}): Run {
  const run = spawnSync('bash', ['-c', `. "${HELPER}"; ${script}`, '_', ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env['PATH'] ?? ''}`, STUB_LOG: log, TMPDIR: scratch, ...env },
  });
  const calls = existsSync(log)
    ? readFileSync(log, 'utf8')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => line.split(SEPARATOR))
    : [];
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, calls };
}

function launch(program: string, env: Record<string, string> = {}): Run {
  return bash('jp_run java "$@"', [PIN_OPTION, '-cp', CLASSPATH, program, 'out dir', 'second'], env);
}

/** The one javac call of a run, split into the `-d` directory and the remaining words. */
function compileOf(run: Run): { classes: string; rest: string[] } {
  const call = run.calls.find(([name]) => name === 'javac') ?? [];
  const at = call.indexOf('-d');
  return { classes: call[at + 1] ?? '', rest: [...call.slice(0, at), ...call.slice(at + 2)] };
}

describe('tools/vectors/java-program.sh: sources of a program', () => {
  it('names its own path', () => {
    expect(bash('printf "%s" "$VC_JAVA_PROGRAM"', []).stdout).toBe(HELPER);
  });

  it('lists a single-file program as its one file', () => {
    expect(bash('jp_sources "$1"', [single]).stdout).toBe(`${single}\n`);
  });

  it('lists the entry first, then every helper source in C-locale path order', () => {
    const listed = bash('jp_sources "$1"', [split], { LC_ALL: 'en_US.UTF-8' });
    expect(listed.stdout).toBe(`${[split, ...splitHelpers].join('\n')}\n`);
    expect(listed.status).toBe(EXIT_OK);
  });
});

describe('tools/vectors/java-program.sh: launching a single-file program', () => {
  it('runs the command line it was given, word for word, and never compiles', () => {
    const run = launch(single);
    expect(run.calls).toEqual([['java', PIN_OPTION, '-cp', CLASSPATH, single, 'out dir', 'second']]);
    expect(run.stdout).toBe(JAVA_STDOUT);
    expect(run.status).toBe(EXIT_OK);
  });

  it('returns the exit status of the program', () => {
    expect(launch(single, { STUB_JAVA_EXIT: String(EXIT_PROGRAM) }).status).toBe(EXIT_PROGRAM);
  });
});

describe('tools/vectors/java-program.sh: launching a program with a sibling directory', () => {
  it('compiles the entry and every helper into a fresh directory under TMPDIR', () => {
    const { classes, rest } = compileOf(launch(split));
    expect(path.dirname(classes)).toBe(scratch);
    expect(rest).toEqual(['javac', ...JAVAC_OPTIONS, '-cp', CLASSPATH, split, ...splitHelpers]);
  });

  it('runs the class by name with the compiled classes first on the classpath', () => {
    const run = launch(split);
    const { classes } = compileOf(run);
    expect(run.calls.slice(1)).toEqual([
      ['java', PIN_OPTION, '-cp', `${classes}:${CLASSPATH}`, 'SplitVectors', 'out dir', 'second'],
      ['compiled'],
    ]);
    expect(run.status).toBe(EXIT_OK);
  });

  it('keeps the compiler off the stdout of the program', () => {
    const run = launch(split);
    expect(run.stdout).toBe(JAVA_STDOUT);
    expect(run.stderr).toBe(JAVAC_STDOUT);
  });

  it('removes the classes after the program ends', () => {
    const { classes } = compileOf(launch(split));
    expect(classes).not.toBe('');
    expect(existsSync(classes)).toBe(false);
  });

  it('returns a failing exit status of the program, and still removes the classes', () => {
    const run = launch(split, { STUB_JAVA_EXIT: String(EXIT_PROGRAM) });
    expect(run.status).toBe(EXIT_PROGRAM);
    expect(existsSync(compileOf(run).classes)).toBe(false);
  });

  it('returns the exit status of a failed compile and never starts the program', () => {
    const run = launch(split, { STUB_JAVAC_EXIT: String(EXIT_COMPILE) });
    expect(run.status).toBe(EXIT_COMPILE);
    expect(run.calls.map(([name]) => name)).toEqual(['javac']);
    expect(existsSync(compileOf(run).classes)).toBe(false);
  });

  it('puts the classes on the classpath of a command line that names none', () => {
    const run = bash('jp_run java "$@"', [split, 'only']);
    const { classes, rest } = compileOf(run);
    expect(rest).toEqual(['javac', ...JAVAC_OPTIONS, split, ...splitHelpers]);
    expect(run.calls[1]).toEqual(['java', '-cp', classes, 'SplitVectors', 'only']);
  });
});

describe('tools/vectors/java-program.sh: a command line it cannot read', () => {
  it('refuses a command that is not java', () => {
    const run = bash('jp_run javaw "$@"', ['-cp', CLASSPATH, single]);
    expect(run.status).toBe(2);
    expect(run.stderr).toBe(`error: jp_run takes a java command line, not: javaw -cp ${CLASSPATH} ${single}\n`);
    expect(run.calls).toEqual([]);
  });

  it('refuses a command line that names no source file', () => {
    const run = bash('jp_run java "$@"', ['-cp', CLASSPATH]);
    expect(run.status).toBe(2);
    expect(run.stderr).toBe(`error: jp_run found no <Program>.java in: java -cp ${CLASSPATH}\n`);
    expect(run.calls).toEqual([]);
  });
});

describe('tools/vectors/vector-cache.sh: the salt covers every source of a program (D2)', () => {
  const callingScript = path.join(vectors, 'split-vectors.sh');
  const oracle = path.join(dir, 'oracle');
  const JAVA_VERSION = 'openjdk version "0"';
  const SALT_DRIVER = [
    'ROOT="$1"; VECTORS_DIR="$2"; ELK_ORACLE_DIR="$3"',
    'die() { echo "error: $1" >&2; exit 1; }',
    `. "${CACHE_LAYER}"`,
    'VC_JAVA_VERSION="$4"',
    'vc_salt "$5" "$6" "$7"',
  ].join('\n');

  mkdirSync(oracle);
  writeFileSync(path.join(oracle, 'oracle-build.json'), '{"commit":"0"}\n');
  writeFileSync(callingScript, '#!/usr/bin/env bash\n');

  function salt(program: string): string {
    const run = spawnSync(
      'bash',
      [
        '-c',
        SALT_DRIVER,
        '_',
        root,
        path.dirname(CACHE_LAYER),
        oracle,
        JAVA_VERSION,
        callingScript,
        CLASSPATH,
        program,
      ],
      { encoding: 'utf8' },
    );
    expect(run.stderr).toBe('');
    return run.stdout.trim();
  }

  /** vc_digest's framing: each part as `<kind> <byte length>\n<bytes>`, `f` for a file and `s` for a string. */
  function digest(parts: readonly (readonly ['f' | 's', string])[]): string {
    const hash = createHash('sha256');
    for (const [kind, value] of parts) {
      const bytes = kind === 'f' ? readFileSync(value) : Buffer.from(value, 'utf8');
      hash.update(`${kind} ${bytes.length}\n`);
      hash.update(bytes);
    }
    return hash.digest('hex');
  }

  function head(program: string): (readonly ['f' | 's', string])[] {
    return [
      ['f', program],
      ['f', callingScript],
      ['f', CACHE_LAYER],
      ['f', path.join(oracle, 'oracle-build.json')],
      ['s', CLASSPATH],
      ['s', JAVA_VERSION],
    ];
  }

  it('hashes a single-file program, its script, the cache layer, the oracle build, the classpath, the JDK and the helper', () => {
    expect(salt(single)).toBe(digest([...head(single), ['f', HELPER]]));
  });

  it('adds every helper source, framed with its repository path, before the helper script', () => {
    const helperParts = splitHelpers.flatMap((file): (readonly ['f' | 's', string])[] => [
      ['s', path.posix.relative(root, file)],
      ['f', file],
    ]);
    expect(helperParts[0]).toEqual(['s', 'tools/vectors/SplitVectors/A.java']);
    expect(salt(split)).toBe(digest([...head(split), ...helperParts, ['f', HELPER]]));
  });
});
