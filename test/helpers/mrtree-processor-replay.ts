// SPDX-License-Identifier: EPL-2.0
// Isolated-processor replay shared by the mrtree intermediate-processor tests (mission 8a, T14): every recorded transition of one
// step is rebuilt from its recorded "before" state (buildBeforeGraphs), run through the processor and compared with the recorded stop.
import { expect } from 'vitest';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { TEdge } from '../../src/alg/mrtree/graph/TEdge.js';
import { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { TNode } from '../../src/alg/mrtree/graph/TNode.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { compareStop, dumpStop, dumpTGraph, formatDifferences } from './mrtree-replay-dump.js';
import { loadStopsRows, transitionsOfStep, type StopsRow } from './mrtree-replay-rows.js';
import { buildBeforeGraphs } from './mrtree-replay-state.js';

/** One replayed transition: the state before (as dumped from the rebuilt graph), the processed graph and where it came from. */
export interface ReplayedTransition {
  readonly rowId: string;
  readonly comp: number;
  readonly graph: TGraph;
  readonly beforeText: string;
}

export interface StepReplay {
  /** transitions of the step in the ref */
  readonly total: number;
  /** transitions whose before state cannot be rebuilt from the dump (T6 note 1) */
  readonly refused: number;
  readonly replayed: readonly ReplayedTransition[];
}

/** Runs `make()` (a fresh processor per transition) from the recorded before state of every transition of `step`; asserts the stop. */
export function replayStep(
  step: string,
  make: () => ILayoutProcessor<TGraph>,
  rows: readonly StopsRow[] = loadStopsRows(),
): StepReplay {
  const transitions = transitionsOfStep(step, rows);
  const replayed: ReplayedTransition[] = [];
  let refused = 0;
  for (const { rowId, transition } of transitions) {
    const built = buildBeforeGraphs(
      rows.find((r) => r.id === rowId)!,
      transition,
    );
    if (built === null) {
      refused++;
      continue;
    }
    const graph = built.graphs[0]!;
    const beforeText = JSON.stringify(dumpTGraph(graph));
    make().process(graph, new NullElkProgressMonitor());
    const label = `${rowId} comp ${String(transition.comp)}`;
    expect(formatDifferences(compareStop(transition.stop, dumpStop(step, transition.comp, [graph]))), label).toBe('');
    replayed.push({ rowId, comp: transition.comp, graph, beforeText });
  }
  return { total: transitions.length, refused, replayed };
}

/** A hand-built graph of `n` nodes (ids 0..n-1, label `n<i>`) and edges given as index pairs, wired into both edge lists. */
export function graphOf(
  n: number,
  edges: readonly (readonly [number, number])[],
): { readonly g: TGraph; readonly nodes: TNode[]; readonly es: TEdge[] } {
  const g = new TGraph();
  const nodes = Array.from({ length: n }, (_, i) => new TNode(i, g, `n${String(i)}`));
  nodes.forEach((node) => g.getNodes().add(node));
  const es = edges.map(([s, t]) => {
    const e = new TEdge(nodes[s]!, nodes[t]!);
    nodes[s]!.getOutgoingEdges().add(e);
    nodes[t]!.getIncomingEdges().add(e);
    g.getEdges().add(e);
    return e;
  });
  return { g, nodes, es };
}

/** Runs a processor on a graph with a null monitor. */
export const runOn = (processor: ILayoutProcessor<TGraph>, graph: TGraph): void => {
  processor.process(graph, new NullElkProgressMonitor());
};
