// SPDX-License-Identifier: EPL-2.0
// The prefix replay of mission 7c: `runPrefix` of layered-phase-replay-ops.ts (7b, the origin of this file) with
// P3_NODE_ORDERING added to the accepted phases. Import, `normalise`, then every named processor or phase in order,
// from injected `Factories`.
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { normalise } from './layered-phase-replay-normalise.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { importRow } from './layered-phase-replay-rows.js';
import type { OrderRow } from './layered-order-replay-rows.js';

const PHASE_SEPARATOR = '/';
const PHASES: ReadonlySet<string> = new Set(['P1_CYCLE_BREAKING', 'P2_LAYERING', 'P3_NODE_ORDERING']);

function runOn(processor: ILayoutProcessor<LGraph>, graph: LGraph): void {
  processor.process(graph, new NullElkProgressMonitor());
}

function runPrefixEntry(entry: string, graph: LGraph, factories: Factories): void {
  const at = entry.indexOf(PHASE_SEPARATOR);
  if (at < 0) {
    runOn(factories.createProcessor(entry), graph);
    return;
  }
  const phase = entry.slice(0, at);
  if (!PHASES.has(phase)) {
    throw new Error(`prefix entry ${entry} names the unknown phase ${phase}`);
  }
  runOn(factories.createPhase(phase, entry.slice(at + PHASE_SEPARATOR.length)), graph);
}

/** Replays a model row: import, `normalise`, then the recorded `prefix` in order. */
export function runOrderPrefix(row: OrderRow, factories: Factories): LGraph {
  if (row.prefix === null) {
    throw new Error(`row ${row.id} has no prefix`);
  }
  const { graph } = importRow(row);
  normalise(graph);
  row.prefix.forEach((entry) => runPrefixEntry(entry, graph, factories));
  return graph;
}
