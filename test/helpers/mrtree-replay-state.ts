// SPDX-License-Identifier: EPL-2.0
// Isolated-step replay support for the mrtree stops (mission 8a, T9; builds on mrtree-replay-rows.ts and mrtree-replay-dump.ts). T12 and T14-T17
// use these three functions to run ONE step from the recorded state it started from:
//   importRowInput(input)          the row's ELK JSON `input` as an ElkNode root with the mrtree options registered, NodeMicroLayout applied
//                                  unless OMIT_NODE_MICRO_LAYOUT (TreeLayoutProvider.java:56, which is what the recorder ran before its first
//                                  stop), imported by the ported ElkGraphImporter: `{ root, tGraph, elkNodes, elkEdges }` (the identifier maps
//                                  resolve ORIGIN values);
//   buildBeforeGraphs(row, t)      the "before" TGraphs of a transition: every graph of `t.before` rebuilt with `buildTGraph`, the properties the
//                                  recorder does not dump taken from the importer's TNodes/TEdges/TGraph (`templates`) and ORIGIN resolved to the
//                                  real ElkNode/ElkEdge of the imported root. `null` when `t.before` is null (the import) or the dump cannot be
//                                  rebuilt (`ReplayRebuildError`: the 27 graphs of T6 note 1; the caller counts those as skipped);
//   dumpElk(root)                  the ELK graph in the recorder's `dumpElk(root, micro=false)` shape (the `elk` of the applyLayout stop).
// A state after NodePlacer also needs one fact the dump does not carry: `NodePlacer.java:103-105` writes the graph property DIRECTION = DOWN when it
// is UNDEFINED, and the recorder dumps only InternalProperties, TREE_LEVEL, POSITION_CONSTRAINT and PRIORITY. buildBeforeGraphs restores that write
// on the graphs of every transition whose before state is NodePlacer's or later (every step after NodePlacer, pack, applyLayout): every recorded
// component passed NodePlacer before those states, and without it `switch (direction)` of CompactionProcessor (java:78, :110) has no case.
// A replay that runs a step on `before.graphs` and `dumpStop`s the result compares against `t.stop` with `compareStop`. The ELK graph of
// the replay (`imported.root`) is the one `ElkGraphImporter.applyLayout` writes to.
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { ElkGraphImporter } from '../../src/alg/mrtree/ElkGraphImporter.js';
import type { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { Direction } from '../../src/core/options/Direction.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ReplayRebuildError, buildTGraph, edgeRef, nodeRef, type BuildOptions } from './mrtree-replay-dump.js';
import {
  encodeHex,
  encodeHexPair,
  PROCESSOR_STEPS,
  STEP_APPLY,
  STEP_PACK,
  type ElkResult,
  type Hex,
  type StopsRow,
  type Transition,
} from './mrtree-replay-rows.js';

const MRTREE_PROBE_OPTION = 'org.eclipse.elk.mrtree.weighting';

/** Registers the mrtree option metadata once per module registry (the service keeps core and labels only). */
export function registerMrTree(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(MRTREE_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new MrTreeMetaDataProvider(), new MrTreeOptions());
  }
}

/** A row's input imported the way the recorder's first stop was (see the header). */
export interface ImportedRow {
  readonly root: ElkNode;
  readonly tGraph: TGraph;
  readonly elkNodes: ReadonlyMap<string, ElkNode>;
  readonly elkEdges: ReadonlyMap<string, ElkEdge>;
}

/** Parses the ELK JSON input to its root node, with the mrtree options registered (no layout, no import). */
export function parseRowInput(input: Readonly<Record<string, unknown>>): ElkNode {
  registerMrTree();
  return ElkGraphJson.forGraph(JSON.stringify(input)).toElk();
}

/** NodeMicroLayout as `TreeLayoutProvider.layout` runs it (`TreeLayoutProvider.java:56`), then `ElkGraphImporter.importGraph`. */
export function importRowInput(input: Readonly<Record<string, unknown>>): ImportedRow {
  const root = parseRowInput(input);
  if (!root.getProperty(MrTreeOptions.OMIT_NODE_MICRO_LAYOUT)) {
    NodeMicroLayout.forGraph(root).execute();
  }
  const tGraph = new ElkGraphImporter().importGraph(root);
  const elkNodes = new Map<string, ElkNode>();
  const elkEdges = new Map<string, ElkEdge>();
  for (const node of root.getChildren()) {
    elkNodes.set(node.getIdentifier()!, node);
  }
  for (const edge of root.getContainedEdges()) {
    elkEdges.set(edge.getIdentifier()!, edge);
  }
  return { root, tGraph, elkNodes, elkEdges };
}

