// SPDX-License-Identifier: EPL-2.0
// Dumps of the TS spore state in the recorder's shapes, the stepwise driver of the two providers, and the comparators (mission 8c, T7;
// T11 reuses the dumps and comparators and replaces the driver by the real providers). The recorder is tools/vectors/SporeLayoutVectors.java:
// its header is the contract of `spore-layout.json`, its `overlap` / `compaction` / `phases` methods are what `runStepwise` mirrors
// (`OverlapRemovalLayoutProvider.layout` and `ShrinkTreeLayoutProvider.layout` + `ShrinkTree.shrink`, step by step, S/OverlapRemovalLayoutProvider.java:57-131,
// S/ShrinkTreeLayoutProvider.java:34-52, S/ShrinkTree.java:51-73), with the phases created by the strategy enums' `create()` as the recorder does.
// The overlap loop drives the same calls on the same hashed `overlapEdges` set as the Java provider (clear keeps the capacity, the
// handler adds in call order, the triangulation phase `addAll`s into it), so the insertion history is the Java's.
import { ElkGraphImporter } from '../../src/alg/spore/ElkGraphImporter.js';
import type { Graph } from '../../src/alg/spore/graph/Graph.js';
import type { SPOrEPhases } from '../../src/alg/spore/SPOrEPhases.js';
import { RootSelection } from '../../src/alg/spore/options/RootSelection.js';
import { SpanningTreeCostFunction } from '../../src/alg/spore/options/SpanningTreeCostFunction.js';
import { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
import { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
import { StructureExtractionStrategy } from '../../src/alg/spore/options/StructureExtractionStrategy.js';
import { TreeConstructionStrategy } from '../../src/alg/spore/options/TreeConstructionStrategy.js';
import { OverlapRemovalStrategy } from '../../src/alg/spore/options/OverlapRemovalStrategy.js';
import { BowyerWatsonTriangulation } from '../../src/alg/common/BowyerWatsonTriangulation.js';
import type { ICostFunction } from '../../src/alg/common/ICostFunction.js';
import { NaiveMinST } from '../../src/alg/common/NaiveMinST.js';
import { TEDGE_STRATEGY, TEdge } from '../../src/alg/common/TEdge.js';
import type { Tree } from '../../src/alg/common/Tree.js';
import type { IOverlapHandler } from '../../src/alg/common/spore/IOverlapHandler.js';
import { InternalProperties } from '../../src/alg/common/spore/InternalProperties.js';
import type { Node } from '../../src/alg/common/spore/Node.js';
import { ScanlineOverlapCheck } from '../../src/alg/common/spore/ScanlineOverlapCheck.js';
import { SVGImage } from '../../src/alg/common/utils/SVGImage.js';
import type { ILayoutPhase } from '../../src/core/alg/ILayoutPhase.js';
import type { ElkMargin } from '../../src/core/math/ElkMargin.js';
import type { KVector } from '../../src/core/math/KVector.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../src/core/util/ElkUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import * as Sets from '../../src/guava/Sets.js';
import type { JavaHashSet } from '../../src/java/util/JavaHashSet.js';
import { dumpElk, importInput } from './spore-replay-elk.js';
import {
  COMPACTION_ALGORITHM,
  decodeHex,
  encodeHex,
  OVERLAP_ALGORITHM,
  STEP_COMPACTION,
  STEP_END,
  STEP_GROW,
  STEP_IMPORT,
  STEP_SCANLINE,
  STEP_TREE,
  STEP_TRIANGULATION,
  STEP_UNDERLYING,
  STEP_UPDATE,
  type CompactionStop,
  type EndStop,
  type GrowStop,
  type HashInfo,
  type Hex,
  type HexPoint,
  type HexQuad,
  type ImportNodeEntry,
  type ImportStop,
  type IndexPair,
  type IndexTree,
  type MinstExpected,
  type NodeState,
  type ScanlineStop,
  type Stop,
  type TreeStop,
  type TriangulationStop,
  type UnderlyingStop,
  type UpdateStop,
} from './spore-replay-rows.js';

// ------------------------------------------------------------------------------------------------------------
// shapes

const hexPoint = (x: number, y: number): HexPoint => [encodeHex(x), encodeHex(y)];
const vectorPoint = (v: KVector): HexPoint => hexPoint(v.x, v.y);
const rectQuad = (r: { x: number; y: number; width: number; height: number }): HexQuad => [
  encodeHex(r.x),
  encodeHex(r.y),
  encodeHex(r.width),
  encodeHex(r.height),
];
const marginQuad = (m: ElkMargin): HexQuad => [
  encodeHex(m.top),
  encodeHex(m.right),
  encodeHex(m.bottom),
  encodeHex(m.left),
];

/**
 * A tree as nested `[index, child, ...]` arrays in child order, built with an explicit stack: the 2,000-node chains are paths 2,000
 * deep, and a recursive build (three frames per level through `map`) overflows a cold V8 stack on them (`node --jitless`).
 */
function indexTree<T>(root: Tree<T>, rootIdx: number, label: (tree: Tree<T>) => number): IndexTree {
  const top: [number, ...IndexTree[]] = [rootIdx];
  const pending: [Tree<T>, [number, ...IndexTree[]]][] = [[root, top]];
  while (pending.length > 0) {
    const [tree, out] = pending.pop()!;
    for (const child of tree.children) {
      const childOut: [number, ...IndexTree[]] = [label(child)];
      out.push(childOut);
      pending.push([child, childOut]);
    }
  }
  return top;
}

/** Node and vertex indices of the current `Graph.vertices` (identity: `SporeLayoutVectors.Idx`). */
export class Idx {
  private readonly vertex = new Map<KVector, number>();
  private readonly node = new Map<Node, number>();

  constructor(readonly graph: Graph) {
    graph.vertices.forEach((n, i) => {
      this.vertex.set(n.originalVertex, i);
      this.node.set(n, i);
    });
  }

  v(k: KVector): number {
    const i = this.vertex.get(k);
    if (i === undefined) {
      throw new Error(`KVector ${k.toString()} is no current Node.originalVertex`);
    }
    return i;
  }

  n(k: Node): number {
    const i = this.node.get(k);
    if (i === undefined) {
      throw new Error('Node is not in Graph.vertices');
    }
    return i;
  }

  pairs(edges: Iterable<TEdge>): IndexPair[] {
    return [...edges].map((e) => [this.v(e.u), this.v(e.v)] as const);
  }

  /** `vTree`: a tree of vertices, the root as the given index. */
  vTree(t: Tree<KVector>, rootIdx: number): IndexTree {
    return indexTree(t, rootIdx, (c) => this.v(c.node));
  }

  nTree(t: Tree<Node>): IndexTree {
    return indexTree(t, this.n(t.node), (c) => this.n(c.node));
  }

  /** `[vertex.x, vertex.y, rect.x, rect.y]` per node. */
  nodes(): NodeState[] {
    return this.graph.vertices.map((n) => [
      encodeHex(n.vertex.x),
      encodeHex(n.vertex.y),
      encodeHex(n.rect.x),
      encodeHex(n.rect.y),
    ]);
  }
}

// ------------------------------------------------------------------------------------------------------------
// hash classification (`HashInfo`, `HashModel`: the recorder's observed-rule model, PK5)

const TREEIFY_THRESHOLD = 8;
const MIN_TREEIFY_CAPACITY = 64;
const DEFAULT_CAPACITY = 16;
const LOAD_FACTOR = 0.75;
const MAX_CAPACITY = 1 << 30;
const SPREAD_SHIFT = 16;

const spread = (h: number): number => (h ^ (h >>> SPREAD_SHIFT)) | 0;

function maxBinOf(hs: readonly number[], cap: number): number {
  const bins = new Map<number, number>();
  let max = 0;
  for (const h of hs) {
    const bin = h & (cap - 1);
    const count = (bins.get(bin) ?? 0) + 1;
    bins.set(bin, count);
    max = Math.max(max, count);
  }
  return max;
}

function maxEqualOf(edges: readonly TEdge[]): number {
  const counts = new Map<number, number>();
  let max = 0;
  for (const e of edges) {
    const count = (counts.get(e.hashCode()) ?? 0) + 1;
    counts.set(e.hashCode(), count);
    max = Math.max(max, count);
  }
  return max;
}

const isMonotone = (hs: readonly number[], cap: number): boolean =>
  hs.every((h, i) => i === 0 || (h & (cap - 1)) >= (hs[i - 1]! & (cap - 1)));

/** A set whose insertion history is unknown: the smallest capacity consistent with its iteration order bounds every bin. */
export function classifyHash(set: Iterable<TEdge>): HashInfo {
  const edges = [...set];
  const hs = edges.map((e) => spread(e.hashCode()));
  let cap = DEFAULT_CAPACITY;
  while (cap * LOAD_FACTOR < hs.length) {
    cap *= 2;
  }
  while (!isMonotone(hs, cap)) {
    cap *= 2;
    if (cap > MAX_CAPACITY) {
      throw new Error("no capacity orders the set's iteration by bin index");
    }
  }
  const maxBin = maxBinOf(hs, cap);
  return {
    capacity: cap,
    maxBin,
    maxEqualHash: maxEqualOf(edges),
    treeified: maxBin > TREEIFY_THRESHOLD && cap >= MIN_TREEIFY_CAPACITY,
  };
}

/** A list-bin replay of one `HashSet<TEdge>` (`Sets.newHashSet()`): adds, clear (keeps capacity), iteration order. */
export class HashModel {
  private entries: TEdge[] = [];
  cap = DEFAULT_CAPACITY;
  private threshold = Math.trunc(DEFAULT_CAPACITY * Math.fround(LOAD_FACTOR));
  private maxBin = 0;
  treeified = false;

  clear(): void {
    this.entries = [];
    this.treeified = false;
    this.maxBin = 0;
  }

  add(e: TEdge): void {
    if (this.entries.some((x) => x.equals(e))) {
      return;
    }
    this.entries.push(e);
    const mask = this.cap - 1;
    const h = spread(e.hashCode()) & mask;
    const count = this.entries.filter((x) => (spread(x.hashCode()) & mask) === h).length;
    this.maxBin = Math.max(this.maxBin, count);
    if (count > TREEIFY_THRESHOLD) {
      if (this.cap < MIN_TREEIFY_CAPACITY) {
        this.resize();
      } else {
        this.treeified = true;
      }
    }
    if (this.entries.length > this.threshold) {
      this.resize();
    }
  }

  private resize(): void {
    this.cap *= 2;
    this.threshold *= 2;
  }

  /** The modelled iteration order: by bin index, insertion order inside a bin (a stable sort). */
  order(): TEdge[] {
    const mask = this.cap - 1;
    return [...this.entries].sort((a, b) => (spread(a.hashCode()) & mask) - (spread(b.hashCode()) & mask));
  }

  info(set: Iterable<TEdge>, delaunayTreeified: boolean): HashInfo {
    return {
      capacity: this.cap,
      maxBin: this.maxBin,
      maxEqualHash: maxEqualOf([...set]),
      treeified: this.treeified || delaunayTreeified,
    };
  }
}

// ------------------------------------------------------------------------------------------------------------
// stop dumps

/** The number of vertices whose `originalVertex` is not the child's centre: the `Math.random()` loop shifted them. */
export function jitterCount(layout: ElkNode, graph: Graph): number {
  let count = 0;
  const children = [...layout.getChildren()];
  graph.vertices.forEach((node, i) => {
    const c = children[i]!;
    const cx = c.getX() + c.getWidth() / 2;
    const cy = c.getY() + c.getHeight() / 2;
    if (encodeHex(cx) !== encodeHex(node.originalVertex.x) || encodeHex(cy) !== encodeHex(node.originalVertex.y)) {
      count++;
    }
  });
  return count;
}

/** The options of the import stop as `ElkGraphImporter` reads them (non-cloneable options only: `getProperty` is safe). */
function importOptions(
  layout: ElkNode,
  graph: Graph,
  overlap: boolean,
): Omit<ImportStop, 'step' | 'jitterNodes' | 'root' | 'nodes'> {
  return {
    rootSelection: layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION).name(),
    preferredRoot: layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT) as string | null,
    costFunction: layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION).name(),
    treeConstruction: graph.treeConstructionStrategy.name(),
    compactionStrategy: graph.compactionStrategy.name(),
    orthogonal: graph.orthogonalCompaction,
    spacingNodeNode: encodeHex(layout.getProperty(SporeCompactionOptions.SPACING_NODE_NODE)),
    maxIterations: overlap ? layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS) : null,
    runScanline: overlap ? layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE) : null,
  };
}

