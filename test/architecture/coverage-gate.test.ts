// SPDX-License-Identifier: EPL-2.0
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve('tools/coverage-gate/run.sh');
const dir = mkdtempSync(path.join(tmpdir(), 'coverage-gate-'));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the gate's classifier on a log with the given text and returns its output. */
function classify(name: string, text: string): string {
  const log = path.join(dir, `${name}.log`);
  writeFileSync(log, text);
  return execFileSync('bash', [SCRIPT, '--classify', log], { encoding: 'utf8' });
}

const PASSED_SUMMARY = ' Test Files  163 passed (163)\n      Tests  5765 passed (5765)\n';

describe('tools/coverage-gate/run.sh --classify', () => {
  it('names failing tests', () => {
    const out = classify(
      'failed',
      ' FAIL  src/a.test.ts > a > b\n Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 9 passed (10)\n',
    );
    expect(out).toContain('coverage gate: test failures:');
    expect(out).toContain('FAIL  src/a.test.ts > a > b');
  });

  it('shows the unhandled-error block when every test passed', () => {
    const out = classify(
      'unhandled',
      `${PASSED_SUMMARY}\n⎯⎯⎯⎯ Unhandled Error ⎯⎯⎯⎯\nError: ENOENT: no such file or directory, open 'coverage/.tmp/coverage-3.json'\n`,
    );
    expect(out).toContain('all tests passed, but vitest reported an unhandled error:');
    expect(out).toContain("ENOENT: no such file or directory, open 'coverage/.tmp/coverage-3.json'");
  });

  it('shows the threshold lines when every test passed', () => {
    const out = classify(
      'threshold',
      `${PASSED_SUMMARY}ERROR: Coverage for branches (89.5%) does not meet global threshold (90%)\n`,
    );
    expect(out).toContain('a coverage threshold was not met:');
    expect(out).toContain('ERROR: Coverage for branches (89.5%) does not meet global threshold (90%)');
  });

  it('falls back to the tail of the log for an unknown failure', () => {
    const out = classify('unknown', `${PASSED_SUMMARY}something else went wrong\n`);
    expect(out).toContain('no known failure signature; last 30 lines of the log:');
    expect(out).toContain('something else went wrong');
  });

  it('rejects a missing log with exit status 2', () => {
    expect(() => execFileSync('bash', [SCRIPT, '--classify', path.join(dir, 'absent.log')], { stdio: 'pipe' })).toThrow(
      expect.objectContaining({ status: 2 }),
    );
  });
});