/** The `BuildOptions` of one imported row: templates from the importer's graph, nodes and edges; ORIGIN to the real elements. */
export function buildOptionsFor(imported: ImportedRow): BuildOptions {
  const nodes = new Map([...imported.tGraph.getNodes()].map((node) => [nodeRef(node), node]));
  const edges = new Map([...imported.tGraph.getEdges()].map((edge) => [edgeRef(edge), edge]));
  return {
    templates: {
      graph: imported.tGraph,
      node: (ref) => nodes.get(ref),
      edge: (ref) => edges.get(ref),
    },
    origin: (kind, identifier) => {
      const found =
        kind === 'graph'
          ? imported.root
          : kind === 'node'
            ? imported.elkNodes.get(identifier)
            : imported.elkEdges.get(identifier);
      if (found === undefined) {
        throw new ReplayRebuildError(
          `ORIGIN ${kind} ${JSON.stringify(identifier)} is not an element of the imported input`,
        );
      }
      return found;
    },
  };
}

const STEP_NODE_PLACER = 'NodePlacer';

/** Whether the state a step starts from is the result of NodePlacer or a later step (pack and applyLayout follow every processor). */
function isAfterNodePlacer(step: string): boolean {
  return (
    step === STEP_PACK ||
    step === STEP_APPLY ||
    (PROCESSOR_STEPS as readonly string[]).indexOf(step) >
      (PROCESSOR_STEPS as readonly string[]).indexOf(STEP_NODE_PLACER)
  );
}

/** `NodePlacer.java:103-105`: DIRECTION UNDEFINED becomes DOWN on the graph. */
function restoreNodePlacerDirection(graph: TGraph): void {
  if (graph.getProperty(MrTreeOptions.DIRECTION) === Direction.UNDEFINED) {
    graph.setProperty(MrTreeOptions.DIRECTION, Direction.DOWN);
  }
}

/** The graphs a transition started from, rebuilt (see the header); `null` for the import and for a state the dump cannot rebuild. */
export function buildBeforeGraphs(
  row: StopsRow,
  transition: Transition,
): { readonly graphs: TGraph[]; readonly imported: ImportedRow } | null {
  if (transition.before === null) {
    return null;
  }
  const imported = importRowInput(row.input);
  const options = buildOptionsFor(imported);
  try {
    const graphs = transition.before.map((dump) => buildTGraph(dump, options));
    if (isAfterNodePlacer(transition.step)) {
      graphs.forEach(restoreNodePlacerDirection);
    }
    return { graphs, imported };
  } catch (error) {
    if (error instanceof ReplayRebuildError) {
      return null;
    }
    throw error;
  }
}

const hexOrNull = (value: number | null): Hex | null => (value === null ? null : encodeHex(value));

/** The recorder's `dumpElk(root, micro=false)`: root first then its children, the edges the root contains, doubles as hex. */
export function dumpElk(root: ElkNode): ElkResult {
  const nodes = [root, ...root.getChildren()].map((node) => ({
    id: node.getIdentifier()!,
    x: encodeHex(node.getX()),
    y: encodeHex(node.getY()),
    w: encodeHex(node.getWidth()),
    h: encodeHex(node.getHeight()),
  }));
  const edges = [...root.getContainedEdges()].map((edge) => ({
    id: edge.getIdentifier()!,
    sections: [...edge.getSections()].map((section) => ({
      start: encodeHexPair(section.getStartX(), section.getStartY()),
      end: encodeHexPair(section.getEndX(), section.getEndY()),
      bends: [...section.getBendPoints()].map((bend) => encodeHexPair(bend.getX(), bend.getY())),
    })),
  }));
  return {
    graph: {
      w: encodeHex(root.getWidth()),
      h: encodeHex(root.getHeight()),
      // CHILD_AREA_* have no default: null until a layout wrote them
      childAreaWidth: hexOrNull(root.getProperty(CoreOptions.CHILD_AREA_WIDTH) as number | null),
      childAreaHeight: hexOrNull(root.getProperty(CoreOptions.CHILD_AREA_HEIGHT) as number | null),
    },
    nodes,
    edges,
  };
}