/** `importStop`: the options as read, the root index, and per node the id, `originalVertex`, `rect` and margins. */
export function dumpImport(layout: ElkNode, graph: Graph, overlap: boolean): ImportStop {
  const idx = new Idx(graph);
  const children = [...layout.getChildren()];
  const nodes: ImportNodeEntry[] = graph.vertices.map((n, i) => ({
    id: children[i]!.getIdentifier()!,
    v: vectorPoint(n.originalVertex),
    r: rectQuad(n.rect),
    m: marginQuad(children[i]!.getProperty(CoreOptions.MARGINS)),
  }));
  return {
    step: STEP_IMPORT,
    ...importOptions(layout, graph, overlap),
    jitterNodes: jitterCount(layout, graph),
    root: graph.preferredRoot === null ? null : idx.n(graph.preferredRoot),
    nodes,
  };
}

export function dumpScanline(
  graph: Graph,
  iteration: number,
  calls: readonly (readonly [Node, Node])[],
  overlapEdges: Iterable<TEdge>,
  model: HashModel,
): ScanlineStop {
  const idx = new Idx(graph);
  const actual = idx.pairs(overlapEdges);
  if (!model.treeified && JSON.stringify(idx.pairs(model.order())) !== JSON.stringify(actual)) {
    throw new Error('the list-bin model does not reproduce the overlapEdges order after the sweep');
  }
  return {
    step: STEP_SCANLINE,
    iteration,
    pairs: calls.map(([a, b]) => [idx.n(a), idx.n(b)] as const),
    edges: actual,
    capacity: model.cap,
  };
}

