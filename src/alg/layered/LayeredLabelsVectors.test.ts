// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-labels.json (mission 7f2, T12; recorded by
// tools/vectors/LayeredLabelsVectors.java from the source-built oracle) through the real enums, now that the 12 arms are wired:
// `full` rows through `runLabelsFullRow` (logged and interactive families dispatched, plain ones through the recursive engine),
// `models` rows by replaying their prefix, `scenarios` rows through the step interpreter with the new ops. Numbers within 1e-6
// (AD-4), everything else exactly; logged recordings compare whole under G3a's identity-hash normaliser. A test title is its
// row id, so `-t '<row id>$'` isolates one row. G4 twin: the FX2 rows (end labels on parallel edges) also run with
// `EndLabelPostprocessor` visiting each node's `END_LABELS` in reverse and must equal the oracle in both orders.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { formatDiffs } from '../../../test/golden/compare-json.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump, type LabelsExpected } from '../../../test/helpers/layered-labels-replay-dump.js';
import { compareLabelsFullRow, runLabelsFullRow } from '../../../test/helpers/layered-labels-replay-full.js';
import { runLabelsRow, type LabelsStepsResult } from '../../../test/helpers/layered-labels-replay-ops.js';
import {
  LABELS_ROW_GROUPS,
  labelsRefPath,
  loadLabelsRows,
  rowsByGroup,
} from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import {
  isFullRow,
  isStopRow,
  registerPipelineEnums,
  type PipelineRow,
  type PipelineStopRow,
} from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { compareRoutingFullDump } from '../../../test/helpers/layered-routing-replay-compare.js';
import { runRoutingPrefix } from '../../../test/helpers/layered-routing-replay-ops.js';
import { dumpWithPropertyValues } from '../../../test/helpers/layered-site-replay-dump.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { EndLabelPostprocessor } from './intermediate/EndLabelPostprocessor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { InteractiveLayeredGraphVisitor } from './InteractiveLayeredGraphVisitor.js';
import { InternalProperties } from './options/InternalProperties.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';
import type { LabelCell } from '../common/nodespacing/cellsystem/LabelCell.js';
import type { LPort } from './graph/LPort.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { LGraph } from './graph/LGraph.js';

const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
/** Mission 7g and 7h members: the recorder refused every row whose plan holds one. */
const LATER_MISSIONS = [
  'SELF_LOOP_PREPROCESSOR',
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
  'BREAKING_POINT_INSERTER',
  'BREAKING_POINT_PROCESSOR',
  'BREAKING_POINT_REMOVER',
  'SINGLE_EDGE_GRAPH_WRAPPER',
  'HORIZONTAL_COMPACTOR',
  'COMPACTION_CONNECTED_COMPONENTS',
  'HIERARCHICAL_NODE_RESIZER',
  'INCLUDE_CHILDREN',
];
const FX2_FULL = /^full\/(issues\/fx2-parallel-end-labels|logged\/inline-fx2)\//;
const FX2_SCENARIO = 'scenarios/Layout/logging/fx2/LEFT';

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      case ROUTING_PHASE:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};
const createInteractiveVisitor = (): InteractiveLayeredGraphVisitor => new InteractiveLayeredGraphVisitor();

const rows = loadLabelsRows();
const header = JSON.parse(readFileSync(labelsRefPath(), 'utf8')) as { rowCounts: Record<string, number> };

/** The result of replaying a `models` (prefix) or `scenarios` (steps) row. */
function stepsResult(row: PipelineStopRow): LabelsStepsResult {
  return row.steps === null
    ? { graph: runRoutingPrefix(row, factories), components: null, terminal: null }
    : runLabelsRow(row, { factories, components: new ComponentsProcessor(), createInteractiveVisitor });
}

function stopDiffs(row: PipelineStopRow): ReturnType<typeof compareLabels> {
  const result = stepsResult(row);
  const actual: LabelsExpected = labelsDump(result, row.expected as unknown as LabelsExpected);
  const diffs = compareLabels(actual, row.expected as unknown as LabelsExpected);
  if (row.expected.dump !== undefined) {
    const dump = dumpWithPropertyValues(result.graph);
    diffs.push(...compareRoutingFullDump({ ...actual, dump } as never, row.expected));
  }
  return diffs;
}

