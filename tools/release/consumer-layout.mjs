// SPDX-License-Identifier: EPL-2.0
// Run by tools/release/pack-smoke.ts inside a clean consumer project, never from the repository: it imports only the
// installed package (and node:fs for its input), so it proves what a consumer of the tarball can do.
// Usage: node consumer-layout.mjs <input.json>   (ELK JSON in, laid-out ELK JSON on stdout)
import { readFileSync } from 'node:fs';
import { layout } from '@knowvah/elk-engine';

const laidOut = await layout(JSON.parse(readFileSync(process.argv[2], 'utf8')));
process.stdout.write(`${JSON.stringify(laidOut, null, 2)}\n`);
