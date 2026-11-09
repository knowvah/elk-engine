// SPDX-License-Identifier: EPL-2.0
/*
 * Port of AlternatingLayerUnzipperTest (mission 7f2, T13b): the general n-way alternating layer unzipper. Twelve `@Test`s
 * (12 oracle runs), each laying a hand-built 30x30-node graph out through `LayeredLayoutProvider` and asserting the
 * left-to-right order of node x coordinates. The graphs and the Java's `assertTrue(a.getX() < b.getX())` pairs are the
 * data table below, in the Java's order. The `(non-vacuity)` case lays every graph out
 * once more with `LayerUnzippingStrategy.NONE` and requires the alternating layout to use more distinct x coordinates.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/AlternatingLayerUnzipperTest.java
 */
import { describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredLayoutProvider } from '../LayeredLayoutProvider.js';
import { LayerUnzippingStrategy } from '../options/LayerUnzippingStrategy.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';

const NODE_SIZE = 30;

/** An `ElkGraphUtil.createSimpleEdge(source, target)` call by node variable name. */
type EdgeSpec = readonly [string, string];
/** An `assertTrue(left.getX() < right.getX())` by node variable name. */
type OrderSpec = readonly [string, string];

interface UnzipperCase {
  /** The Java method's name. */
  readonly name: string;
  /** The node variables, in creation order. */
  readonly nodes: readonly string[];
  readonly edges: readonly EdgeSpec[];
  /** `node.setProperty(LAYER_UNZIPPING_LAYER_SPLIT, split)`. */
  readonly splits: readonly (readonly [string, number])[];
  /** `node.setProperty(LAYER_UNZIPPING_RESET_ON_LONG_EDGES, reset)`, when the Java sets it. */
  readonly reset?: readonly [string, boolean];
  readonly expected: readonly OrderSpec[];
}

interface BuiltGraph {
  readonly graph: ElkNode;
  readonly byName: ReadonlyMap<string, ElkNode>;
}

const repeat = (edge: EdgeSpec, times: number): EdgeSpec[] => Array.from({ length: times }, () => edge);

/**
 * The graph of one Java method; `strategy` is `ALTERNATING` as in the Java (the non-vacuity check passes `NONE`).
 */
function buildGraph(spec: UnzipperCase, strategy: LayerUnzippingStrategy): BuiltGraph {
  const graph = ElkGraphUtil.createGraph();
  const byName = new Map<string, ElkNode>();
  for (const name of spec.nodes) {
    const node = ElkGraphUtil.createNode(graph);
    node.setWidth(NODE_SIZE);
    node.setHeight(NODE_SIZE);
    byName.set(name, node);
  }
  for (const [source, target] of spec.edges) {
    ElkGraphUtil.createSimpleEdge(byName.get(source)!, byName.get(target)!);
  }

  graph.setProperty(LayeredOptions.LAYER_UNZIPPING_STRATEGY, strategy);
  graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_EDGES);
  for (const [name, split] of spec.splits) {
    byName.get(name)!.setProperty(LayeredOptions.LAYER_UNZIPPING_LAYER_SPLIT, split);
  }
  if (spec.reset !== undefined) {
    byName.get(spec.reset[0])!.setProperty(LayeredOptions.LAYER_UNZIPPING_RESET_ON_LONG_EDGES, spec.reset[1]);
  }
  return { graph, byName };
}

const N4 = ['node1', 'node2', 'node3', 'node4'] as const;
const N5 = [...N4, 'node5'] as const;
const N7 = [...N5, 'node6', 'node7'] as const;
const LAYER_PAIR_NODES = [...N4, 'node21', 'node22', 'node23'] as const;
const LAYER_PAIR_EDGES: readonly EdgeSpec[] = [
  ['node1', 'node21'],
  ['node2', 'node21'],
  ['node2', 'node22'],
  ['node3', 'node21'],
  ['node3', 'node22'],
  ['node4', 'node22'],
  ['node4', 'node23'],
];