export function dumpUpdate(graph: Graph, importer: ElkGraphImporter, iteration: number): UpdateStop {
  const nodeMap = (importer as unknown as { nodeMap: { size: number } }).nodeMap;
  return {
    step: STEP_UPDATE,
    iteration,
    vertices: graph.vertices.map((n) => vectorPoint(n.originalVertex)),
    mapSize: nodeMap.size,
  };
}

export const dumpGrow = (graph: Graph, iteration: number): GrowStop => ({
  step: STEP_GROW,
  iteration,
  overlapsExisted: graph.getProperty(InternalProperties.OVERLAPS_EXISTED),
  nodes: new Idx(graph).nodes(),
});

// ------------------------------------------------------------------------------------------------------------
// the stepwise driver

/** One `NaiveMinST` call as the `minst` rows record it (the row adds `algorithm` and `jitterNodes`). */
export type MinstCall = Omit<MinstExpected, 'algorithm' | 'jitterNodes'>;

export interface StepwiseResult {
  readonly stops: Stop[];
  readonly minst: MinstCall[];
  readonly jitterNodes: number;
  /** The error raised inside the run (the recorder catches RuntimeException), or `null`. */
  readonly thrown: unknown;
}

interface Recording {
  readonly stops: Stop[];
  readonly minst: MinstCall[];
  jitterNodes: number;
}

