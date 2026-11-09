// SPDX-License-Identifier: EPL-2.0
// Anchored cases of InteractiveLayeredGraphVisitor (mission 7f2, T17b): the `sites/InteractiveLayeredGraphVisitor/*` rows
// of `layered-labels.json` (plans/layered-labels/unreached.md, Sc2-Sc8), replayed through T2's `interactive` op (G5's
// two-run protocol) with the real enums. Most site rows leave the node positions as in the first layout; what tells the
// arms apart is the recorded second export, so each case asserts per node the position, `layering.layerId`,
// `crossingMinimization.positionId` and the two choice constraints the visitor writes, with literals copied from the
// row's `layout` (`// oracle: <row id>; <Java file:line>`), then the whole row against the oracle. L4: no hand-derived
// values; numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../test/helpers/layered-labels-replay-dump.js';
import { compareLabelsFullRow, runLabelsFullRow } from '../../../test/helpers/layered-labels-replay-full.js';
import { runLabelsRow } from '../../../test/helpers/layered-labels-replay-ops.js';
import { isFullRow, loadLabelsRows } from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { InteractiveLayeredGraphVisitor } from './InteractiveLayeredGraphVisitor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

const SITE_PREFIX = 'sites/InteractiveLayeredGraphVisitor/';
const AD4_DIGITS = 6;
const LAYER_ID = 'layering.layerId';
const POSITION_ID = 'crossingMinimization.positionId';
const LAYER_CHOICE = 'layering.layerChoiceConstraint';
const POSITION_CHOICE = 'crossingMinimization.positionChoiceConstraint';

/** One node of a recorded second export: id, x, y, layerId, positionId, layer choice and position choice (null: unset). */
type Entry = readonly [
  id: string,
  x: number,
  y: number,
  layerId: number,
  positionId: number,
  layerChoice: number | null,
  positionChoice: number | null,
];
type RowCase = readonly [id: string, nodes: readonly Entry[]];

