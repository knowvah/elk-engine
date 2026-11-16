// SPDX-License-Identifier: EPL-2.0
// Drives the real disco classes step by step the way tools/vectors/DiscoVectors.java drove them (mission 8b, T9) and returns the seven
// stops in the recorder's shape:
//   split           ElkGraphComponentsProcessor.split on the layout node (after the optional component layout algorithm, run through the
//                   service as DisCoLayoutProvider.layout does); the incidence map is read through the private static;
//   import          ElkGraphTransformer.importGraph, with `kind` and `ref` of each element taken from the transformer's own calls (the
//                   private `importElkShape` is wrapped to record what each DCElement was made from; edges come from `elementMapping`);
//   cellSizes, polys, pack, applyToDCGraph
//                   the real `DisCoPolyominoCompactor.compact`, whose private methods are wrapped on the instance to take a stop where
//                   the recorder took one (no copy of `compact`'s body);
//   applyLayout     ElkGraphTransformer.applyLayout, then the provider's debug properties, dumped as an ELK dump.
// The twin (FD4) is the same run with the two extension maps of the transformer replaced by copies in reversed insertion order just
// before `applyLayout`: the only order-observable site is `adjustedPorts`. Private members are reached through bracket access (test code).
import { DisCoLayoutProvider } from '../../src/alg/disco/DisCoLayoutProvider.js';
import { DisCoPolyominoCompactor } from '../../src/alg/disco/DisCoPolyominoCompactor.js';
import type { DCElement } from '../../src/alg/disco/graph/DCElement.js';
import type { DCGraph } from '../../src/alg/disco/graph/DCGraph.js';
import { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
import type { DCPolyomino } from '../../src/alg/disco/structures/DCPolyomino.js';
import { ElkGraphComponentsProcessor } from '../../src/alg/disco/transform/ElkGraphComponentsProcessor.js';
import { ElkGraphTransformer } from '../../src/alg/disco/transform/ElkGraphTransformer.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { isElkEdge, type ElkEdge } from '../../src/graph/ElkEdge.js';
import { isElkLabel } from '../../src/graph/ElkLabel.js';
import { isElkNode, type ElkNode } from '../../src/graph/ElkNode.js';
import { isElkPort } from '../../src/graph/ElkPort.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { dumpDCGraph, dumpDCPolyomino, rle, type ElementIdentity } from './disco-replay-dump.js';
import { dumpElk, importInput, layoutNodeOf } from './disco-replay-elk.js';
import {
  encodeHex,
  type ApplyLayoutStop,
  type ApplyToDCGraphStop,
  type CellSizesStop,
  type ElementKind,
  type ElkDump,
  type FullRow,
  type HexPoint,
  type ImportStop,
  type PackStop,
  type PolysStop,
  type SplitStop,
  type StopsRow,
  type ThrowsRow,
} from './disco-replay-rows.js';

/** What a stepwise run saw beside the stops. */
export interface StopsRun {
  readonly split: SplitStop;
  readonly import: ImportStop;
  readonly cellSizes: CellSizesStop;
  readonly polys: PolysStop;
  readonly pack: PackStop;
  readonly applyToDCGraph: ApplyToDCGraphStop;
  readonly applyLayout: ApplyLayoutStop;
  /** Ids of the keys of `incomingExtensionsMapping` and `outgoingExtensionsMapping` in the iteration order `applyLayout` used. */
  readonly incomingOrder: readonly string[];
  readonly outgoingOrder: readonly string[];
  /** Distinct ports `applyLayout` adjusts (the `adjustedPorts` list at the end). */
  readonly adjustedPorts: number;
}

const point = (x: number, y: number): HexPoint => [encodeHex(x), encodeHex(y)];
const idOf = (element: { getIdentifier(): string | null }): string => element.getIdentifier()!;

type ElkTransformerInternals = {
  importElkShape: (element: ElkShape, consider: boolean, offsetX: number, offsetY: number) => DCElement;
};

/** Wraps the transformer's `importElkShape` so that every shape it makes is recorded with its kind and the id of its source. */
function trackShapes(transformer: ElkGraphTransformer): Map<DCElement, ElementIdentity> {
  const identities = new Map<DCElement, ElementIdentity>();
  const internals = transformer as unknown as ElkTransformerInternals;
  const original = internals.importElkShape.bind(transformer);
  internals.importElkShape = (element, consider, offsetX, offsetY) => {
    const shape = original(element, consider, offsetX, offsetY);
    identities.set(shape, { kind: shapeKind(element), ref: idOf(element) });
    return shape;
  };
  return identities;
}

function shapeKind(element: ElkShape): ElementKind {
  if (isElkNode(element)) {
    return 'node';
  }
  if (isElkPort(element)) {
    return 'port';
  }
  if (!isElkLabel(element)) {
    throw new Error('shape of an unexpected kind');
  }
  const owner = element.getParent();
  if (isElkNode(owner)) {
    return 'nodeLabel';
  }
  return isElkPort(owner) ? 'portLabel' : 'edgeLabel';
}

/** Adds the edges of `elementMapping` that own an element: an edge with a 2-point extension hangs on its node's element (no entry). */
function addEdgeIdentities(transformer: ElkGraphTransformer, identities: Map<DCElement, ElementIdentity>): void {
  const mapping = transformer['elementMapping'];
  const incoming = transformer['incomingExtensionsMapping'];
  const outgoing = transformer['outgoingExtensionsMapping'];
  for (const [element, shape] of mapping) {
    if (isElkEdge(element) && !identities.has(shape)) {
      const kind = incoming.has(element) || outgoing.has(element) ? 'extEdge' : 'edge';
      identities.set(shape, { kind, ref: idOf(element) });
    }
  }
}

const idsInOrder = (subset: Iterable<ElkNode>, order: readonly ElkNode[]): string[] => {
  const members = new Set(subset);
  return order.filter((node) => members.has(node)).map(idOf);
};

function splitStop(layout: ElkNode, split: ElkNode[][], applied: boolean, after: ElkDump | null): SplitStop {
  const incidence = ElkGraphComponentsProcessor['incidenceMap'];
  const children = [...layout.getChildren()];
  return {
    step: 'split',
    componentLayoutApplied: applied,
    afterComponentLayout: after,
    components: split.map((comp) => ({
      first: idOf(comp[0]!),
      nodes: idsInOrder(comp, children),
      dfsOrder: comp.map(idOf),
    })),
    incidence: children.map((node) => ({ id: idOf(node), adjacent: idsInOrder(incidence.get(node)!, children) })),
  };
}

/** The provider's first block: the optional component layout algorithm, run through the service. */
function runComponentLayout(layout: ElkNode): { applied: boolean; after: ElkDump | null } {
  if (layout.hasProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM)) {
    const requested = layout.getProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM);
    const lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requested);
    if (lad !== null) {
      const provider = lad.getInstancePool().fetch();
      const monitor = new BasicProgressMonitor();
      monitor.begin('component layout', 1);
      provider.layout(layout, monitor.subTask(1)!);
      return { applied: true, after: dumpElk(layout) };
    }
  }
  return { applied: false, after: null };
}

