// SPDX-License-Identifier: EPL-2.0
// Measures, per `sites` row of test/golden/refs/java/layered-compound.json (mission 7h, T14), that the row's replay takes the TypeScript
// arms plans/layered-compound/unreached.md names for its scenario (test/helpers/layered-compound-site-arms.json: file, line and arm
// `if[k]` / `binary-expr[k]` / `cond-expr[k]` / `fn` as the v8 coverage JSON keys them). One vitest run per row (the row replayed alone
// by src/alg/layered/LayeredCompoundSites.test.ts, v8 coverage, JSON reporter, no thresholds), then the arm counts are read from
// coverage-final.json. Usage: node tools/vectors/compound-site-arms.mjs [row id ...]   (default: every row of the table).
// Exit 1 when a named arm is not taken (the document or the scenario is wrong: never weaken the table).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const table = JSON.parse(readFileSync(path.join(root, 'test/helpers/layered-compound-site-arms.json'), 'utf8'));
const ids = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(table);
const SITES_TEST = 'src/alg/layered/LayeredCompoundSites.test.ts';
const ARM = /^(.*)\[(\d+)\]$/;

/** Count of one arm of `file` at `line` in a coverage-final entry: the largest count over the branches of that kind at that line. */
function armCount(entry, spec) {
  if (spec.arm === 'fn') {
    return Math.max(
      -1,
      ...Object.entries(entry.fnMap)
        .filter(([, f]) => f.decl.start.line === spec.line)
        .map(([id]) => entry.f[id]),
    );
  }
  const [, type, index] = ARM.exec(spec.arm);
  const counts = Object.entries(entry.branchMap)
    .filter(([, b]) => b.loc.start.line === spec.line && b.type === type)
    .map(([id]) => entry.b[id][Number(index)] ?? -1);
  return Math.max(-1, ...counts);
}

function measure(id) {
  const dir = mkdtempSync(path.join(tmpdir(), 'site-arms-'));
  const include = [...new Set(table[id].map((spec) => `--coverage.include=${spec.file}`))];
  const run = spawnSync(
    'npx',
    [
      'vitest',
      'run',
      SITES_TEST,
      '-t',
      `${id}$`,
      '--coverage',
      ...include,
      '--coverage.reporter=json',
      `--coverage.reportsDirectory=${dir}`,
      '--coverage.thresholds.statements=0',
      '--coverage.thresholds.branches=0',
      '--coverage.thresholds.functions=0',
      '--coverage.thresholds.lines=0',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  const coverage = JSON.parse(readFileSync(path.join(dir, 'coverage-final.json'), 'utf8'));
  rmSync(dir, { recursive: true, force: true });
  return table[id].map((spec) => {
    const entry = Object.entries(coverage).find(([file]) => file.endsWith(spec.file))?.[1];
    return { ...spec, count: entry === undefined ? -1 : armCount(entry, spec), vitest: run.status };
  });
}

let missed = 0;
for (const id of ids) {
  if (table[id] === undefined) {
    console.log(`${id}: no arms named`);
    continue;
  }
  const results = measure(id);
  for (const r of results) {
    const state = r.count > 0 ? 'taken' : r.count === 0 ? 'NOT TAKEN' : 'NOT FOUND';
    missed += r.count > 0 ? 0 : 1;
    console.log(`${id} | ${path.basename(r.file)}:${r.line} ${r.arm} | ${state} (${r.count})`);
  }
}
console.log(missed === 0 ? 'every named arm is taken' : `${missed} named arms are not taken`);
process.exit(missed === 0 ? 0 : 1);