const sameTree = (a: IndexTree, b: IndexTree): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The cost function and root the P2 phase hands to NaiveMinST (`MinSTPhase.process` / `MaxSTPhase.process`). */
function minstInputs(graph: Graph): { min: boolean; rootNode: Node; root: KVector; cost: ICostFunction } {
  const min = graph.treeConstructionStrategy === TreeConstructionStrategy.MINIMUM_SPANNING_TREE;
  const rootNode = graph.preferredRoot ?? graph.vertices[0]!;
  return {
    min,
    rootNode,
    root: min ? rootNode.originalVertex : rootNode.vertex,
    cost: min ? graph.costFunction : { cost: (e) => -graph.costFunction.cost(e) },
  };
}

function triangulationStop(graph: Graph, idx: Idx, iteration: number, model: HashModel | null): TriangulationStop {
  const vertices = graph.vertices.map((v) => v.originalVertex);
  const delaunay = BowyerWatsonTriangulation.triangulate(vertices, null);
  StructureExtractionStrategy.DELAUNAY_TRIANGULATION.create().process(graph, new BasicProgressMonitor());
  const edges = idx.pairs(graph.tEdges!);
  const delaunayInfo = classifyHash(delaunay);
  let info: HashInfo;
  if (model !== null) {
    for (const e of delaunay) {
      model.add(e);
    }
    if (!model.treeified && JSON.stringify(idx.pairs(model.order())) !== JSON.stringify(edges)) {
      throw new Error('the list-bin model does not reproduce the overlapEdges order after addAll');
    }
    info = model.info(graph.tEdges!, delaunayInfo.treeified);
  } else {
    if (JSON.stringify(idx.pairs(delaunay)) !== JSON.stringify(edges)) {
      throw new Error('two triangulations of the same vertices iterate differently');
    }
    info = delaunayInfo;
  }
  return {
    step: STEP_TRIANGULATION,
    iteration,
    scanline: model !== null,
    delaunay: idx.pairs(delaunay),
    edges,
    hash: info,
  };
}

