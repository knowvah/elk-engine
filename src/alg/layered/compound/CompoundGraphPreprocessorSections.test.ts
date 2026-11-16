// SPDX-License-Identifier: EPL-2.0
// The section entry of CompoundGraphPreprocessor (mission 7h, T6, H11; wired by T8; reduced by T9) against the compound ref:
//   - every `models` row whose stop is the preprocessor (always stop 0) is run through the real driver with no spy (the facade
//     delegates to `processCompoundGraphPreprocessor`); the whole tree, the cross hierarchy map included, must match
//     `expected.tree` at AD-4 (the class's own stops; LayeredCompoundVectors.test.ts replays every row, this file keeps the rows
//     of the class's stop so that the class is proven by its own rows);
//   - every `scenarios` and `full` row runs the preprocessor stage alone (abort after stop 0) without throwing, and the
//     facts the Java text states hold after the entry returns: the facade's two containers are cleared (`:117-118`),
//     `CROSS_HIERARCHY_MAP` is set on the root (`:116`), every original edge is disconnected (`:301-302`) and every
//     segment's edge connects two nodes of the segment's graph (every `crossHierarchyMap.put` site). The state is observed
//     by a call-through spy on the facade (it runs the real `process`, then records the state).
// The H3 twins (reversed iterations) are LayeredCompoundTwins.test.ts.
// L4: no behavioural literal here; every expectation is a ref row or a fact of the Java text.
import { expect, it, vi } from 'vitest';
import {
  describeCompound,
  isCompoundFullRow,
  isCompoundModelsRow,
  isCompoundScenarioRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
} from '../../../../test/helpers/layered-compound-replay-rows.js';
import {
  COMPOUND_PREPROCESSOR,
  runRow,
  type RunnableRow,
} from '../../../../test/helpers/layered-compound-replay-run.js';
import { runToStop } from '../../../../test/helpers/layered-compound-replay-stops.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { Multimap } from '../../../guava/Multimap.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';
import type { CrossHierarchyEdge } from './CrossHierarchyEdge.js';

/** The engine runs of every row of one test; coverage instrumentation at high machine load needs room. */
const ALL_ROWS_TIMEOUT_MS = 120_000;

const rows = loadCompoundRowsIfPresent();
const preprocessorStops = rows
  .filter(isCompoundModelsRow)
  .filter((row) => row.expected.stop.processor === COMPOUND_PREPROCESSOR);
const stageRows = rows.filter((row) => isCompoundScenarioRow(row) || isCompoundFullRow(row)) as RunnableRow[];

/** One call of the section entry in place of the facade: the processor, the root graph, the state right after it. */
interface EntryCall {
  readonly self: CompoundGraphPreprocessor;
  readonly graph: LGraph;
  readonly mapCleared: boolean;
  readonly dummyNodeMapSize: number;
}

/** `env.around` that observes the facade's `process` for the duration of one run: it calls through, then records the state. */
function withSectionEntry(calls: EntryCall[]): <T>(run: () => T) => T {
  return <T>(run: () => T): T => {
    const original = CompoundGraphPreprocessor.prototype.process;
    const spy = vi.spyOn(CompoundGraphPreprocessor.prototype, 'process').mockImplementation(function (
      this: CompoundGraphPreprocessor,
      graph: LGraph,
      monitor: IElkProgressMonitor,
    ) {
      original.call(this, graph, monitor);
      calls.push({
        self: this,
        graph,
        mapCleared: this.crossHierarchyMap === null,
        dummyNodeMapSize: this.dummyNodeMap.size,
      });
    });
    try {
      return run();
    } finally {
      spy.mockRestore();
    }
  };
}

/** Whether a segment's edge connects two nodes of the segment's graph. */
function connectsInItsGraph(segment: CrossHierarchyEdge): boolean {
  const edge = segment.getEdge();
  const sourceGraph = edge.getSource()?.getNode()?.getGraph();
  const targetGraph = edge.getTarget()?.getNode()?.getGraph();
  return sourceGraph === segment.getGraph() && targetGraph === segment.getGraph();
}

/** The violations of the map's facts: original edges disconnected, segments inside their graphs. */
function mapViolations(map: Multimap<LEdge, CrossHierarchyEdge>): string[] {
  return map
    .keySet()
    .flatMap((origEdge) => [
      ...(origEdge.getSource() === null && origEdge.getTarget() === null
        ? []
        : [`original edge ${origEdge.toString()} is still connected (:301-302)`]),
      ...[...map.get(origEdge)]
        .filter((segment) => !connectsInItsGraph(segment))
        .map((segment) => `segment ${segment.toString()} does not connect two nodes of its graph`),
    ]);
}

/** The facts of the Java text that hold on the root right after the entry; one string per violation. */
function entryViolations(call: EntryCall): string[] {
  const cleared = call.mapCleared && call.dummyNodeMapSize === 0;
  const violations = cleared ? [] : ['the facade state is not cleared (:117-118)'];
  if (!call.graph.hasProperty(InternalProperties.CROSS_HIERARCHY_MAP)) {
    return [...violations, 'CROSS_HIERARCHY_MAP is not set on the root (:116)'];
  }
  return [...violations, ...mapViolations(call.graph.getProperty(InternalProperties.CROSS_HIERARCHY_MAP))];
}

describeCompound('CompoundGraphPreprocessor sections: the recorded preprocessor stops', () => {
  it('the ref holds the 10 preprocessor stops of the models group, all at index 0', () => {
    expect(preprocessorStops.map((row) => row.expected.stop.index)).toEqual(preprocessorStops.map(() => 0));
    expect(preprocessorStops).toHaveLength(10);
  });

  it.each(preprocessorStops.map((row) => [row.id, row] as const))(
    '%s',
    (_id, row: CompoundModelsRow) => {
      const result = runToStop(row);
      expect(result.diffs).toEqual([]);
    },
    ALL_ROWS_TIMEOUT_MS,
  );
});

describeCompound('CompoundGraphPreprocessor sections: the preprocessor stage of every scenarios and full row', () => {
  it(
    'completes without throwing and leaves the state the Java text states',
    () => {
      const calls: EntryCall[] = [];
      const failures: string[] = [];
      for (const row of stageRows) {
        const before = calls.length;
        const run = runRow(row, { around: withSectionEntry(calls), abortAfter: 0 });
        const called = calls.length - before;
        // a row whose root is not laid out with INCLUDE_CHILDREN makes no compound layout: no call, and its first stop
        // (if any: a HIERARCHICAL_NODE_RESIZER of a separately laid-out level) is not the preprocessor
        const first = run.stops[0]?.processor;
        const consistent =
          called === 0 ? first !== COMPOUND_PREPROCESSOR : called === 1 && first === COMPOUND_PREPROCESSOR;
        if (!consistent) {
          failures.push(`${row.id}: ${String(called)} entry calls, ${String(run.stops.length)} stops`);
        }
      }
      expect(failures).toEqual([]);
      expect(calls.flatMap(entryViolations)).toEqual([]);
      expect(calls.length).toBeGreaterThan(0);
    },
    ALL_ROWS_TIMEOUT_MS,
  );
});