/** G4's twin: `EndLabelPostprocessor` sees each node's `END_LABELS` map rebuilt in reverse order; the patch is restored. */
function withReversedEndLabels<T>(body: () => T): T {
  const original = EndLabelPostprocessor.prototype.process;
  EndLabelPostprocessor.prototype.process = function (
    this: EndLabelPostprocessor,
    graph: LGraph,
    monitor: IElkProgressMonitor,
  ) {
    for (const layer of graph.getLayers()) {
      for (const node of layer.getNodes()) {
        if (node.hasProperty(InternalProperties.END_LABELS)) {
          const entries = [...node.getProperty(InternalProperties.END_LABELS).entries()].reverse();
          node.setProperty(InternalProperties.END_LABELS, new Map<LPort, LabelCell>(entries));
        }
      }
    }
    original.call(this, graph, monitor);
  };
  try {
    return body();
  } finally {
    EndLabelPostprocessor.prototype.process = original;
  }
}

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('layered-labels rows', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded row counts per group', () => {
    expect(header.rowCounts).toEqual({ full: 399, models: 640, scenarios: 224, sites: 42 });
    for (const group of LABELS_ROW_GROUPS) {
      expect(rowsByGroup(group).length).toBe(header.rowCounts[group]);
    }
  });

  it('names no 7g or 7h member in any prefix or plan', () => {
    const named = rows.filter((row: PipelineRow) =>
      LATER_MISSIONS.some((name) => JSON.stringify(row).includes(`"${name}"`)),
    );
    expect(named.map((row) => row.id)).toEqual([]);
  });

  it('records the seven logged rows as whole recordings', () => {
    const logged = rows.filter((row) => isFullRow(row) && row.id.startsWith('full/logged/'));
    expect(logged).toHaveLength(3);
  });
});

describe('full rows', () => {
  for (const row of rowsByGroup('full').filter(isFullRow)) {
    it(row.id, () => {
      expect(formatDiffs(compareLabelsFullRow(runLabelsFullRow(row, { createInteractiveVisitor }), row) as never)).toBe(
        '',
      );
    });
  }
});

describe('models rows', () => {
  for (const row of rowsByGroup('models').filter(isStopRow)) {
    it(row.id, () => {
      expect(stopDiffs(row)).toEqual([]);
    });
  }
});

describe('scenarios rows', () => {
  for (const row of rowsByGroup('scenarios').filter(isStopRow)) {
    it(row.id, () => {
      expect(stopDiffs(row)).toEqual([]);
    });
  }
});

// T16's step rows for the branches the replay above leaves unreached (unreached.md), same interpreter as `scenarios`.
describe('sites rows', () => {
  for (const row of rowsByGroup('sites').filter(isStopRow)) {
    it(row.id, () => {
      expect(stopDiffs(row)).toEqual([]);
    });
  }
});

describe('FX2 parallel end labels in reverse END_LABELS order (G4 twin)', () => {
  const fullRows = rows.filter(isFullRow).filter((row) => FX2_FULL.test(row.id));
  const scenario = rows.filter(isStopRow).find((row) => row.id === FX2_SCENARIO);

  it('finds the 5 FX2 full rows and the FX2 logging scenario', () => {
    expect(fullRows.map((row) => row.id)).toHaveLength(5);
    expect(scenario?.id).toBe(FX2_SCENARIO);
  });

  for (const row of fullRows) {
    it(`${row.id} equals the oracle in both orders`, () => {
      expect(formatDiffs(compareLabelsFullRow(runLabelsFullRow(row), row) as never)).toBe('');
      const reversed = withReversedEndLabels(() => runLabelsFullRow(row));
      expect(formatDiffs(compareLabelsFullRow(reversed, row) as never)).toBe('');
    });
  }

  it(`${FX2_SCENARIO} equals the oracle in both orders`, () => {
    expect(stopDiffs(scenario!)).toEqual([]);
    expect(withReversedEndLabels(() => stopDiffs(scenario!))).toEqual([]);
  });
});