/** P1 (Delaunay), P2 (graph.treeConstructionStrategy) and the given P3, with the minst capture in between (`phases`). */
function runPhases(
  graph: Graph,
  rec: Recording,
  iteration: number,
  model: HashModel | null,
  p3: ILayoutPhase<SPOrEPhases, Graph>,
): void {
  const idx = new Idx(graph);
  const tri = triangulationStop(graph, idx, iteration, model);
  rec.stops.push(tri);

  const { rootNode, root, cost } = minstInputs(graph);
  const rootIdx = idx.n(rootNode);
  const order = [...graph.tEdges!];
  const weights = order.map((e) => encodeHex(cost.cost(e)));
  const fwd = idx.vTree(NaiveMinST.createSpanningTree(graph.tEdges!, root, cost), rootIdx);
  const rev = idx.vTree(NaiveMinST.createSpanningTree([...order].reverse(), root, cost), rootIdx);

  graph.treeConstructionStrategy.create().process(graph, new BasicProgressMonitor());
  const tree = idx.nTree(graph.tree!);
  if (!sameTree(tree, fwd)) {
    throw new Error(
      `the P2 tree differs from NaiveMinST on the same edges: ${JSON.stringify(tree)} vs ${JSON.stringify(fwd)}`,
    );
  }
  const strategy = graph.treeConstructionStrategy.name();
  rec.stops.push({ step: STEP_TREE, iteration, strategy, root: rootIdx, weights, tree } satisfies TreeStop);
  rec.minst.push({
    iteration,
    scanline: model !== null,
    strategy,
    rootIndex: rootIdx,
    root: vectorPoint(root),
    vertices: graph.vertices.map((n) => vectorPoint(n.originalVertex)),
    pairs: idx.pairs(order),
    edges: order.map((e) => [vectorPoint(e.u), vectorPoint(e.v)] as const),
    weights,
    tree,
    reversedTree: rev,
    orderSensitive: !sameTree(tree, rev),
    treeified: tri.hash.treeified,
    hash: tri.hash,
  });

  p3.process(graph, new BasicProgressMonitor());
}