type CompactorInternals = {
  computeCellSize: (graph: DCGraph) => number;
  createPolyominoes: () => void;
  packPolyominoes: () => void;
  applyToDCGraph: () => void;
  polys: DCPolyomino[];
  grid: import('../../src/alg/common/polyomino/structures/PlanarGrid.js').PlanarGrid;
  gridCellSizeX: number;
  gridCellSizeY: number;
  aspectRatio: number;
  fill: boolean;
  upperBound: number;
};

interface CompactorStops {
  cellSizes?: CellSizesStop;
  polys?: PolysStop;
  pack?: PackStop;
  applyToDCGraph?: ApplyToDCGraphStop;
}

/** Runs the real `compact` with its private steps wrapped to take the four compactor stops where the recorder took them. */
function compactWithStops(dc: DCGraph): CompactorStops {
  const stops: CompactorStops = {};
  const compactor = new DisCoPolyominoCompactor();
  const c = compactor as unknown as CompactorInternals;
  const comps = [...dc.getComponents()];
  const indexOf = (p: DCPolyomino): number => comps.indexOf(p.getRepresentee());
  let recommendation = Number.NaN;

  const computeCellSize = c.computeCellSize.bind(compactor);
  c.computeCellSize = (graph) => (recommendation = computeCellSize(graph));
  const createPolyominoes = c.createPolyominoes.bind(compactor);
  c.createPolyominoes = () => {
    stops.cellSizes = {
      step: 'cellSizes',
      componentCount: comps.length,
      componentBounds: comps.map((comp) => {
        const dims = comp.getDimensionsOfBoundingRectangle();
        return point(dims.x, dims.y);
      }),
      recommendation: encodeHex(recommendation),
      cellSizeX: encodeHex(c.gridCellSizeX),
      cellSizeY: encodeHex(c.gridCellSizeY),
      aspectRatio: encodeHex(c.aspectRatio),
      fill: c.fill,
      upperBound: encodeHex(c.upperBound),
    };
    createPolyominoes();
    stops.polys = { step: 'polys', polys: c.polys.map((p) => dumpDCPolyomino(p, indexOf(p))) };
  };
  const packPolyominoes = c.packPolyominoes.bind(compactor);
  c.packPolyominoes = () => {
    packPolyominoes();
    const crop = c.grid.getFilledBounds();
    stops.pack = {
      step: 'pack',
      order: c.polys.map(indexOf),
      polys: c.polys.map((p) => dumpDCPolyomino(p, indexOf(p))),
      grid: {
        w: c.grid.getWidth(),
        h: c.grid.getHeight(),
        centerX: c.grid.getCenterX(),
        centerY: c.grid.getCenterY(),
        cells: rle(c.grid),
      },
      filledBounds: [crop.getFirst(), crop.getSecond(), crop.getThird(), crop.getFourth()],
    };
  };
  const applyToDCGraph = c.applyToDCGraph.bind(compactor);
  c.applyToDCGraph = () => {
    applyToDCGraph();
    const dims = dc.getDimensions()!;
    stops.applyToDCGraph = {
      step: 'applyToDCGraph',
      dimensions: point(dims.x, dims.y),
      components: comps.map((comp, index) => ({ index, offset: point(comp.getOffset().x, comp.getOffset().y) })),
      polys: c.polys.map((p) => ({ component: indexOf(p), id: p.getId(), x: p.getX(), y: p.getY() })),
      debugPolys: c.polys.length,
    };
  };
  compactor.compact(dc);
  return stops;
}

