// SPDX-License-Identifier: EPL-2.0
// Fitness test for docs/architecture/elk-upgrade.md (mission elk-upgrade-runbook, decision UP5). The runbook is only
// right while it names every recorder, regen and sweep script; a script added by a later mission must fail here.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';
import { scriptNames } from '../helpers/recorder-scripts.js';

const RUNBOOK_RELATIVE = 'docs/architecture/elk-upgrade.md';
const VECTORS_DIR = 'tools/vectors';
const ORACLE_DIR = 'tools/oracle';
const VECTOR_SCRIPT = /-vectors\.sh$/;
const REGEN_SCRIPT = /^regen-.*\.sh$/;
const SWEEP_SCRIPT = /sweep.*\.sh$/;
const RECORDER_PROGRAM = /\.java$/;
const SHELL_SCRIPT = /\.sh$/;
/** A repo-relative `tools/...` path; a longer path that merely contains `tools/` (`.tools/`, `$R/repo/tools/`) is not one. */
const TOOLS_PATH = /(?<![\w./$-])tools\/[\w./*<>-]+/g;
const PATTERN_CHARS = /[*<>]/;
const TRAILING_PUNCTUATION = /[.,:;]+$/;
/** Any execute permission bit of a file mode. */
const EXECUTE_BITS = 0o111;

/** Files of `dir` (repo-relative) whose name matches, as sorted repo-relative paths. */
function listFiles(root: string, dir: string, name: RegExp): string[] {
  return readdirSync(path.join(root, dir))
    .filter((file) => name.test(file))
    .map((file) => `${dir}/${file}`)
    .sort();
}

/** Every concrete `tools/...` path a Markdown text names; globs and `<placeholder>` paths are patterns, not paths. */
export function namedToolPaths(markdown: string): string[] {
  const paths = (markdown.match(TOOLS_PATH) ?? [])
    .filter((token) => !PATTERN_CHARS.test(token))
    .map((token) => token.replace(TRAILING_PUNCTUATION, ''));
  return [...new Set(paths)].sort();
}

/** The members of `inventory` the text does not name. */
export function missingFrom(markdown: string, inventory: readonly string[]): string[] {
  const named = new Set(namedToolPaths(markdown));
  return inventory.filter((script) => !named.has(script));
}

/** The named paths that do not exist under `root`. */
export function danglingPaths(markdown: string, root: string): string[] {
  return namedToolPaths(markdown).filter((file) => !existsSync(path.join(root, file)));
}

/** Recorder programs that neither a script of `scriptTexts` nor the runbook names. */
export function unreachedPrograms(
  markdown: string,
  programs: readonly string[],
  scriptTexts: readonly string[],
): string[] {
  const named = new Set(namedToolPaths(markdown));
  const inScript = (program: string): boolean => scriptTexts.some((text) => scriptNames(text, path.basename(program)));
  return programs.filter((program) => !named.has(program) && !inScript(program));
}

const root = repoRoot();
const runbook = readFileSync(path.join(root, RUNBOOK_RELATIVE), 'utf8');
const vectorScripts = listFiles(root, VECTORS_DIR, VECTOR_SCRIPT);
const regenScripts = listFiles(root, ORACLE_DIR, REGEN_SCRIPT);
const sweepScripts = listFiles(root, ORACLE_DIR, SWEEP_SCRIPT);

describe('elk upgrade runbook: script inventory (UP5)', () => {
  it('finds the three script families on disk', () => {
    expect(vectorScripts).toContain('tools/vectors/java-vectors.sh');
    expect(regenScripts).toContain('tools/oracle/regen-goldens.sh');
    expect(sweepScripts).toContain('tools/oracle/sweep.sh');
    expect(sweepScripts).toContain('tools/oracle/elkj-sweep.sh');
  });

  it('names every tools/vectors/*-vectors.sh', () => {
    expect(missingFrom(runbook, vectorScripts)).toEqual([]);
  });

  it('names every tools/oracle/regen-*.sh', () => {
    expect(missingFrom(runbook, regenScripts)).toEqual([]);
  });

  it('names every tools/oracle/*sweep*.sh', () => {
    expect(missingFrom(runbook, sweepScripts)).toEqual([]);
  });

  it('finds every inventory script executable, as the runbook runs each by its path', () => {
    const notExecutable = [...vectorScripts, ...regenScripts, ...sweepScripts].filter(
      (script) => (statSync(path.join(root, script)).mode & EXECUTE_BITS) === 0,
    );
    expect(notExecutable).toEqual([]);
  });

  it('names every recorder program that no script runs', () => {
    const programs = listFiles(root, VECTORS_DIR, RECORDER_PROGRAM);
    const scripts = [...listFiles(root, VECTORS_DIR, SHELL_SCRIPT), ...listFiles(root, ORACLE_DIR, SHELL_SCRIPT)];
    const scriptTexts = scripts.map((script) => readFileSync(path.join(root, script), 'utf8'));
    expect(programs).toContain('tools/vectors/JavaVectors.java');
    expect(unreachedPrograms(runbook, programs, scriptTexts)).toEqual([]);
  });

  it('names only tools/ paths that exist', () => {
    expect(danglingPaths(runbook, root)).toEqual([]);
  });
});

describe('elk upgrade runbook: the extraction rule', () => {
  const SAMPLE = [
    'Run `tools/vectors/java-vectors.sh test/golden/refs/java`, then tools/oracle/sweep.sh.',
    '| `tools/oracle/regen-goldens.sh --set layered` | refs |',
    'Globs such as `tools/vectors/*-vectors.sh` and `tools/oracle/regen-<name>.sh` are patterns.',
    'Not repo paths: `.tools/apache-maven-3.9.11/bin/mvn`, `$R/repo/tools/oracle/ELK_COMMIT`, `x-tools/y.sh`.',
  ].join('\n');

  it('extracts concrete paths, strips sentence punctuation and skips patterns and longer paths', () => {
    expect(namedToolPaths(SAMPLE)).toEqual([
      'tools/oracle/regen-goldens.sh',
      'tools/oracle/sweep.sh',
      'tools/vectors/java-vectors.sh',
    ]);
  });

  it('reports a script the text does not name', () => {
    const inventory = ['tools/vectors/java-vectors.sh', 'tools/vectors/gson-vectors.sh'];
    expect(missingFrom(SAMPLE, inventory)).toEqual(['tools/vectors/gson-vectors.sh']);
  });

  it('reports a named path that does not exist', () => {
    const text = 'Run `tools/oracle/build.sh`, then `tools/oracle/no-such-script.sh`.';
    expect(danglingPaths(text, root)).toEqual(['tools/oracle/no-such-script.sh']);
  });

  it('reports a recorder program neither a script nor the text names', () => {
    const programs = ['AVectors', 'BVectors', 'CVectors', 'ElkxLexerVectors', 'ElkxVectorsHelper'].map(
      (name) => `tools/vectors/${name}.java`,
    );
    const scriptTexts = [
      'java -cp "$CP" "$VECTORS_DIR/AVectors.java" "$out"',
      "find . -name 'Elkx*Vectors.java'",
      'cat harness/*.java',
    ];
    const text = 'Run `java tools/vectors/BVectors.java test/golden/refs/java`.';
    expect(unreachedPrograms(text, programs, scriptTexts)).toEqual([
      'tools/vectors/CVectors.java',
      'tools/vectors/ElkxVectorsHelper.java',
    ]);
  });
});