/** The provider's first block: an underlying layout algorithm, when set and known. */
function runUnderlying(layout: ElkNode, rec: Recording, option: IProperty<string>): void {
  if (!layout.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)) {
    return;
  }
  const requested = layout.getProperty(option) as string | null;
  const lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requested);
  const applied = lad !== null;
  if (lad !== null) {
    const provider = lad.getInstancePool().fetch();
    const monitor = new BasicProgressMonitor();
    monitor.begin('underlying', 1);
    provider.layout(layout, monitor.subTask(1)!);
  }
  const stop: UnderlyingStop = { step: STEP_UNDERLYING, requested, applied, ...(applied ? dumpElk(layout) : {}) };
  rec.stops.push(stop);
}

/** `OverlapRemovalLayoutProvider.layout`, step by step (the recorder's `overlap`). */
function runOverlap(layout: ElkNode, rec: Recording): void {
  runUnderlying(layout, rec, SporeOverlapRemovalOptions.UNDERLYING_LAYOUT_ALGORITHM);
  layout.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.CENTER_NODE);
  layout.setProperty(
    SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION,
    SpanningTreeCostFunction.INVERTED_OVERLAP,
  );
  layout.setProperty(
    SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION,
    TreeConstructionStrategy.MINIMUM_SPANNING_TREE,
  );
  const maxIterations = layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS);

  let debugOutputFile: string | null = null;
  if (layout.getProperty(SporeOverlapRemovalOptions.DEBUG_MODE)) {
    debugOutputFile = `${String(ElkUtil.debugFolderPath('spore'))}45scanlineOverlaps`;
  }
  const svg = new SVGImage(debugOutputFile);

  const overlapEdges: JavaHashSet<TEdge> = Sets.newHashSet<TEdge>(TEDGE_STRATEGY);
  const added: TEdge[] = [];
  const calls: (readonly [Node, Node])[] = [];
  const overlapHandler: IOverlapHandler = {
    handle: (n1, n2) => {
      const e = new TEdge(n1.originalVertex, n2.originalVertex);
      calls.push([n1, n2]);
      added.push(e);
      overlapEdges.add(e);
    },
  };
  const graphImporter = new ElkGraphImporter();
  const graph = graphImporter.importGraph(layout);
  rec.jitterNodes = jitterCount(layout, graph);
  rec.stops.push(dumpImport(layout, graph, true));

  const iterations = overlapLoop(layout, graph, graphImporter, rec, {
    maxIterations,
    svg,
    overlapEdges,
    added,
    calls,
    overlapHandler,
  });
  graphImporter.applyPositions(graph);
  rec.stops.push({ step: STEP_END, iterations, ...dumpElk(layout) } satisfies EndStop);
}

interface LoopState {
  readonly maxIterations: number;
  readonly svg: SVGImage;
  readonly overlapEdges: JavaHashSet<TEdge>;
  readonly added: TEdge[];
  readonly calls: (readonly [Node, Node])[];
  readonly overlapHandler: IOverlapHandler;
}