const ALTERNATING_LAYER_UNZIPPER_CASES: readonly UnzipperCase[] = [
  {
    name: 'simpleTwoSplit',
    nodes: [...N4, 'nodeFinal'],
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      ['node1', 'node4'],
      ['node2', 'nodeFinal'],
      ['node3', 'nodeFinal'],
      ['node4', 'nodeFinal'],
    ],
    splits: [['node2', 2]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node4', 'node3'],
      ['node3', 'nodeFinal'],
    ],
  },
  {
    name: 'simpleThreeSplit',
    nodes: [...N5, 'nodeFinal'],
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      ['node1', 'node4'],
      ['node1', 'node5'],
      ['node2', 'nodeFinal'],
      ['node3', 'nodeFinal'],
      ['node4', 'nodeFinal'],
      ['node5', 'nodeFinal'],
    ],
    splits: [['node2', 3]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node5'],
      ['node2', 'node3'],
      ['node3', 'node4'],
      ['node5', 'node4'],
      ['node4', 'nodeFinal'],
    ],
  },
  {
    name: 'danglingOutgoing',
    nodes: N5,
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      ['node1', 'node4'],
      ['node1', 'node5'],
    ],
    splits: [['node2', 2]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node2', 'node5'],
      ['node4', 'node3'],
      ['node4', 'node5'],
    ],
  },
  {
    name: 'danglingIncoming',
    nodes: [...N5, 'nodeFinal'],
    edges: [
      ['node1', 'nodeFinal'],
      ['node2', 'nodeFinal'],
      ['node3', 'nodeFinal'],
      ['node4', 'nodeFinal'],
      ['node5', 'nodeFinal'],
    ],
    splits: [['node2', 2]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node3', 'node2'],
      ['node3', 'node4'],
      ['node5', 'node2'],
      ['node5', 'node4'],
      ['node2', 'nodeFinal'],
      ['node4', 'nodeFinal'],
    ],
  },
  {
    name: 'multipleLayersSplit',
    nodes: LAYER_PAIR_NODES,
    edges: LAYER_PAIR_EDGES,
    splits: [
      ['node1', 2],
      ['node21', 2],
    ],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node3', 'node2'],
      ['node3', 'node4'],
      ['node2', 'node21'],
      ['node2', 'node23'],
      ['node4', 'node21'],
      ['node4', 'node23'],
      ['node21', 'node22'],
      ['node23', 'node22'],
    ],
  },
  {
    name: 'multipleIncomingEdges',
    nodes: [...N4, 'nodeFinal'],
    edges: [
      ...repeat(['node1', 'node2'], 5),
      ...repeat(['node1', 'node3'], 4),
      ['node1', 'node4'],
      ['node2', 'nodeFinal'],
      ['node3', 'nodeFinal'],
      ['node4', 'nodeFinal'],
    ],
    splits: [['node2', 2]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node4', 'node3'],
      ['node3', 'nodeFinal'],
    ],
  },
  {
    name: 'multipleOutgoingEdges',
    nodes: [...N4, 'nodeFinal'],
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      ['node1', 'node4'],
      ...repeat(['node2', 'nodeFinal'], 4),
      ['node3', 'nodeFinal'],
      ...repeat(['node4', 'nodeFinal'], 4),
    ],
    splits: [['node2', 2]],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node4', 'node3'],
      ['node3', 'nodeFinal'],
    ],
  },
  {
    name: 'mixedDanglingIncoming',
    nodes: N7,
    edges: [
      ['node1', 'node3'],
      ['node1', 'node4'],
      ['node2', 'node5'],
      ['node3', 'node5'],
      ['node3', 'node6'],
      ['node4', 'node7'],
    ],
    splits: [
      ['node2', 2],
      ['node5', 2],
    ],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node4', 'node3'],
      ['node3', 'node5'],
      ['node3', 'node7'],
      ['node5', 'node6'],
      ['node7', 'node6'],
    ],
  },
  {
    name: 'mixedDanglingOutgoing',
    nodes: N7,
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      ['node1', 'node4'],
      ['node3', 'node5'],
      ['node3', 'node6'],
      ['node4', 'node7'],
    ],
    splits: [
      ['node2', 2],
      ['node5', 2],
    ],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node4', 'node3'],
      ['node3', 'node5'],
      ['node3', 'node7'],
      ['node5', 'node6'],
      ['node7', 'node6'],
    ],
  },
  {
    name: 'mixedTwoThreeLayerSplit',
    nodes: LAYER_PAIR_NODES,
    edges: LAYER_PAIR_EDGES,
    splits: [
      ['node1', 3],
      ['node21', 2],
    ],
    expected: [
      ['node1', 'node2'],
      ['node2', 'node3'],
      ['node4', 'node2'],
      ['node3', 'node21'],
      ['node3', 'node23'],
      ['node21', 'node22'],
      ['node23', 'node22'],
    ],
  },
  {
    name: 'resetOnLongEdges',
    nodes: N5,
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      // long edge
      ['node1', 'node5'],
      ['node1', 'node4'],
      ['node4', 'node5'],
    ],
    splits: [['node2', 2]],
    reset: ['node2', true],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node4'],
      ['node2', 'node3'],
      ['node3', 'node5'],
      ['node4', 'node3'],
    ],
  },
  {
    name: 'noResetOnLongEdges',
    nodes: [...N5, 'node6'],
    edges: [
      ['node1', 'node2'],
      ['node1', 'node3'],
      // long edge
      ['node1', 'node5'],
      ['node1', 'node4'],
      ['node4', 'node5'],
      ['node1', 'node6'],
    ],
    splits: [['node2', 2]],
    reset: ['node2', false],
    expected: [
      ['node1', 'node2'],
      ['node1', 'node6'],
      ['node2', 'node3'],
      ['node2', 'node4'],
      ['node3', 'node5'],
      ['node4', 'node5'],
      ['node6', 'node3'],
      ['node6', 'node4'],
    ],
  },
];

