// SPDX-License-Identifier: EPL-2.0
// Anchored cases of InteractiveLayeredGraphVisitor (mission 7f2, T17b): the LayerConstraint arms (`:105-117`) and the
// Direction arms (`:484-508`) of the `interactive` rows of `layered-labels.json`, replayed through T2's `interactive` op
// (G5's two-run protocol) with the real enums, and the structural J cases of plans/layered-labels/unreached.md. Each row
// case asserts per node the position, `layering.layerId`, `crossingMinimization.positionId` and the two choice constraints
// the visitor writes, with literals copied from the row's `layout` (`// oracle: <row id>; <Java file:line>`), then the
// whole row against the oracle. The J cases follow the Java source. L4: no hand-derived values; numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../test/helpers/layered-labels-replay-dump.js';
import { compareLabelsFullRow, runLabelsFullRow } from '../../../test/helpers/layered-labels-replay-full.js';
import { runLabelsRow } from '../../../test/helpers/layered-labels-replay-ops.js';
import { isFullRow, loadLabelsRows } from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { InteractiveLayeredGraphVisitor } from './InteractiveLayeredGraphVisitor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayerConstraint } from './options/LayerConstraint.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

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

const ARM_ROWS: readonly RowCase[] = [
  // oracle: scenarios/Layout/interactive/layer-first/RIGHT; InteractiveLayeredGraphVisitor.java:108-112 (case FIRST)
  [
    'scenarios/Layout/interactive/layer-first/RIGHT',
    [
      ['n0', 12, 122, 0, 1, null, null],
      ['n1', 92, 112, 1, 2, null, null],
      ['n2', 92, 162, 1, 3, null, null],
      ['n3', 12, 21, 0, 0, 0, null],
      ['n4', 92, 12, 1, 0, null, null],
      ['n5', 92, 62, 1, 1, null, null],
    ],
  ],
  // oracle: scenarios/Layout/interactive/layer-last/RIGHT; InteractiveLayeredGraphVisitor.java:113-117 (case LAST)
  [
    'scenarios/Layout/interactive/layer-last/RIGHT',
    [
      ['n0', 12, 24.5, 0, 0, null, null],
      ['n1', 222, 42, 4, 0, 2147483647, null],
      ['n2', 62, 19.5, 1, 0, null, null],
      ['n3', 112, 19.5, 2, 0, null, null],
      ['n4', 172, 12, 3, 0, null, null],
      ['n5', 172, 63, 3, 1, null, null],
    ],
  ],
  // oracle: scenarios/Layout/interactive/layer-first-separate/RIGHT; InteractiveLayeredGraphVisitor.java:105-107 (no case for FIRST_SEPARATE: reset only)
  [
    'scenarios/Layout/interactive/layer-first-separate/RIGHT',
    [
      ['n0', 62, 43, 1, 0, null, null],
      ['n1', 112, 88, 2, 1, null, null],
      ['n2', 112, 38, 2, 0, null, null],
      ['n3', 162, 38, 3, 0, null, null],
      ['n4', 212, 38, 4, 0, null, null],
      ['n5', 12, 12, 0, 0, null, null],
    ],
  ],
  // oracle: scenarios/Layout/interactive/layer-last-separate/RIGHT; InteractiveLayeredGraphVisitor.java:105-107 (no case for LAST_SEPARATE: reset only)
  [
    'scenarios/Layout/interactive/layer-last-separate/RIGHT',
    [
      ['n0', 12, 24.5, 0, 0, null, null],
      ['n1', 62, 19.5, 1, 0, null, null],
      ['n2', 222, 42, 4, 0, null, null],
      ['n3', 112, 19.5, 2, 0, null, null],
      ['n4', 172, 12, 3, 0, null, null],
      ['n5', 172, 63, 3, 1, null, null],
    ],
  ],
  // oracle: full/interactive/graph6-layer-choice/RIGHT; InteractiveLayeredGraphVisitor.java:484-490 (Direction.RIGHT arm)
  [
    'full/interactive/graph6-layer-choice/RIGHT',
    [
      ['n0', 12, 17, 0, 0, null, null],
      ['n1', 62, 112, 1, 2, null, null],
      ['n2', 62, 12, 1, 0, null, null],
      ['n3', 112, 62, 2, 0, null, null],
      ['n4', 62, 62, 1, 1, 1, null],
      ['n5', 162, 62, 3, 0, null, null],
    ],
  ],
  // oracle: full/interactive/graph6-layer-choice/LEFT; InteractiveLayeredGraphVisitor.java:491-496 (Direction.LEFT arm)
  [
    'full/interactive/graph6-layer-choice/LEFT',
    [
      ['n0', 162, 17, 0, 0, null, null],
      ['n1', 112, 112, 1, 2, null, null],
      ['n2', 112, 12, 1, 0, null, null],
      ['n3', 62, 62, 2, 0, null, null],
      ['n4', 112, 62, 1, 1, 1, null],
      ['n5', 12, 62, 3, 0, null, null],
    ],
  ],
  // oracle: full/interactive/graph6-layer-choice/DOWN; InteractiveLayeredGraphVisitor.java:497-502 (Direction.DOWN arm)
  [
    'full/interactive/graph6-layer-choice/DOWN',
    [
      ['n0', 17, 12, 0, 0, null, null],
      ['n1', 112, 62, 1, 2, null, null],
      ['n2', 12, 62, 1, 0, null, null],
      ['n3', 62, 112, 2, 0, null, null],
      ['n4', 62, 62, 1, 1, 1, null],
      ['n5', 62, 162, 3, 0, null, null],
    ],
  ],
  // oracle: full/interactive/graph6-layer-choice/UP; InteractiveLayeredGraphVisitor.java:503-508 (Direction.UP arm)
  [
    'full/interactive/graph6-layer-choice/UP',
    [
      ['n0', 17, 162, 0, 0, null, null],
      ['n1', 112, 112, 1, 2, null, null],
      ['n2', 12, 112, 1, 0, null, null],
      ['n3', 62, 62, 2, 0, null, null],
      ['n4', 62, 112, 1, 1, 1, null],
      ['n5', 62, 12, 3, 0, null, null],
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

describe('InteractiveLayeredGraphVisitor, LayerConstraint and Direction arms of the interactive rows', () => {
  it.each(ARM_ROWS)('%s', (id, nodes) => {
    expectRow(id, nodes);
  });
});

/** A root of `count` children `n0..` of 30 x 30 with the algorithm option as given. */
function graphOf(count: number, algorithm: string | null): ElkNode {
  const root = ElkGraphUtil.createGraph();
  if (algorithm !== null) {
    root.setProperty(CoreOptions.ALGORITHM, algorithm);
  }
  for (let i = 0; i < count; i++) {
    const node = ElkGraphUtil.createNode(root);
    node.setIdentifier(`n${String(i)}`);
    node.setWidth(30);
    node.setHeight(30);
  }
  return root;
}

describe('InteractiveLayeredGraphVisitor, structural cases (J items)', () => {
  const EXISTING_CHOICE = 3;

  // J: InteractiveLayeredGraphVisitor.java:108-112 (`:109` guard): a FIRST node with a layer choice keeps it
  it('keeps the layerChoiceConstraint of a FIRST node and resets its layerConstraint to NONE', () => {
    const root = graphOf(2, null);
    const first = root.getChildren().get(0);
    first.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST);
    first.setProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT, EXISTING_CHOICE);
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(first.getProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT)).toBe(EXISTING_CHOICE);
    expect(first.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.NONE);
  });

  // J: InteractiveLayeredGraphVisitor.java:113-117 (`:114` guard): a LAST node with a layer choice keeps it
  it('keeps the layerChoiceConstraint of a LAST node and resets its layerConstraint to NONE', () => {
    const root = graphOf(2, null);
    const last = root.getChildren().get(1);
    last.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST);
    last.setProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT, EXISTING_CHOICE);
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(last.getProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT)).toBe(EXISTING_CHOICE);
    expect(last.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.NONE);
  });

  // J: InteractiveLayeredGraphVisitor.java:86 (`instanceof ElkNode`), :98 (`!isEmpty()`)
  it('changes nothing for a port and for a childless root', () => {
    const port = ElkGraphUtil.createPort(graphOf(1, null).getChildren().get(0));
    const empty = graphOf(0, null);
    new InteractiveLayeredGraphVisitor().visit(port);
    new InteractiveLayeredGraphVisitor().visit(empty);
    expect(port.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(false);
    expect(empty.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(false);
  });

  // J: InteractiveLayeredGraphVisitor.java:100 (`ALGORITHM_ID.endsWith(algorithm)`): layered passes, mrtree does not
  it.each([
    ['layered', LayeringStrategy.INTERACTIVE],
    ['org.eclipse.elk.mrtree', null],
  ])('with the algorithm %s the layering strategy becomes %s', (algorithm, strategy) => {
    const root = graphOf(1, algorithm);
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(root.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(strategy !== null);
    if (strategy !== null) {
      expect(root.getProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(strategy);
    }
  });
});