/** The `while` loop of `OverlapRemovalLayoutProvider.layout` (S/OverlapRemovalLayoutProvider.java:95-125). Returns the iteration count. */
function overlapLoop(layout: ElkNode, graph: Graph, importer: ElkGraphImporter, rec: Recording, s: LoopState): number {
  const model = new HashModel();
  let overlapsExisted = true;
  let iteration = 0;
  while (iteration < s.maxIterations && overlapsExisted) {
    const scanline = layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE);
    if (scanline) {
      s.overlapEdges.clear();
      model.clear();
      s.calls.length = 0;
      s.added.length = 0;
      new ScanlineOverlapCheck(s.overlapHandler, s.svg).sweep(graph.vertices);
      for (const e of s.added) {
        model.add(e);
      }
      rec.stops.push(dumpScanline(graph, iteration, s.calls, s.overlapEdges, model));
      if (s.overlapEdges.isEmpty()) {
        break; // don't bother if nothing overlaps
      }
      graph.tEdges = s.overlapEdges;
    }
    runPhases(graph, rec, iteration, scanline ? model : null, OverlapRemovalStrategy.GROW_TREE.create());
    rec.stops.push(dumpGrow(graph, iteration));
    importer.updateGraph(graph);
    rec.stops.push(dumpUpdate(graph, importer, iteration));
    overlapsExisted = graph.getProperty(InternalProperties.OVERLAPS_EXISTED);
    iteration++;
  }
  return iteration;
}

/** `ShrinkTreeLayoutProvider.layout` with `ShrinkTree.shrink`, step by step (the recorder's `compaction`). */
function runCompaction(layout: ElkNode, rec: Recording): void {
  runUnderlying(layout, rec, SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM);
  const graphImporter = new ElkGraphImporter();
  const graph = graphImporter.importGraph(layout);
  rec.jitterNodes = jitterCount(layout, graph);
  rec.stops.push(dumpImport(layout, graph, false));
  const p3 = graph.compactionStrategy.create();
  const ran = graph.vertices.length > 1;
  if (ran) {
    runPhases(graph, rec, 0, null, p3);
  }
  rec.stops.push({ step: STEP_COMPACTION, ran, nodes: new Idx(graph).nodes() } satisfies CompactionStop);
  graphImporter.applyPositions(graph);
  rec.stops.push({ step: STEP_END, iterations: null, ...dumpElk(layout) } satisfies EndStop);
}

/**
 * Runs the provider body of `algorithm` step by step on `layout` and records the stops and the `NaiveMinST` calls as the recorder does.
 * An error raised inside the run is returned (the recorder records its root cause), not thrown.
 */
export function runStepwise(layout: ElkNode, algorithm: string): StepwiseResult {
  const rec: Recording = { stops: [], minst: [], jitterNodes: 0 };
  let thrown: unknown = null;
  try {
    if (algorithm === OVERLAP_ALGORITHM) {
      runOverlap(layout, rec);
    } else if (algorithm === COMPACTION_ALGORITHM) {
      runCompaction(layout, rec);
    } else {
      throw new Error(`unknown algorithm ${algorithm}`);
    }
  } catch (error) {
    thrown = error;
  }
  return { stops: rec.stops, minst: rec.minst, jitterNodes: rec.jitterNodes, thrown };
}

/** A row as far as running it is concerned. */
export interface RunnableRow {
  readonly id: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly expected: { readonly algorithm: string };
}

const runs = new Map<string, StepwiseResult>();

/** `runStepwise` on a freshly imported copy of the row's input, once per row id (the stops of one row feed several test files). */
export function replayRow(row: RunnableRow): StepwiseResult {
  let result = runs.get(row.id);
  if (result === undefined) {
    result = runStepwise(importInput(row), row.expected.algorithm);
    runs.set(row.id, result);
  }
  return result;
}

// ------------------------------------------------------------------------------------------------------------
// jitter invariants (PK4; `jitterRow`, `displacementBound`, `overlapFree` of the recorder)

/** The recorder's `OVERLAP_EPS` and `DISPLACEMENT_FACTOR`. */
const OVERLAP_EPS = 1e-9;
const DISPLACEMENT_FACTOR = 4;

/** `DISPLACEMENT_FACTOR` * the sum over children (child order) of width + height, plus the children's bounding box width + height. */
export function displacementBound(root: ElkNode): number {
  let sum = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const c of root.getChildren()) {
    sum += c.getWidth() + c.getHeight();
    minX = Math.min(minX, c.getX());
    minY = Math.min(minY, c.getY());
    maxX = Math.max(maxX, c.getX() + c.getWidth());
    maxY = Math.max(maxY, c.getY() + c.getHeight());
  }
  return DISPLACEMENT_FACTOR * sum + (maxX - minX) + (maxY - minY);
}

