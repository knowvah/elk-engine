// SPDX-License-Identifier: EPL-2.0
// Proof of BKCompactor.placeBlock (mission 7d, T6, N6). The Java `placeBlock` (`BKCompactor.java:167`) calls itself for
// the root of the neighbouring block (`:208`, one call site inside the loop over the block's nodes); the port is an
// explicit-stack loop. `placeBlockRecursive` below is the Java method verbatim. It replaces the port's method on the
// prototype and both run on every Brandes-Koepf row graph; the coordinates every layout ends with must be equal, and a
// hand-built chain of 5,000 blocks that wait for each other (a recursion 5,000 deep) must place without overflowing and
// to the closed-form positions. Under `--pool=forks --execArgv=--jitless` the twin itself may overflow the interpreter
// stack (as in BasicCycleBreakerTest); the port must not.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { runPlacementPrefix } from '../../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../../test/helpers/layered-placement-replay-rows.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { Layer } from '../../graph/Layer.js';
import { HierarchicalPortDummySizeProcessor } from '../../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { Spacings } from '../../options/Spacings.js';
import { LayerSweepCrossingMinimizer } from '../../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { BKCompactor } from './BKCompactor.js';
import type { BKCompactorClassNode } from './BKCompactorClassNode.js';
import { BKNodePlacer } from './BKNodePlacer.js';
import { NeighborhoodInformation } from './NeighborhoodInformation.js';
import type { ThresholdStrategy } from './ThresholdStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const BRANDES_KOEPF = 'BRANDES_KOEPF';
const EXPECTED_ROW_COUNT = 109;
const DEEP_CHAIN_LENGTH = 5000;
const SHALLOW_CHAIN_LENGTH = 200;
const NODE_HEIGHT = 10;

/** The private state of `BKCompactor` the twin reads (Java: the same-class fields of `this`). */
interface CompactorInternals {
  ni: NeighborhoodInformation;
  spacings: Spacings;
  threshStrategy: ThresholdStrategy;
  layeredGraph: LGraph;
  getOrCreateClassNode(sinkNode: LNode, bal: BKAlignedLayout): BKCompactorClassNode;
}

interface PlaceBlockHolder {
  placeBlock(root: LNode, bal: BKAlignedLayout): void;
}

/** The deepest nesting `placeBlockRecursive` reached, for the test that proves the recursion is real. */
let maxDepth = 0;

/** `BKCompactor.placeBlock` as the Java has it (`BKCompactor.java:167-295`): recursive, with the same statements. */
function placeBlockRecursive(self: BKCompactor, root: LNode, bal: BKAlignedLayout, depth = 1): void {
  const { ni, spacings, threshStrategy, layeredGraph } = self as unknown as CompactorInternals;
  maxDepth = Math.max(maxDepth, depth);
  // Skip if the block was already placed
  if (bal.y[root.id] !== null) {
    return;
  }

  let isInitialAssignment = true;
  bal.y[root.id] = 0.0;

  let currentNode = root;
  let thresh = bal.vdir === VDirection.DOWN ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  do {
    const currentIndexInLayer = ni.nodeIndex![currentNode.id]!;
    const currentLayerSize = currentNode.getLayer()!.getNodes().length;

    if (
      (bal.vdir === VDirection.DOWN && currentIndexInLayer > 0) ||
      (bal.vdir === VDirection.UP && currentIndexInLayer < currentLayerSize - 1)
    ) {
      let neighbor: LNode;
      let neighborRoot: LNode;
      if (bal.vdir === VDirection.UP) {
        neighbor = currentNode.getLayer()!.getNodes()[currentIndexInLayer + 1]!;
      } else {
        neighbor = currentNode.getLayer()!.getNodes()[currentIndexInLayer - 1]!;
      }
      neighborRoot = bal.root[neighbor.id]!;

      // Ensure the neighbor was already placed
      placeBlockRecursive(self, neighborRoot, bal, depth + 1);

      thresh = threshStrategy.calculateThreshold(thresh, root, currentNode);

      if (bal.sink[root.id] === root) {
        bal.sink[root.id] = bal.sink[neighborRoot.id]!;
      }

      if (bal.sink[root.id] === bal.sink[neighborRoot.id]) {
        const spacing = spacings.getVerticalSpacing(currentNode, neighbor);

        if (bal.vdir === VDirection.UP) {
          const currentBlockPosition = bal.y[root.id]!;
          const newPosition =
            bal.y[neighborRoot.id]! +
            bal.innerShift[neighbor.id]! -
            neighbor.getMargin().top -
            spacing -
            currentNode.getMargin().bottom -
            currentNode.getSize().y -
            bal.innerShift[currentNode.id]!;

          if (isInitialAssignment) {
            isInitialAssignment = false;
            bal.y[root.id] = Math.min(newPosition, thresh);
          } else {
            bal.y[root.id] = Math.min(currentBlockPosition, Math.min(newPosition, thresh));
          }
        } else {
          const currentBlockPosition = bal.y[root.id]!;
          const newPosition =
            bal.y[neighborRoot.id]! +
            bal.innerShift[neighbor.id]! +
            neighbor.getSize().y +
            neighbor.getMargin().bottom +
            spacing +
            currentNode.getMargin().top -
            bal.innerShift[currentNode.id]!;

          if (isInitialAssignment) {
            isInitialAssignment = false;
            bal.y[root.id] = Math.max(newPosition, thresh);
          } else {
            bal.y[root.id] = Math.max(currentBlockPosition, Math.max(newPosition, thresh));
          }
        }
      } else {
        const spacing = layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE);

        const sinkNode = (self as unknown as CompactorInternals).getOrCreateClassNode(bal.sink[root.id]!, bal);
        const neighborSink = (self as unknown as CompactorInternals).getOrCreateClassNode(
          bal.sink[neighborRoot.id]!,
          bal,
        );

        if (bal.vdir === VDirection.UP) {
          const requiredSpace =
            bal.y[root.id]! +
            bal.innerShift[currentNode.id]! +
            currentNode.getSize().y +
            currentNode.getMargin().bottom +
            spacing -
            (bal.y[neighborRoot.id]! + bal.innerShift[neighbor.id]! - neighbor.getMargin().top);

          sinkNode.addEdge(neighborSink, requiredSpace);
        } else {
          const requiredSpace =
            bal.y[root.id]! +
            bal.innerShift[currentNode.id]! -
            currentNode.getMargin().top -
            bal.y[neighborRoot.id]! -
            bal.innerShift[neighbor.id]! -
            neighbor.getSize().y -
            neighbor.getMargin().bottom -
            spacing;

          sinkNode.addEdge(neighborSink, requiredSpace);
        }
      }
    } else {
      thresh = threshStrategy.calculateThreshold(thresh, root, currentNode);
    }

    // Get the next node in the block
    currentNode = bal.align[currentNode.id]!;
  } while (currentNode !== root);

  threshStrategy.finishBlock(root);
}

