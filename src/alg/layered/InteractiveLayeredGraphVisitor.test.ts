// SPDX-License-Identifier: EPL-2.0
// Proof of InteractiveLayeredGraphVisitor (mission 7f2, T10): the `interactive` oracle rows (G5's two-run protocol: lay out,
// apply the visitor, lay out again) of `layered-labels.json`, replayed through T2's `interactive` op and runners; the Java's
// quirks (per-child coordinate runs, `endsWith` on the algorithm id, no default arm); a verbatim recursive twin of
// `shiftOtherNodes` against the explicit stack. Expectations come only from the rows, the twin and the spec's own literals
// (L4, AD-13); numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../test/helpers/layered-labels-replay-dump.js';
import { compareLabelsFullRow, runLabelsFullRow } from '../../../test/helpers/layered-labels-replay-full.js';
import { runLabelsRow } from '../../../test/helpers/layered-labels-replay-ops.js';
import { isFullRow, loadLabelsRows, rowsByClass } from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import {
  InteractiveLayeredGraphVisitor,
  LAST_LAYER_INDEX,
  PSEUDO_POSITION_SPACING,
} from './InteractiveLayeredGraphVisitor.js';
import { setCoordinatesOrthogonalToLayoutDirection } from './InteractiveLayeredGraphVisitorPositions.js';
import { collectEdges, connectedNode, shiftOtherNodes } from './InteractiveLayeredGraphVisitorLayers.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayerConstraint } from './options/LayerConstraint.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

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

const SCENARIOS = 'scenarios/Layout/interactive';
const FULL = 'full/interactive/';
const scenarioRows = rowsByClass(SCENARIOS).filter(isStopRow);
const fullRows = loadLabelsRows().filter((row) => row.id.startsWith(FULL) && isFullRow(row));

describe('InteractiveLayeredGraphVisitor (oracle rows)', () => {
  it('finds the 28 scenario rows (14 variants x RIGHT, DOWN) and the 56 full rows (14 variants x 4 directions)', () => {
    expect(scenarioRows.length).toBe(28);
    expect(fullRows.length).toBe(56);
  });

  for (const row of scenarioRows) {
    it(`replays ${row.id}`, () => {
      const result = runLabelsRow(row, { factories, components: new ComponentsProcessor(), createInteractiveVisitor });
      expect(compareLabels(labelsDump(result, row.expected), row.expected)).toEqual([]);
    });
  }

  for (const row of fullRows) {
    it(`replays ${row.id}`, () => {
      if (!isFullRow(row)) {
        throw new Error(`${row.id} is not a full row`);
      }
      const result = runLabelsFullRow(row, { createInteractiveVisitor });
      expect(compareLabelsFullRow(result, row)).toEqual([]);
    });
  }
});

/** A root of `count` children, `n0..`, with the algorithm option as given (unset: the default `null`). */
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

