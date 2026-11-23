// SPDX-License-Identifier: EPL-2.0
// Prints, per arm of tools/arm-search/arms.json, its count in a v8 `coverage-final.json` (issue #59, mission
// layered-arm-search T1). Arms are keyed as tools/vectors/compound-site-arms.mjs keys them: the line where the branch
// starts and `if[k]` / `binary-expr[k]`, the largest count over the branches of that kind on that line.
// Usage: node tools/arm-search/arm-counts.mjs <coverage-final.json>
// Prints one line per arm, `<n> | <group> | <file>:<line> <arm> | <count>`, where -1 means "no such branch" (the line
// moved: fix arms.json), then the number of untaken arms. Exit 1 only when an arm is not found.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const groups = JSON.parse(readFileSync(path.join(here, 'arms.json'), 'utf8'));
const ARM = /^(.*)\[(\d+)\]$/;
const NOT_FOUND = -1;

function armCount(entry, spec) {
  const [, type, index] = ARM.exec(spec.arm);
  const counts = Object.entries(entry.branchMap)
    .filter(([, b]) => b.loc.start.line === spec.line && b.type === type)
    .map(([id]) => entry.b[id][Number(index)] ?? NOT_FOUND);
  return Math.max(NOT_FOUND, ...counts);
}

const [coverageFile] = process.argv.slice(2);
if (coverageFile === undefined) {
  console.error('usage: node tools/arm-search/arm-counts.mjs <coverage-final.json>');
  process.exit(2);
}
const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
let untaken = 0;
let missing = 0;
for (const [group, arms] of Object.entries(groups)) {
  for (const spec of arms) {
    const entry = Object.entries(coverage).find(([file]) => file.endsWith(spec.file))?.[1];
    const count = entry === undefined ? NOT_FOUND : armCount(entry, spec);
    untaken += count === 0 ? 1 : 0;
    missing += count === NOT_FOUND ? 1 : 0;
    console.log(
      `${spec.n} | ${group} | ${spec.file.replace('src/alg/layered/', '')}:${spec.line} ${spec.arm} | ${count}`,
    );
  }
}
console.log(`untaken: ${untaken}, not found: ${missing}`);
process.exit(missing === 0 ? 0 : 1);