// ---------------------------------------------------------------------------------------------------------------------
// The rows

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      case 'ONE_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
      case 'TWO_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return new BKNodePlacer();
    }
  },
};

function stopsAtBrandesKoepf(row: PlacementRow): boolean {
  if (row.steps === null) {
    return row.prefix?.at(-1) === `P4_NODE_PLACEMENT/${BRANDES_KOEPF}`;
  }
  const last = row.steps.filter(([op]) => op === 'runPhase' || op === 'runProcessor').at(-1);
  return last !== undefined && last[0] === 'runPhase' && last[1] === 'P4_NODE_PLACEMENT' && last[2] === BRANDES_KOEPF;
}

/** What one `horizontalCompaction` leaves in a layout (the arrays are dropped by `cleanup` afterwards). */
interface LayoutSnapshot {
  readonly name: string;
  readonly y: ReadonlyArray<number | null>;
  readonly shift: ReadonlyArray<number | null>;
  readonly sinkIds: ReadonlyArray<number | null>;
}

function snapshotOf(bal: BKAlignedLayout): LayoutSnapshot {
  return {
    name: bal.toString(),
    y: [...bal.y],
    shift: [...bal.shift],
    sinkIds: bal.sink.map((sink) => sink?.id ?? null),
  };
}

/** Replays the row, recording every layout `horizontalCompaction` finished, with `placeBlock` swapped for the twin. */
function layoutsOf(row: PlacementRow, useTwin: boolean): { snapshots: LayoutSnapshot[]; ys: number[] } {
  const snapshots: LayoutSnapshot[] = [];
  const original = BKCompactor.prototype.horizontalCompaction;
  vi.spyOn(BKCompactor.prototype, 'horizontalCompaction').mockImplementation(function (
    this: BKCompactor,
    bal: BKAlignedLayout,
  ) {
    original.call(this, bal);
    snapshots.push(snapshotOf(bal));
  });
  if (useTwin) {
    vi.spyOn(BKCompactor.prototype as unknown as PlaceBlockHolder, 'placeBlock').mockImplementation(function (
      this: BKCompactor,
      root: LNode,
      bal: BKAlignedLayout,
    ) {
      placeBlockRecursive(this, root, bal);
    });
  }
  try {
    const graph = row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
    const ys = graph.getLayers().flatMap((layer) => layer.getNodes().map((node) => node.getPosition().y));
    return { snapshots, ys };
  } finally {
    vi.restoreAllMocks();
  }
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const rows = loadPlacementRows(ROWS_FILE).filter(stopsAtBrandesKoepf);

describe('BKCompactor.placeBlock: explicit-stack loop against the verbatim recursive twin (rows)', () => {
  it('runs over all recorded Brandes-Koepf rows', () => {
    expect(rows).toHaveLength(EXPECTED_ROW_COUNT);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: equal layouts and node positions', (_id, row) => {
    const port = layoutsOf(row, false);
    const twin = layoutsOf(row, true);
    expect(port.snapshots.length).toBeGreaterThan(0);
    expect(twin.snapshots).toEqual(port.snapshots);
    expect(twin.ys).toEqual(port.ys);
  });

  it('the twin nests deeper than one level on some row graph (the stack of the port is exercised)', () => {
    let deepest = 0;
    for (const row of rows) {
      maxDepth = 0;
      layoutsOf(row, true);
      deepest = Math.max(deepest, maxDepth);
    }
    expect(deepest).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The deep chain

interface Chain {
  readonly graph: LGraph;
  readonly bal: BKAlignedLayout;
  readonly ni: NeighborhoodInformation;
  readonly xs: LNode[];
  readonly ys: LNode[];
}

/**
 * Layers 0..n each hold a top node x_i and a bottom node y_i. The blocks are B_i = {x_i, y_(i+1)} for i < n (aligned
 * ring: x_i -> y_(i+1) -> x_i), and every other node is a block of its own. Layers are visited 0..n (RIGHT) and
 * nodes top-down (DOWN), so placing B_0 needs y_1 below x_1, the root of B_1, which waits for B_2, ... : a chain of
 * `n` blocks in which each one is first met before the one it depends on is placed.
 */
function buildChain(n: number): Chain {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.SPACINGS, new Spacings(graph));
  const xs: LNode[] = [];
  const ys: LNode[] = [];
  for (let i = 0; i <= n; i++) {
    const layer = new Layer(graph);
    graph.getLayers().push(layer);
    for (const target of [xs, ys]) {
      const node = new LNode(graph);
      node.setLayer(layer);
      node.getSize().y = NODE_HEIGHT;
      target.push(node);
    }
  }
  const ni = NeighborhoodInformation.buildFor(graph);
  const bal = new BKAlignedLayout(graph, ni.nodeCount, VDirection.DOWN, HDirection.RIGHT);
  for (const node of [...xs, ...ys]) {
    bal.root[node.id] = node;
    bal.align[node.id] = node;
    bal.blockSize[node.id] = NODE_HEIGHT;
  }
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i + 1]!;
    bal.align[x.id] = y;
    bal.root[y.id] = x;
    bal.align[y.id] = x;
  }
  return { graph, bal, ni, xs, ys };
}

function compactChain(chain: Chain, useTwin: boolean): void {
  if (useTwin) {
    vi.spyOn(BKCompactor.prototype as unknown as PlaceBlockHolder, 'placeBlock').mockImplementation(function (
      this: BKCompactor,
      root: LNode,
      bal: BKAlignedLayout,
    ) {
      placeBlockRecursive(this, root, bal);
    });
  }
  try {
    new BKCompactor(chain.graph, chain.ni).horizontalCompaction(chain.bal);
  } finally {
    vi.restoreAllMocks();
  }
}

/** The position of B_i is (n - i) steps, one step being a node height plus the vertical spacing. */
function expectedBlockY(chain: Chain, n: number, i: number): number {
  const step = NODE_HEIGHT + chain.bal.spacings.getVerticalSpacing(chain.xs[0]!, chain.ys[0]!);
  return (n - i) * step;
}

describe('BKCompactor.placeBlock on a chain of waiting blocks (N6)', () => {
  it('the verbatim twin nests as deep as the chain is long', () => {
    maxDepth = 0;
    compactChain(buildChain(SHALLOW_CHAIN_LENGTH), true);
    expect(maxDepth).toBe(SHALLOW_CHAIN_LENGTH + 1);
  });

  it('places a shallow chain equal to the twin', () => {
    const port = buildChain(SHALLOW_CHAIN_LENGTH);
    const twin = buildChain(SHALLOW_CHAIN_LENGTH);
    compactChain(port, false);
    compactChain(twin, true);
    expect(port.bal.y.map(Number)).toEqual(twin.bal.y.map(Number));
  });

  it(`${String(DEEP_CHAIN_LENGTH)}-node chain: the port places without overflow, numbers equal the closed form and the twin`, () => {
    const port = buildChain(DEEP_CHAIN_LENGTH);
    compactChain(port, false);
    for (const i of [0, 1, 2, DEEP_CHAIN_LENGTH - 2, DEEP_CHAIN_LENGTH - 1]) {
      expect(port.bal.y[port.xs[i]!.id]).toBe(expectedBlockY(port, DEEP_CHAIN_LENGTH, i));
      expect(port.bal.y[port.ys[i + 1]!.id]).toBe(expectedBlockY(port, DEEP_CHAIN_LENGTH, i));
    }
    expect(port.bal.y[port.xs[DEEP_CHAIN_LENGTH]!.id]).toBe(0);
    expect(port.bal.y[port.ys[0]!.id]).toBe(expectedBlockY(port, DEEP_CHAIN_LENGTH, -1));

    const twin = buildChain(DEEP_CHAIN_LENGTH);
    try {
      compactChain(twin, true);
    } catch (e) {
      // the recursive twin itself may overflow the interpreter's stack under --jitless; the port must not
      expect(e).toBeInstanceOf(RangeError);
      return;
    }
    expect(twin.bal.y).toEqual(port.bal.y);
  });
});