describe('InteractiveLayeredGraphVisitor (quirks of the Java)', () => {
  it('exports Integer.MAX_VALUE for both constants (Java :69, :77)', () => {
    expect(PSEUDO_POSITION_SPACING).toBe(2147483647);
    expect(LAST_LAYER_INDEX).toBe(2147483647);
    expect(InteractiveLayeredGraphVisitor.PSEUDO_POSITION_SPACING).toBe(PSEUDO_POSITION_SPACING);
    expect(InteractiveLayeredGraphVisitor.LAST_LAYER_INDEX).toBe(LAST_LAYER_INDEX);
  });

  it('translates layerConstraint LAST without a choice constraint to Integer.MAX_VALUE and resets the constraint', () => {
    const root = graphOf(2, null);
    const last = root.getChildren().get(0);
    last.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST);
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(last.getProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT)).toBe(LAST_LAYER_INDEX);
    expect(last.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.NONE);
  });

  it('runs setCoordinates and setInteractiveStrategies once per child (Java :120-121 sit inside the loop)', () => {
    const root = graphOf(3, null);
    const coordinates = vi.spyOn(InteractiveLayeredGraphVisitor.prototype as never, 'setCoordinates');
    const strategies = vi.spyOn(InteractiveLayeredGraphVisitor.prototype as never, 'setInteractiveStrategies');
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(coordinates).toHaveBeenCalledTimes(3);
    expect(strategies).toHaveBeenCalledTimes(3);
    vi.restoreAllMocks();
  });

  it('accepts an algorithm id the layered id ends with (endsWith, not equality: Java :100)', () => {
    const root = graphOf(1, 'layered');
    new InteractiveLayeredGraphVisitor().visit(root);
    expect(root.getProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(LayeringStrategy.INTERACTIVE);
  });

  it('leaves a graph of another algorithm, an empty graph and a non-root element alone', () => {
    const other = graphOf(1, 'org.eclipse.elk.force');
    const empty = graphOf(0, null);
    const port = ElkGraphUtil.createPort(graphOf(1, null).getChildren().get(0));
    const visitor = new InteractiveLayeredGraphVisitor();
    visitor.visit(other);
    visitor.visit(empty);
    visitor.visit(port);
    expect(other.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(false);
    expect(empty.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(false);
    expect(port.hasProperty(LayeredOptions.LAYERING_STRATEGY)).toBe(false);
  });

  it('throws the Java IndexOutOfBoundsException of nodesWithoutC.get(0) on an empty layer (Java :650, :658)', () => {
    expect(() => {
      setCoordinatesOrthogonalToLayoutDirection([], 0, Direction.RIGHT);
    }).toThrow(IndexOutOfBoundsException);
    expect(() => {
      setCoordinatesOrthogonalToLayoutDirection([], 0, Direction.DOWN);
    }).toThrow(IndexOutOfBoundsException);
  });
});

/** The Java recursion of `shiftOtherNodes` (`:363-422`), verbatim, over the same edge helpers: the twin of the explicit stack. */
function shiftOtherNodesRecursive(movedNode: ElkNode, layer: number, layerNodes: ElkNode[][], incoming: boolean): void {
  const nodesOfLayer = layerNodes[layer] as ElkNode[];
  const edges = collectEdges(movedNode, incoming);
  for (const edge of edges) {
    const node = connectedNode(edge, incoming);
    if (node !== null && nodesOfLayer.includes(node)) {
      nodesOfLayer.splice(nodesOfLayer.indexOf(node), 1);
      node.setProperty(LayeredOptions.LAYERING_LAYER_ID, layer + 1);
      if (layer + 1 < layerNodes.length) {
        (layerNodes[layer + 1] as ElkNode[]).push(node);
        shiftOtherNodesRecursive(node, layer + 1, layerNodes, false);
        shiftOtherNodesRecursive(node, layer + 1, layerNodes, true);
      } else {
        layerNodes.push([node]);
      }
    }
  }
}

/** A chain a0 -> a1 -> ... -> a(n) with a0 and a1 in layer 0 and a(k+1) in layer k: the shift cascades n layers deep. */
function chainOf(length: number): { readonly nodes: ElkNode[]; readonly layers: ElkNode[][] } {
  const root = graphOf(length + 1, null);
  const nodes = root.getChildren().toArray();
  for (let i = 0; i < length; i++) {
    ElkGraphUtil.createSimpleEdge(nodes[i] as ElkNode, nodes[i + 1] as ElkNode);
  }
  const layers: ElkNode[][] = [[nodes[0] as ElkNode, nodes[1] as ElkNode]];
  for (let k = 2; k <= length; k++) {
    layers.push([nodes[k] as ElkNode]);
  }
  return { nodes, layers };
}

const snapshot = (nodes: readonly ElkNode[], layers: readonly (readonly ElkNode[])[]): unknown => ({
  ids: nodes.map((node) => node.getProperty(LayeredOptions.LAYERING_LAYER_ID)),
  layers: layers.map((layer) => layer.map((node) => node.getIdentifier())),
});

describe('shiftOtherNodes (explicit stack against the verbatim recursion)', () => {
  const DEPTH = 600;

  it.each([8, DEPTH])('equals the recursive twin on a chain of %d layers', { timeout: 60_000 }, (length) => {
    const explicit = chainOf(length);
    const recursive = chainOf(length);
    shiftOtherNodes(explicit.nodes[0] as ElkNode, 0, explicit.layers, false);
    shiftOtherNodesRecursive(recursive.nodes[0] as ElkNode, 0, recursive.layers, false);
    expect(snapshot(explicit.nodes, explicit.layers)).toEqual(snapshot(recursive.nodes, recursive.layers));
    expect(explicit.layers.length).toBeGreaterThan(length - 1);
  });
});
