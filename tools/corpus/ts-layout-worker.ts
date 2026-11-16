// SPDX-License-Identifier: EPL-2.0
// Child process of the sharded TS sweep: lays out the cases the parent sends, one at a time, and answers with one
// outcome each. It is only ever forked by `ts-layout-shards.ts`; argv[2] is the JSON of the `Dirs` to read.
import { WORKER_DEPS_MODULE_ENV, handleCase, isCaseMessage, loadWorkerDeps } from './ts-layout-protocol.js';
import { type Dirs, liveDeps } from './ts-layout-pipeline.js';

/* v8 ignore start -- process wiring: argv, env and the IPC channel */
const send = process.send?.bind(process);
if (send === undefined) throw new Error('ts-layout-worker must be forked with an IPC channel');
const deps = await loadWorkerDeps(
  JSON.parse(process.argv[2] ?? '{}') as Dirs,
  process.env[WORKER_DEPS_MODULE_ENV],
  liveDeps,
);
process.on('message', (message: unknown) => {
  if (isCaseMessage(message)) send(handleCase(message, deps));
});
send({ type: 'ready' });
/* v8 ignore stop */