const reversed = <K, V>(map: Map<K, V>): Map<K, V> => new Map<K, V>([...map].reverse());

type ExtensionMaps = {
  incomingExtensionsMapping: Map<ElkEdge, unknown>;
  outgoingExtensionsMapping: Map<ElkEdge, unknown>;
};

/** The twin: both extension maps rebuilt in reversed insertion order (the only order-observable site, `adjustedPorts`). */
function reverseExtensionMaps(transformer: ElkGraphTransformer): void {
  const maps = transformer as unknown as ExtensionMaps;
  maps.incomingExtensionsMapping = reversed(maps.incomingExtensionsMapping);
  maps.outgoingExtensionsMapping = reversed(maps.outgoingExtensionsMapping);
}

/** The ports `applyLayout` adjusts: the source ports of the incoming and the target ports of the outgoing extension edges. */
function adjustedPortCount(transformer: ElkGraphTransformer): number {
  const ports = new Set<unknown>();
  for (const edge of transformer['incomingExtensionsMapping'].keys()) {
    ports.add(ElkGraphUtil.getSourcePort(edge));
  }
  for (const edge of transformer['outgoingExtensionsMapping'].keys()) {
    ports.add(ElkGraphUtil.getTargetPort(edge));
  }
  ports.delete(null);
  return ports.size;
}

/** The seven steps of a stops row on a fresh import, optionally with the extension maps reversed (the twin). */
export function runStops(row: StopsRow, twin = false): StopsRun {
  const layout = layoutNodeOf(importInput(row), row.expected.layoutNode);
  const spacing = layout.getProperty(DisCoOptions.SPACING_COMPONENT_COMPONENT);
  const { applied, after } = runComponentLayout(layout);

  const split = ElkGraphComponentsProcessor.split(layout);
  const splitOut = splitStop(layout, split, applied, after);

  const transformer = new ElkGraphTransformer(spacing);
  const identities = trackShapes(transformer);
  const dc = transformer.importGraph(layout);
  addEdgeIdentities(transformer, identities);
  const importOut = dumpDCGraph(
    dc,
    (element) => identities.get(element)!,
    split.map((comp) => idOf(comp[0]!)),
    spacing,
  );

  const compacted = compactWithStops(dc);
  layout.setProperty(DisCoOptions.DEBUG_DISCO_POLYS, dc.getProperty(DisCoOptions.DEBUG_DISCO_POLYS));

  const incomingOrder = [...transformer['incomingExtensionsMapping'].keys()].map(idOf);
  const outgoingOrder = [...transformer['outgoingExtensionsMapping'].keys()].map(idOf);
  const adjustedPorts = adjustedPortCount(transformer);
  if (twin) {
    reverseExtensionMaps(transformer);
  }
  transformer.applyLayout();
  layout.setProperty(DisCoOptions.DEBUG_DISCO_GRAPH, dc);
  return {
    split: splitOut,
    import: importOut,
    cellSizes: compacted.cellSizes!,
    polys: compacted.polys!,
    pack: compacted.pack!,
    applyToDCGraph: compacted.applyToDCGraph!,
    applyLayout: { step: 'applyLayout', ...dumpElk(layout) },
    incomingOrder,
    outgoingOrder,
    adjustedPorts,
  };
}

/** The ELK dump of a row's layout node after a plain `DisCoLayoutProvider.layout` on a fresh import (the recorder's cross-check). */
export function runProvider(row: StopsRow | ThrowsRow | FullRow): ElkDump {
  const layout = layoutNodeOf(importInput(row), row.expected.layoutNode);
  new DisCoLayoutProvider().layout(layout, new BasicProgressMonitor());
  return dumpElk(layout);
}

/** The ELK dump of the root after a `RecursiveGraphLayoutEngine` run on a fresh import. */
export function runFull(row: StopsRow | FullRow): ElkDump {
  const root = importInput(row);
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return dumpElk(root);
}

/** The error the engine run of a throws row raised, or `null` when it completed. */
export function runThrows(row: ThrowsRow): unknown {
  try {
    new RecursiveGraphLayoutEngine().layout(importInput(row), new BasicProgressMonitor());
  } catch (error) {
    return error;
  }
  return null;
}