/** No two child boxes intersect by more than `OVERLAP_EPS` in both axes. */
export function overlapFree(root: ElkNode): boolean {
  const cs = [...root.getChildren()];
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i]!;
      const b = cs[j]!;
      const ox = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth()) - Math.max(a.getX(), b.getX());
      const oy = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight()) - Math.max(a.getY(), b.getY());
      if (ox > OVERLAP_EPS && oy > OVERLAP_EPS) {
        return false;
      }
    }
  }
  return true;
}

/** The children's (x, y) of a layout node, in child order. */
export const childOrigins = (root: ElkNode): (readonly [number, number])[] =>
  [...root.getChildren()].map((c) => [c.getX(), c.getY()] as const);

/** The largest distance a child's (x, y) moved from `before` (`Math.hypot`, as the recorder). */
export function maxDisplacement(root: ElkNode, before: readonly (readonly [number, number])[]): number {
  let max = 0;
  [...root.getChildren()].forEach((c, i) => {
    max = Math.max(max, Math.hypot(c.getX() - before[i]![0], c.getY() - before[i]![1]));
  });
  return max;
}

// ------------------------------------------------------------------------------------------------------------
// comparison

/** The AD-4 tolerance for numeric coordinates and sizes. */
export const TOLERANCE = 1e-6;

/** How many hex doubles are identical (same raw bits), within the tolerance only, or differ; non-numeric values must be equal. */
export interface Tally {
  identical: number;
  within: number;
  differs: number;
  /** The first difference as `path: expected vs actual`, or `null`. */
  first: string | null;
}

export const newTally = (): Tally => ({ identical: 0, within: 0, differs: 0, first: null });

const HEX_TEXT = /^[0-9a-f]{16}$/;
const isHexText = (value: unknown): value is Hex => typeof value === 'string' && HEX_TEXT.test(value);

function differ(tally: Tally, where: string, expected: unknown, actual: unknown): void {
  tally.differs++;
  tally.first ??= `${where}: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`;
}

function numbersWithin(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= TOLERANCE;
}

function compareHex(tally: Tally, where: string, expected: Hex, actual: unknown): void {
  if (expected === actual) {
    tally.identical++;
  } else if (isHexText(actual) && numbersWithin(decodeHex(expected), decodeHex(actual))) {
    tally.within++;
  } else {
    differ(tally, where, expected, actual);
  }
}

function compareObjects(tally: Tally, where: string, expected: object, actual: unknown): void {
  if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
    differ(tally, where, expected, actual);
    return;
  }
  const want = expected as Record<string, unknown>;
  const got = actual as Record<string, unknown>;
  for (const key of new Set([...Object.keys(want), ...Object.keys(got)])) {
    if (!(key in want) || !(key in got)) {
      differ(tally, `${where}.${key}`, want[key], got[key]);
    } else {
      compareValues(tally, `${where}.${key}`, want[key], got[key]);
    }
  }
}

/** Compares a recorded value with a port dump of the same shape: integers, ids, strings, booleans and order exactly; hex doubles at AD-4. */
export function compareValues(tally: Tally, where: string, expected: unknown, actual: unknown): void {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      differ(tally, where, expected, actual);
    } else {
      expected.forEach((item, i) => compareValues(tally, `${where}[${String(i)}]`, item, actual[i]));
    }
  } else if (typeof expected === 'object' && expected !== null) {
    compareObjects(tally, where, expected, actual);
  } else if (isHexText(expected)) {
    compareHex(tally, where, expected, actual);
  } else if (expected !== actual) {
    differ(tally, where, expected, actual);
  }
}

/** The comparison of one recorded value with the port's dump. */
export function compareTo(expected: unknown, actual: unknown, where = '$'): Tally {
  const tally = newTally();
  compareValues(tally, where, expected, actual);
  return tally;
}