/** `new LayeredLayoutProvider().layout(graph, new NullElkProgressMonitor())` on the graph of one Java method. */
function laidOut(spec: UnzipperCase, strategy: LayerUnzippingStrategy): BuiltGraph {
  const built = buildGraph(spec, strategy);
  registerLayered();
  new LayeredLayoutProvider().layout(built.graph, new NullElkProgressMonitor());
  return built;
}

function distinctXs(built: BuiltGraph): number {
  return new Set([...built.byName.values()].map((node) => node.getX())).size;
}

describe('AlternatingLayerUnzipperTest', () => {
  for (const spec of ALTERNATING_LAYER_UNZIPPER_CASES) {
    it(spec.name, () => {
      const { byName } = laidOut(spec, LayerUnzippingStrategy.ALTERNATING);
      for (const [left, right] of spec.expected) {
        expect(byName.get(left)!.getX() < byName.get(right)!.getX(), `${left} < ${right}`).toBe(true);
      }
    });
  }
});

describe('AlternatingLayerUnzipperTest (non-vacuity)', () => {
  it('(non-vacuity)', () => {
    expect(ALTERNATING_LAYER_UNZIPPER_CASES.length).toBe(12);
    for (const spec of ALTERNATING_LAYER_UNZIPPER_CASES) {
      const zipped = distinctXs(laidOut(spec, LayerUnzippingStrategy.NONE));
      const unzipped = distinctXs(laidOut(spec, LayerUnzippingStrategy.ALTERNATING));
      // at least one layer was split: unzipping adds layers, so the nodes spread over more x coordinates
      expect(unzipped, spec.name).toBeGreaterThan(zipped);
    }
  });
});
