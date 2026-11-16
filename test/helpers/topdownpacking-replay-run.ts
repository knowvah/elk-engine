// SPDX-License-Identifier: EPL-2.0
// ELK side of the topdownpacking replay (mission 8c, T8): registers what the recorder registered (TopdownpackingMetaDataProvider +
// TopdownpackingOptions, LayeredMetaDataProvider; the corpusRoot rows leave two compound children on layered), imports a row's input,
// dumps an ELK graph in the recorder's `dumpBody` shape, and runs each group the way tools/vectors/TopdownPackingVectors.java does
// (its header is the contract):
//   runFull(row)       RecursiveGraphLayoutEngine on the imported root, the ELK dump of the root;
//   runStops(row)      the provider body step by step on the root: new GridElkNode(root), assembleAlgorithm, one process call per
//                      processor with a BasicProgressMonitor subtask; the p1 / p2 grid stops and the end dump;
//   runProvider(row)   a plain TopdownpackingLayoutProvider.layout on the imported root (the recorder's `direct` cross-check);
//   runPredicted(row)  getPredictedGraphSize on the imported root before any layout;
//   runThrows(row)     the engine (engine rows) or the direct GridElkNode / phase call (setup + call), returning what was thrown.
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { BottomRowEqualWhitespaceEliminator } from '../../src/alg/topdownpacking/BottomRowEqualWhitespaceEliminator.js';
import { GridElkNode } from '../../src/alg/topdownpacking/GridElkNode.js';
import { LeftRightTopDownNodePlacer } from '../../src/alg/topdownpacking/LeftRightTopDownNodePlacer.js';
import { TopdownpackingLayoutProvider } from '../../src/alg/topdownpacking/TopdownpackingLayoutProvider.js';
import { TopdownpackingMetaDataProvider } from '../../src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
import { TopdownpackingOptions } from '../../src/alg/topdownpacking/options/TopdownpackingOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import {
  encodeHex,
  STEP_END,
  STEP_P1,
  STEP_P2,
  type BoxEntry,
  type DirectCall,
  type DirectSetup,
  type EdgeEntry,
  type ElkDump,
  type GridStop,
  type HexPoint,
  type Stop,
  type ThrowsRow,
} from './topdownpacking-replay-rows.js';

const TOPDOWNPACKING_PROBE_OPTION = 'org.eclipse.elk.topdownpacking.nodeArrangement.strategy';
const LAYERED_PROBE_OPTION = 'org.eclipse.elk.layered.spacing.baseValue';