const SITE_ROWS: readonly RowCase[] = [
  // oracle: sites/InteractiveLayeredGraphVisitor/layerChoice/minusOne; InteractiveLayeredGraphVisitor.java:341 (prepended layer)
  [
    'layerChoice/minusOne',
    [
      ['a', 62, 38, 1, 0, null, null],
      ['b', 112, 38, 2, 0, null, null],
      ['c', 162, 17, 3, 0, null, null],
      ['d', 12, 12, 0, 0, -1, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/layerChoice/all; InteractiveLayeredGraphVisitor.java:459 (empty initial layering)
  [
    'layerChoice/all',
    [
      ['a', 12, 12, 0, 0, 0, null],
      ['b', 112, 17, 2, 0, 1, null],
      ['c', 62, 62, 1, 0, 1, null],
      ['d', 112, 67, 2, 1, 2, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/layerRelative/succ; InteractiveLayeredGraphVisitor.java:213,217,271-275
  [
    'layerRelative/succ',
    [
      ['a', 12, 12, 0, 0, 1, null],
      ['b', 62, 12, 0, 0, 1, null],
      ['c', 12, 62, 0, 0, null, null],
      ['d', 62, 62, 0, 0, null, null],
      ['x', 12, 112, 0, 0, null, null],
      ['y', 62, 112, 1, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/layerRelative/targetRelative; InteractiveLayeredGraphVisitor.java:228,292-298
  [
    'layerRelative/targetRelative',
    [
      ['a', 12, 12, 0, 0, 1, null],
      ['b', 62, 12, 0, 0, 1, null],
      ['c', 12, 62, 0, 0, 1, null],
      ['d', 62, 62, 0, 0, null, null],
      ['x', 12, 112, 0, 0, null, null],
      ['y', 62, 112, 1, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/layerRelative/referencedChoice; InteractiveLayeredGraphVisitor.java:217,271-275
  [
    'layerRelative/referencedChoice',
    [
      ['a', 12, 12, 0, 0, null, null],
      ['b', 62, 12, 0, 0, 1, null],
      ['c', 12, 62, 0, 0, null, null],
      ['d', 62, 62, 0, 0, null, null],
      ['x', 12, 112, 0, 0, null, null],
      ['y', 62, 112, 1, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/shift/existingLayer; InteractiveLayeredGraphVisitor.java:394,400,411-416
  [
    'shift/existingLayer',
    [
      ['a', 12, 12, 0, 0, 0, null],
      ['b', 62, 12, 1, 0, null, null],
      ['c', 112, 12, 2, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/shift/ports; InteractiveLayeredGraphVisitor.java:373,383,396,402
  [
    'shift/ports',
    [
      ['a', 12, 12, 0, 0, 0, null],
      ['b', 70, 12, 1, 0, null, null],
      ['c', 128, 12, 2, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/positionRelative/pred; InteractiveLayeredGraphVisitor.java:687-717 (:711 else arm)
  [
    'positionRelative/pred',
    [
      ['a', 12, 12, 0, 0, null, 0],
      ['b', 62, 12, 0, 0, null, 1],
      ['c', 12, 62, 0, 0, null, 0],
      ['d', 62, 62, 0, 0, null, null],
      ['e', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/positionRelative/succ; InteractiveLayeredGraphVisitor.java:687-717 (:709 else arm)
  [
    'positionRelative/succ',
    [
      ['a', 12, 12, 0, 0, null, 2],
      ['b', 62, 12, 0, 0, null, 1],
      ['c', 12, 62, 0, 0, null, null],
      ['d', 62, 62, 0, 0, null, null],
      ['e', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/positionRelative/bothTargetChoice; InteractiveLayeredGraphVisitor.java:560-581 (:566)
  [
    'positionRelative/bothTargetChoice',
    [
      ['x', 12, 12, 0, 0, null, 1],
      ['y', 62, 12, 0, 0, null, 2],
      ['z', 12, 62, 0, 0, null, 0],
      ['v', 62, 62, 0, 0, null, null],
      ['w', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/positionRelative/bothTargetPred; InteractiveLayeredGraphVisitor.java:560-581 (:573 else arm)
  [
    'positionRelative/bothTargetPred',
    [
      ['x', 12, 12, 0, 0, null, null],
      ['y', 62, 12, 0, 0, null, null],
      ['z', 12, 62, 0, 0, null, null],
      ['w', 62, 62, 0, 0, null, null],
      ['v', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/positionRelative/oneTargetChoice; InteractiveLayeredGraphVisitor.java:607-621
  [
    'positionRelative/oneTargetChoice',
    [
      ['a', 12, 12, 0, 0, null, 0],
      ['b', 62, 12, 0, 0, null, 1],
      ['c', 12, 62, 0, 0, null, 3],
      ['d', 62, 62, 0, 0, null, 2],
      ['e', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/circle/pred; InteractiveLayeredGraphVisitor.java:786-820
  [
    'circle/pred',
    [
      ['a', 12, 12, 0, 0, null, null],
      ['b', 62, 12, 0, 0, null, null],
      ['c', 12, 62, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/circle/succ; InteractiveLayeredGraphVisitor.java:786-820
  [
    'circle/succ',
    [
      ['a', 12, 12, 0, 0, null, null],
      ['b', 62, 12, 0, 0, null, null],
      ['c', 12, 62, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/swap/unrelated; InteractiveLayeredGraphVisitor.java:730-764
  [
    'swap/unrelated',
    [
      ['s', 12, 12, 0, 0, null, 1],
      ['a', 62, 12, 0, 0, null, null],
      ['b', 12, 62, 0, 0, null, null],
      ['c', 62, 62, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/swap/chain; InteractiveLayeredGraphVisitor.java:736,752,898-925
  [
    'swap/chain',
    [
      ['s', 12, 12, 0, 0, null, 1],
      ['r', 62, 12, 0, 0, null, null],
      ['u0', 12, 62, 0, 0, null, null],
      ['u1', 62, 62, 0, 0, null, null],
      ['u2', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/swap/chainAtEnd; InteractiveLayeredGraphVisitor.java:748
  [
    'swap/chainAtEnd',
    [
      ['s', 12, 12, 0, 0, null, 1],
      ['r', 62, 12, 0, 0, null, null],
      ['u0', 12, 62, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/swap/backward; InteractiveLayeredGraphVisitor.java:898-925
  [
    'swap/backward',
    [
      ['s', 12, 12, 0, 0, null, 2],
      ['x', 62, 12, 0, 0, null, null],
      ['y', 12, 62, 0, 0, null, null],
      ['z', 62, 62, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/swap/longChain; InteractiveLayeredGraphVisitor.java:754
  [
    'swap/longChain',
    [
      ['s', 12, 12, 0, 0, null, 1],
      ['r', 62, 12, 0, 0, null, null],
      ['u0', 12, 62, 0, 0, null, null],
      ['v', 62, 62, 0, 0, null, null],
      ['w', 12, 112, 0, 0, null, null],
    ],
  ],
  // oracle: sites/InteractiveLayeredGraphVisitor/undefinedDirection; InteractiveLayeredGraphVisitor.java:484,647,846
  [
    'undefinedDirection',
    [
      ['a', 12, 62, 0, 1, null, null],
      ['b', 12, 12, 0, 0, null, null],
      ['c', 62, 17, 1, 0, null, null],
    ],
  ],
];

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        expect(phase).toBe('P5_EDGE_ROUTING');
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};
const createInteractiveVisitor = (): InteractiveLayeredGraphVisitor => new InteractiveLayeredGraphVisitor();

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

interface ExportedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly layoutOptions?: Readonly<Record<string, string>>;
}

/** Replays the row (stop rows through the step interpreter, full rows through the recursive engine) and returns its second export. */
function replay(id: string): { children: readonly ExportedNode[]; diffs: unknown[] } {
  const row = loadLabelsRows().find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  if (isFullRow(row)) {
    const result = runLabelsFullRow(row, { createInteractiveVisitor });
    return {
      children: (result.layout as { children: ExportedNode[] }).children,
      diffs: compareLabelsFullRow(result, row),
    };
  }
  if (!isStopRow(row)) {
    throw new Error(`row ${id} is neither a stop nor a full row`);
  }
  const result = runLabelsRow(row, { factories, components: new ComponentsProcessor(), createInteractiveVisitor });
  const diffs = compareLabels(labelsDump(result, row.expected), row.expected);
  return { children: (result.layout as { children: ExportedNode[] }).children, diffs };
}

const optionOf = (node: ExportedNode, key: string): number | null => {
  const value = node.layoutOptions?.[key];
  return value === undefined ? null : Number(value);
};

/** The recorded fields of an exported node, in `Entry` order, positions rounded to AD-4's digits. */
const entryOf = (node: ExportedNode): Entry => [
  node.id,
  Number(node.x.toFixed(AD4_DIGITS)),
  Number(node.y.toFixed(AD4_DIGITS)),
  optionOf(node, LAYER_ID) as number,
  optionOf(node, POSITION_ID) as number,
  optionOf(node, LAYER_CHOICE),
  optionOf(node, POSITION_CHOICE),
];
const roundedEntry = (entry: Entry): Entry => [
  entry[0],
  Number(entry[1].toFixed(AD4_DIGITS)),
  Number(entry[2].toFixed(AD4_DIGITS)),
  entry[3],
  entry[4],
  entry[5],
  entry[6],
];

function expectRow(id: string, nodes: readonly Entry[]): void {
  const { children, diffs } = replay(id);
  expect(children.map(entryOf)).toEqual(nodes.map(roundedEntry));
  expect(diffs).toEqual([]);
}

describe('InteractiveLayeredGraphVisitor, site rows (Sc2-Sc8)', () => {
  it.each(SITE_ROWS)('%s', (name, nodes) => {
    expectRow(`${SITE_PREFIX}${name}`, nodes);
  });
});
