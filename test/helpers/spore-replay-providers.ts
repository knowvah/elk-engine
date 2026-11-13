// SPDX-License-Identifier: EPL-2.0
// The real-provider replay of spore (mission 8c, T11): one `RecursiveGraphLayoutEngine` run of a row's input through the ported
// `OverlapRemovalLayoutProvider` / `ShrinkTreeLayoutProvider`, with every stop of the recorder observed by wrappers on prototypes and on
// the static `NaiveMinST.createSpanningTree` (restored in `finally`; no production hook; `.agent-notes/alg-force-disco.md`, "engine-run
// stops are observed with prototype wrappers"). The result has the shape of T7's `StepwiseResult`, so the comparators and dumps of
// `spore-replay-dump.ts` apply unchanged. The stop moments:
//   underlying     before `ElkGraphImporter.importGraph` (the provider's first block has run)
//   import         after `importGraph`
//   scanline       the sweep's handler calls are recorded; the stop is completed at the next `DelaunayTriangulationPhase.process`
//                  (the edges are `graph.tEdges`, the provider's own `overlapEdges` set) or, when the provider broke out of its loop, at
//                  `applyPositions` with no edges
//   triangulation  around `DelaunayTriangulationPhase.process`
//   tree, minst    at the start of the P3 phase (`NaiveMinST.createSpanningTree`'s arguments and result were captured on the way)
//   grow, update   after `GrowTreePhase.process`, after `ElkGraphImporter.updateGraph`
//   compaction     after `ShrinkTreeCompactionPhase.process` (`ran: false` at `applyPositions` when no phase ran)
//   end            after `ElkGraphImporter.applyPositions`
import { BowyerWatsonTriangulation } from '../../src/alg/common/BowyerWatsonTriangulation.js';
import type { ICostFunction } from '../../src/alg/common/ICostFunction.js';
import { NaiveMinST } from '../../src/alg/common/NaiveMinST.js';
import { TEdge } from '../../src/alg/common/TEdge.js';
import type { Tree } from '../../src/alg/common/Tree.js';
import type { IOverlapHandler } from '../../src/alg/common/spore/IOverlapHandler.js';
import type { Node } from '../../src/alg/common/spore/Node.js';
import { ScanlineOverlapCheck } from '../../src/alg/common/spore/ScanlineOverlapCheck.js';
import { ElkGraphImporter } from '../../src/alg/spore/ElkGraphImporter.js';
import type { Graph } from '../../src/alg/spore/graph/Graph.js';
import { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
import { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
import { DelaunayTriangulationPhase } from '../../src/alg/spore/p1structure/DelaunayTriangulationPhase.js';
import { GrowTreePhase } from '../../src/alg/spore/p3execution/GrowTreePhase.js';
import { ShrinkTreeCompactionPhase } from '../../src/alg/spore/p3execution/ShrinkTreeCompactionPhase.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { KVector } from '../../src/core/math/KVector.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import {
  classifyHash,
  dumpGrow,
  dumpImport,
  dumpScanline,
  dumpUpdate,
  HashModel,
  Idx,
  jitterCount,
  type MinstCall,
  type RunnableRow,
  type StepwiseResult,
} from './spore-replay-dump.js';
import { dumpElk, importInput } from './spore-replay-elk.js';
import {
  encodeHex,
  OVERLAP_ALGORITHM,
  STEP_COMPACTION,
  STEP_END,
  STEP_GROW,
  STEP_IMPORT,
  STEP_TREE,
  STEP_TRIANGULATION,
  STEP_UNDERLYING,
  type ElkDump,
  type EndStop,
  type HashInfo,
  type HexPoint,
  type IndexTree,
  type Stop,
  type TreeStop,
  type TriangulationStop,
  type UnderlyingStop,
} from './spore-replay-rows.js';

type Fn = (this: object, ...args: unknown[]) => unknown;
type Restore = () => void;

/** Replaces `target[key]` by `make(original)`; the returned function puts the original back. */
function wrap(target: object, key: string, make: (original: Fn) => Fn): Restore {
  const holder = target as Record<string, unknown>;
  const original = holder[key] as Fn;
  holder[key] = make(original);
  return () => {
    holder[key] = original;
  };
}

const vectorPoint = (v: KVector): HexPoint => [encodeHex(v.x), encodeHex(v.y)];
/**
 * A tree as nested `[index, child, ...]` arrays in child order, built with an explicit stack: the 2,000-node chains are paths 2,000
 * deep, and a recursive walk (two frames per level) overflows a cold V8 stack on them, as `Idx.vTree` / `Idx.nTree` did before T14.
 */
function indexTree<T>(root: Tree<T>, label: (tree: Tree<T>) => number): IndexTree {
  const top: [number, ...IndexTree[]] = [label(root)];
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

const sameTree = (a: IndexTree, b: IndexTree): boolean => JSON.stringify(a) === JSON.stringify(b);

/** What `NaiveMinST.createSpanningTree` was called with and returned in the current iteration. */
interface Spanning {
  readonly order: TEdge[];
  readonly root: KVector;
  readonly cost: ICostFunction;
  readonly tree: Tree<KVector>;
}

/** The handler calls of one sweep (the recorder's `calls` and `added`). */
interface Sweep {
  readonly iteration: number;
  readonly calls: (readonly [Node, Node])[];
  readonly added: TEdge[];
}

/** Observation state of one engine run. */
class Capture {
  readonly stops: Stop[] = [];
  readonly minst: MinstCall[] = [];
  jitterNodes = 0;

  private readonly overlap: boolean;
  private layout!: ElkNode;
  private iteration = 0;
  private readonly model = new HashModel();
  private sweep: Sweep | null = null;
  private scanline = false;
  private triangulation: TriangulationStop | null = null;
  private spanning: Spanning | null = null;
  private compactionSeen = false;
  private readonly restores: Restore[] = [];
  /** The original `createSpanningTree`, for the reversed-order tree (the wrapper would overwrite `spanning`). */
  private readonly unwrappedSpanning = NaiveMinST.createSpanningTree as Fn;

  constructor(algorithm: string) {
    this.overlap = algorithm === OVERLAP_ALGORITHM;
  }

  install(): Restore {
    const importer = ElkGraphImporter.prototype;
    const capture = this;
    this.restores.push(
      wrap(
        importer,
        'importGraph',
        (orig) =>
          function (this: object, ...a) {
            return capture.onImport(orig, this, a);
          },
      ),
      wrap(
        importer,
        'updateGraph',
        (orig) =>
          function (this: object, ...a) {
            return capture.onUpdate(orig, this, a);
          },
      ),
      wrap(
        importer,
        'applyPositions',
        (orig) =>
          function (this: object, ...a) {
            return capture.onApply(orig, this, a);
          },
      ),
      wrap(
        ScanlineOverlapCheck.prototype,
        'sweep',
        (orig) =>
          function (this: object, ...a) {
            return capture.onSweep(orig, this, a);
          },
      ),
      wrap(
        DelaunayTriangulationPhase.prototype,
        'process',
        (orig) =>
          function (this: object, ...a) {
            return capture.onTriangulate(orig, this, a);
          },
      ),
      wrap(
        NaiveMinST,
        'createSpanningTree',
        (orig) =>
          function (this: object, ...a) {
            return capture.onSpanning(orig, this, a);
          },
      ),
      wrap(
        GrowTreePhase.prototype,
        'process',
        (orig) =>
          function (this: object, ...a) {
            return capture.onGrow(orig, this, a);
          },
      ),
      wrap(
        ShrinkTreeCompactionPhase.prototype,
        'process',
        (orig) =>
          function (this: object, ...a) {
            return capture.onCompaction(orig, this, a);
          },
      ),
    );
    return () => {
      for (const restore of this.restores.reverse()) {
        restore();
      }
    };
  }

  // -------------------------------------------------------------------------------------------------------------
  // importer

  onImport(orig: Fn, self: object, args: unknown[]): unknown {
    this.layout = args[0] as ElkNode;
    this.underlying();
    const graph = orig.apply(self, args) as Graph;
    this.jitterNodes = jitterCount(this.layout, graph);
    this.stops.push(dumpImport(this.layout, graph, this.overlap));
    return graph;
  }

  /** The `underlying` stop: only when the option is set; `applied` is false when the id resolved to no algorithm. */
  private underlying(): void {
    if (!this.layout.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)) {
      return;
    }
    const option = this.overlap
      ? SporeOverlapRemovalOptions.UNDERLYING_LAYOUT_ALGORITHM
      : SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM;
    const requested = this.layout.getProperty(option) as string | null;
    const applied = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requested) !== null;
    const stop: UnderlyingStop = {
      step: STEP_UNDERLYING,
      requested,
      applied,
      ...(applied ? dumpElk(this.layout) : {}),
    };
    this.stops.push(stop);
  }

  onUpdate(orig: Fn, self: object, args: unknown[]): unknown {
    const result = orig.apply(self, args);
    this.stops.push(dumpUpdate(args[0] as Graph, self as ElkGraphImporter, this.iteration));
    this.iteration++;
    return result;
  }

  onApply(orig: Fn, self: object, args: unknown[]): unknown {
    const graph = args[0] as Graph;
    this.finishSweep(graph, null);
    if (!this.overlap && !this.compactionSeen) {
      this.stops.push({ step: STEP_COMPACTION, ran: false, nodes: new Idx(graph).nodes() });
    }
    const result = orig.apply(self, args);
    const end: EndStop = { step: STEP_END, iterations: this.overlap ? this.iteration : null, ...dumpElk(this.layout) };
    this.stops.push(end);
    return result;
  }

  // -------------------------------------------------------------------------------------------------------------
  // scanline and triangulation

  onSweep(orig: Fn, self: object, args: unknown[]): unknown {
    const check = self as { overlapHandler: IOverlapHandler };
    const handler = check.overlapHandler;
    const sweep: Sweep = { iteration: this.iteration, calls: [], added: [] };
    check.overlapHandler = {
      handle: (n1, n2) => {
        sweep.calls.push([n1, n2]);
        sweep.added.push(new TEdge(n1.originalVertex, n2.originalVertex));
        handler.handle(n1, n2);
      },
    };
    try {
      orig.apply(self, args);
    } finally {
      check.overlapHandler = handler;
    }
    this.model.clear();
    for (const e of sweep.added) {
      this.model.add(e);
    }
    this.sweep = sweep;
    return undefined;
  }

  /** Completes the pending scanline stop with the provider's `overlapEdges` (`null`: the loop broke out, nothing overlapped). */
  private finishSweep(graph: Graph, edges: Iterable<TEdge> | null): void {
    if (this.sweep === null) {
      return;
    }
    const { iteration, calls } = this.sweep;
    this.stops.push(dumpScanline(graph, iteration, calls, edges ?? [], this.model));
    this.scanline = true;
    this.sweep = null;
  }

  onTriangulate(orig: Fn, self: object, args: unknown[]): unknown {
    const graph = args[0] as Graph;
    this.scanline = false;
    this.finishSweep(graph, this.sweep === null ? null : graph.tEdges);
    const delaunay = BowyerWatsonTriangulation.triangulate(
      graph.vertices.map((v) => v.originalVertex),
      null,
    );
    const result = orig.apply(self, args);
    this.triangulation = this.triangulationStop(graph, delaunay);
    this.stops.push(this.triangulation);
    return result;
  }

  /** The recorder's `triangulation` stop from the state after the phase (T7's `triangulationStop`, split around the phase). */
  private triangulationStop(graph: Graph, delaunay: Iterable<TEdge>): TriangulationStop {
    const idx = new Idx(graph);
    const edges = idx.pairs(graph.tEdges!);
    const delaunayInfo = classifyHash(delaunay);
    let info: HashInfo;
    if (this.scanline) {
      for (const e of delaunay) {
        this.model.add(e);
      }
      if (!this.model.treeified && JSON.stringify(idx.pairs(this.model.order())) !== JSON.stringify(edges)) {
        throw new Error('the list-bin model does not reproduce the overlapEdges order after addAll');
      }
      info = this.model.info(graph.tEdges!, delaunayInfo.treeified);
    } else {
      if (JSON.stringify(idx.pairs(delaunay)) !== JSON.stringify(edges)) {
        throw new Error('two triangulations of the same vertices iterate differently');
      }
      info = delaunayInfo;
    }
    return {
      step: STEP_TRIANGULATION,
      iteration: this.iteration,
      scanline: this.scanline,
      delaunay: idx.pairs(delaunay),
      edges,
      hash: info,
    };
  }

  // -------------------------------------------------------------------------------------------------------------
  // processing order and execution

  onSpanning(orig: Fn, self: object, args: unknown[]): unknown {
    const [edges, root, cost] = args as [Iterable<TEdge>, KVector, ICostFunction];
    const order = [...edges];
    const tree = orig.apply(self, args) as Tree<KVector>;
    this.spanning = { order, root, cost, tree };
    return tree;
  }

  /** The `tree` stop and the `minst` call, at the start of the P3 phase (`graph.tree` is set, `Graph` untouched since). */
  private treeStops(graph: Graph, original: Fn): void {
    const spanning = this.spanning!;
    const tri = this.triangulation!;
    const idx = new Idx(graph);
    const rootIdx = graph.vertices.findIndex((n) => n.originalVertex === spanning.root || n.vertex === spanning.root);
    const weights = spanning.order.map((e) => encodeHex(spanning.cost.cost(e)));
    const tree = indexTree(graph.tree!, (t) => idx.n(t.node));
    if (
      !sameTree(
        tree,
        indexTree(spanning.tree, (t) => (t === spanning.tree ? rootIdx : idx.v(t.node))),
      )
    ) {
      throw new Error('the P2 tree differs from the tree NaiveMinST returned to the phase');
    }
    const reversed = original.call(
      NaiveMinST,
      [...spanning.order].reverse(),
      spanning.root,
      spanning.cost,
    ) as Tree<KVector>;
    const rev = indexTree(reversed, (t) => (t === reversed ? rootIdx : idx.v(t.node)));
    const strategy = graph.treeConstructionStrategy.name();
    this.stops.push({
      step: STEP_TREE,
      iteration: this.iteration,
      strategy,
      root: rootIdx,
      weights,
      tree,
    } satisfies TreeStop);
    this.minst.push({
      iteration: this.iteration,
      scanline: tri.scanline,
      strategy,
      rootIndex: rootIdx,
      root: vectorPoint(spanning.root),
      vertices: graph.vertices.map((n) => vectorPoint(n.originalVertex)),
      pairs: idx.pairs(spanning.order),
      edges: spanning.order.map((e) => [vectorPoint(e.u), vectorPoint(e.v)] as const),
      weights,
      tree,
      reversedTree: rev,
      orderSensitive: !sameTree(tree, rev),
      treeified: tri.hash.treeified,
      hash: tri.hash,
    });
  }

  onGrow(orig: Fn, self: object, args: unknown[]): unknown {
    const graph = args[0] as Graph;
    this.treeStops(graph, this.unwrappedSpanning);
    const result = orig.apply(self, args);
    this.stops.push(dumpGrow(graph, this.iteration));
    return result;
  }

  onCompaction(orig: Fn, self: object, args: unknown[]): unknown {
    const graph = args[0] as Graph;
    this.treeStops(graph, this.unwrappedSpanning);
    const result = orig.apply(self, args);
    this.compactionSeen = true;
    this.stops.push({ step: STEP_COMPACTION, ran: true, nodes: new Idx(graph).nodes() });
    return result;
  }
}

/** The observed run plus the ELK dump of the root after the engine returned (`null` when the run threw). */
export interface ProviderResult extends StepwiseResult {
  readonly dump: ElkDump | null;
}

/**
 * Runs `root` (a prepared row input naming `algorithm`) through `RecursiveGraphLayoutEngine` and records the stops and the `NaiveMinST`
 * calls as the recorder does. An error raised inside the run is returned, not thrown.
 */
export function runProvider(root: ElkNode, algorithm: string): ProviderResult {
  const capture = new Capture(algorithm);
  const restore = capture.install();
  let thrown: unknown = null;
  try {
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  } catch (error) {
    thrown = error;
  } finally {
    restore();
  }
  // the engine's own output: a root without children never reaches the provider, so no `end` stop exists then
  const dump = thrown === null ? dumpElk(root) : null;
  return { stops: capture.stops, minst: capture.minst, jitterNodes: capture.jitterNodes, thrown, dump };
}

const runs = new Map<string, ProviderResult>();

/** `runProvider` on a freshly imported copy of the row's input, once per row id. */
export function replayProvider(row: RunnableRow): ProviderResult {
  let result = runs.get(row.id);
  if (result === undefined) {
    result = runProvider(importInput(row), row.expected.algorithm);
    runs.set(row.id, result);
  }
  return result;
}