/** Registers what the recorder registered: TopdownpackingMetaDataProvider + TopdownpackingOptions, and layered. */
export function registerTopdownEngine(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(TOPDOWNPACKING_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new TopdownpackingMetaDataProvider(), new TopdownpackingOptions());
  }
  if (service.getOptionData(LAYERED_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph). */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerTopdownEngine();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

const idOf = (element: ElkGraphElement): string => {
  const identifier = element.getIdentifier();
  if (identifier === null || identifier === '') {
    throw new Error(`element without identifier: ${String(element)}`);
  }
  return identifier;
};

const point = (x: number, y: number): HexPoint => [encodeHex(x), encodeHex(y)];

const box = (node: ElkNode): BoxEntry => ({
  id: idOf(node),
  x: encodeHex(node.getX()),
  y: encodeHex(node.getY()),
  w: encodeHex(node.getWidth()),
  h: encodeHex(node.getHeight()),
});

function edgeEntry(edge: ElkEdge): EdgeEntry {
  const sections = [...edge.getSections()].map((section) => ({
    start: point(section.getStartX(), section.getStartY()),
    end: point(section.getEndX(), section.getEndY()),
    bends: [...section.getBendPoints()].map((b) => point(b.getX(), b.getY())),
  }));
  const junctions = edge.hasProperty(CoreOptions.JUNCTION_POINTS)
    ? [...edge.getProperty(CoreOptions.JUNCTION_POINTS)].map((v) => point(v.x, v.y))
    : null;
  return { id: idOf(edge), sections, junctions };
}

function visit(parent: ElkNode, nodes: BoxEntry[], edges: EdgeEntry[]): void {
  if (!parent.getPorts().isEmpty() || !parent.getLabels().isEmpty()) {
    throw new Error(`node ${idOf(parent)} has ports or labels, which the dump does not record`);
  }
  for (const node of parent.getChildren()) {
    nodes.push(box(node));
    visit(node, nodes, edges);
  }
  for (const edge of parent.getContainedEdges()) {
    edges.push(edgeEntry(edge));
  }
}

/** The recorder's ELK dump of `top`: its box, every descendant depth first, contained edges after a node's children. */
export function dumpElk(top: ElkNode): ElkDump {
  const nodes: BoxEntry[] = [];
  const edges: EdgeEntry[] = [];
  visit(top, nodes, edges);
  return { graph: box(top), nodes, edges };
}

/** The p1 / p2 stop of the recorder (`gridStop`): the real row lists, each entry the child id or null. */
export function gridStop(step: typeof STEP_P1 | typeof STEP_P2, root: ElkNode, grid: GridElkNode): GridStop {
  const cells: (string | null)[][] = [];
  for (let i = 0; i < grid.getRows(); i++) {
    cells.push(grid.getRow(i).map((node) => (node === null ? null : idOf(node))));
  }
  return { step, graph: box(root), rows: grid.getRows(), cols: grid.getColumns(), cells, nodes: dumpElk(root).nodes };
}

/** A full row: RecursiveGraphLayoutEngine on the imported root (the engine applies the LayoutAlgorithmResolver itself). */
export function runFull(row: { readonly input: Readonly<Record<string, unknown>> }): ElkDump {
  const root = importInput(row);
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return dumpElk(root);
}

/** A plain TopdownpackingLayoutProvider.layout on the imported root. */
export function runProvider(row: { readonly input: Readonly<Record<string, unknown>> }): ElkDump {
  const root = importInput(row);
  new TopdownpackingLayoutProvider().layout(root, new BasicProgressMonitor());
  return dumpElk(root);
}

/** The recorder's stepwise run (`runStops`): the stops p1, p2 and end, with the `{ step, ... }` shape of the ref. */
export function runStops(row: { readonly input: Readonly<Record<string, unknown>> }): Stop[] {
  const root = importInput(row);
  const provider = new TopdownpackingLayoutProvider();
  const wrapped = new GridElkNode(root);
  const algorithm = provider.assembleAlgorithm(wrapped);
  if (
    algorithm.length !== 2 ||
    !(algorithm[0] instanceof LeftRightTopDownNodePlacer) ||
    !(algorithm[1] instanceof BottomRowEqualWhitespaceEliminator)
  ) {
    throw new Error(`unexpected processor list ${String(algorithm)}`);
  }
  const monitor = new BasicProgressMonitor();
  monitor.begin('Topdown Packing', algorithm.length);
  algorithm[0].process(wrapped, monitor.subTask(1)!);
  const p1 = gridStop(STEP_P1, root, wrapped);
  algorithm[1].process(wrapped, monitor.subTask(1)!);
  const p2 = gridStop(STEP_P2, root, wrapped);
  monitor.done();
  return [p1, p2, { step: STEP_END, ...dumpElk(root) }];
}

/** A predicted row: getPredictedGraphSize on the imported root, before any layout. */
export function runPredicted(row: { readonly input: Readonly<Record<string, unknown>> }): HexPoint {
  const size = new TopdownpackingLayoutProvider().getPredictedGraphSize(importInput(row));
  return point(size.x, size.y);
}

function childById(root: ElkNode, id: string): ElkNode {
  const child = [...root.getChildren()].find((node) => node.getIdentifier() === id);
  if (child === undefined) {
    throw new Error(`no child ${id}`);
  }
  return child;
}

/** The recorder's `runOp`: wrap the root, size the grid unless `cols` is null, put the children, then make the call. */
function runDirect(root: ElkNode, setup: DirectSetup, call: DirectCall): void {
  const grid = new GridElkNode(root);
  if (setup.cols !== null) {
    grid.setGridSize(setup.cols, setup.rows!);
  }
  for (const [col, gridRow, childId] of setup.puts) {
    grid.put(col, gridRow, childById(root, childId));
  }
  const [a = 0, b = 0] = call.args;
  switch (call.name) {
    case 'put':
      grid.put(a, b, root.getChildren().get(0));
      break;
    case 'get':
      grid.get(a, b);
      break;
    case 'getRow':
      grid.getRow(a);
      break;
    case 'getColumn':
      grid.getColumn(a);
      break;
    case 'p2':
      new BottomRowEqualWhitespaceEliminator().process(grid, new BasicProgressMonitor());
      break;
  }
}

/** A throws row: what the engine (engine rows) or the direct call (setup + call rows) throws; the sentinel string if nothing. */
export function runThrows(row: ThrowsRow): unknown {
  const root = importInput(row);
  const { setup, call } = row.expected;
  try {
    if (setup !== undefined && call !== undefined) {
      runDirect(root, setup, call);
    } else {
      new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
    }
  } catch (error) {
    return error;
  }
  return 'no exception';
}
