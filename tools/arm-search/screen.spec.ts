// SPDX-License-Identifier: EPL-2.0
// The TypeScript screen of the arm search (issue #59, plans/layered-arm-search D2): replays candidate inputs through
// the helpers the landed replay suites use, so that a candidate's arm coverage in the port is known before it is
// confirmed on the oracle. Not part of the suite (vitest.config.ts includes src/ and test/ only): tools/arm-search/
// screen.sh runs it with a scratch config and v8 coverage of the arm files.
//
// ARM_SCREEN_FILE names a JSON array of candidates:
//   { "id": "...", "kind": "order", "elk": <ELK JSON>, "target": <ELK id | null>, "steps": [[op, ...], ...] }
//       a step row of tools/vectors/LayeredOrderVectors.java (a trailing ["dump"] step is optional here), replayed by
//       runSteps as src/alg/layered/LayeredOrderVectors.test.ts replays a `scenarios` or `sites` row;
//   { "id": "...", "kind": "compound", "elk": <ELK JSON>, "options": { <option id>: <C4 value> } }
//       a `run` row of tools/vectors/LayeredCompoundVectors.java SITE_ROWS (a full layout through the recursive
//       engine), replayed by runRow as src/alg/layered/LayeredCompoundSites.test.ts replays one.
// ARM_SCREEN_ID (optional) keeps the candidate with that id only. ARM_SCREEN_OUT (optional) names a file that
// receives one JSON line per candidate: { id, ok, error?, layers?, ports?, layout? }.
import { appendFileSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runRow } from '../../test/helpers/layered-compound-replay-run.js';
import { registerCompoundEnums } from '../../test/helpers/layered-compound-replay-rows.js';
import { exportLikeOracle } from '../../test/helpers/graph-json-oracle.js';
import { orderDump } from '../../test/helpers/layered-order-replay-dump.js';
import { runSteps } from '../../test/helpers/layered-phase-replay-ops.js';
import {
  importRow,
  type ElkInput,
  type PhaseRow,
  type PhaseStep,
} from '../../test/helpers/layered-phase-replay-rows.js';
import { STRICT_ORDER_PHASE_FACTORIES } from '../../test/helpers/layered-replay-factories.js';

interface OrderCandidate {
  readonly id: string;
  readonly kind: 'order';
  readonly elk: ElkInput['elk'];
  readonly target?: string | null;
  readonly steps: readonly PhaseStep[];
}

interface CompoundCandidate {
  readonly id: string;
  readonly kind: 'compound';
  readonly elk: ElkInput['elk'];
  readonly options?: Readonly<Record<string, unknown>>;
}

type Candidate = OrderCandidate | CompoundCandidate;

const ROW_TIMEOUT_MS = 120_000;
const DUMP_STEP = 'dump';
const file = process.env['ARM_SCREEN_FILE'];
const only = process.env['ARM_SCREEN_ID'];
const out = process.env['ARM_SCREEN_OUT'];

function screenOrder(candidate: OrderCandidate): Record<string, unknown> {
  const row = {
    id: candidate.id,
    group: 'sites',
    input: { elk: candidate.elk },
    target: candidate.target ?? null,
    options: {},
    steps: candidate.steps.filter((step) => step[0] !== DUMP_STEP),
    prefix: null,
    expected: {},
  } as unknown as PhaseRow;
  const dump = orderDump(runSteps(row, STRICT_ORDER_PHASE_FACTORIES), importRow(row).importDump);
  return { layers: dump.layers, ports: dump.ports };
}

function screenCompound(candidate: CompoundCandidate): Record<string, unknown> {
  registerCompoundEnums();
  const run = runRow({ id: candidate.id, input: { elk: candidate.elk }, options: candidate.options ?? {} });
  return { layout: JSON.parse(exportLikeOracle(run.root)) as unknown };
}

function screen(candidate: Candidate): Record<string, unknown> {
  try {
    const result = candidate.kind === 'order' ? screenOrder(candidate) : screenCompound(candidate);
    return { id: candidate.id, ok: true, ...result };
  } catch (error) {
    return {
      id: candidate.id,
      ok: false,
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    };
  }
}

const candidates: readonly Candidate[] =
  file === undefined ? [] : (JSON.parse(readFileSync(file, 'utf8')) as Candidate[]);

for (const candidate of candidates.filter((c) => only === undefined || c.id === only)) {
  it(candidate.id, { timeout: ROW_TIMEOUT_MS }, () => {
    const result = screen(candidate);
    if (out !== undefined) {
      appendFileSync(out, `${JSON.stringify(result)}\n`);
    }
    // A candidate that throws in the port is a result to report (the oracle may throw too), not a failure of the screen.
    expect(typeof result['ok']).toBe('boolean');
  });
}
