// SPDX-License-Identifier: EPL-2.0
// The pre-state twin check (L4, no numbers): for every recorded step row with a full `expected.dump`, run the steps
// up to but excluding the first runProcessor/runPhase and compare the graph-level properties with the recorded dump.
// Layers and element-level differences the skipped processor causes are not asserted (the recorded dumps are post-run). This
// proves the import and the normalise/setProperty/layers/reverseEdge ops against every recorded dump.
import { describe, expect, it } from 'vitest';
import './layered-phase-replay-rows.js';
import type { LGraphDump } from './layered-framework-replay.js';
import { ignoredProperties } from './layered-phase-replay-dump.js';
import { compareValues, normalizeC4 } from './layered-site-replay-compare.js';
import { runSteps, type Factories } from './layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from './layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';

const REF = new URL('../golden/refs/java/layered-phases.json', import.meta.url).pathname;
const RUNNING_OPS: ReadonlySet<string> = new Set(['runProcessor', 'runPhase']);
const REFUSE: Factories = {
  createProcessor: () => {
    throw new Error('a processor ran in the pre-state');
  },
  createPhase: () => {
    throw new Error('a phase ran in the pre-state');
  },
};

function preState(row: PhaseRow): PhaseRow {
  const steps = row.steps ?? [];
  const first = steps.findIndex(([op]) => RUNNING_OPS.has(op));
  return { ...row, steps: first < 0 ? steps : steps.slice(0, first) };
}

const hasRunOp = (row: PhaseRow): boolean => (row.steps ?? []).some(([op]) => RUNNING_OPS.has(op));

/** The graph-level property ids the replay set whose recorded value differs, or that the recording lacks. */
function propertyDeviations(actual: LGraphDump, recorded: LGraphDump): string[] {
  return actual.graphs.flatMap((graph, i) => {
    const there = recorded.graphs[i]?.properties ?? {};
    return Object.keys(graph.properties).filter((id) => !(id in there));
  });
}

/** Shared graph-level properties whose value differs (C4-normalised; runtime objects ignored as in compareFullDump). */
function valueDeviations(actual: LGraphDump, recorded: LGraphDump): string[] {
  const ignored = ignoredProperties();
  return actual.graphs.flatMap((graph, i) => {
    const there = recorded.graphs[i]?.properties ?? {};
    return Object.entries(graph.properties)
      .filter(([id]) => id in there && !ignored.has(id))
      .filter(([id, value]) => compareValues(id, normalizeC4(value), normalizeC4(there[id])).length > 0)
      .map(([id]) => id);
  });
}

const rows = loadRows(REF).filter((row) => row.steps !== null && row.expected.dump !== undefined);

describe('pre-state twin of the recorded step rows', () => {
  // 51 scenario step dumps (T1) and the 30 site step dumps T11 added (rows under 10 nodes carry a dump, B2).
  it('has the 51 scenario and 30 site step dumps', () => {
    const count = (group: string): number => rows.filter((row) => row.group === group).length;
    expect({ scenarios: count('scenarios'), sites: count('sites') }).toEqual({ scenarios: 51, sites: 30 });
    expect(rows.length).toBe(81);
  });

  // Every recorded step dump follows a processor or phase, which may add graph properties and move nodes into layers:
  // only the properties the pre-state carries are asserted, each must be in the recording, with the same value.
  const staged = rows.filter(hasRunOp);
  it.each(staged.map((row) => [row.id, row] as const))('%s (before its processor)', (_id, row) => {
    const recorded = row.expected.dump as LGraphDump;
    const actual = dumpWithPropertyValues(runSteps(preState(row), REFUSE));
    expect(propertyDeviations(actual, recorded)).toEqual([]);
    expect(valueDeviations(actual, recorded)).toEqual([]);
  });
});
