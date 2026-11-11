// SPDX-License-Identifier: EPL-2.0
// ELK side of the disco replay (mission 8b, T9): registers the providers the recorder registered, imports a row's input, finds the layout
// node, and dumps an ELK graph in the shape of the recorder's `dumpBody` (tools/vectors/DiscoVectors.java; the header of that file is
// the contract): `graph` (the top node), `nodes` (descendants: each node, then its labels' and ports' own lists, then its children),
// `ports`, `labels`, `edges` (sections and the JUNCTION_POINTS value when set) and `debug` (nodes with DEBUG_DISCO_POLYS or
// DEBUG_DISCO_GRAPH set).
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { DCGraph } from '../../src/alg/disco/graph/DCGraph.js';
import { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { registerDisco } from './disco-replay-dump.js';
import {
  encodeHex,
  type BoxEntry,
  type DebugEntry,
  type EdgeEntry,
  type ElkDump,
  type HexPoint,
} from './disco-replay-rows.js';

const FORCE_PROBE_OPTION = 'org.eclipse.elk.force.model';
const LAYERED_PROBE_OPTION = 'org.eclipse.elk.layered.spacing.baseValue';

/** Registers what the recorder registered: polyomino, DisCo (with PolyominoOptions beside it), force and layered. */
export function registerDiscoEngine(): void {
  registerDisco();
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(FORCE_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new ForceMetaDataProvider());
  }
  if (service.getOptionData(LAYERED_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph). */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerDiscoEngine();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

/** The layout node of a row: the root, or the nested child with the recorded id (the `ext*` rows' `g`). */
export function layoutNodeOf(root: ElkNode, layoutId: string): ElkNode {
  if (root.getIdentifier() === layoutId) {
    return root;
  }
  const found = [...root.getChildren()].find((child) => child.getIdentifier() === layoutId);
  if (found === undefined) {
    throw new Error(`no layout node ${layoutId}`);
  }
  return found;
}

const idOf = (element: ElkGraphElement): string => {
  const identifier = element.getIdentifier();
  if (identifier === null || identifier === '') {
    throw new Error(`element without identifier: ${String(element)}`);
  }
  return identifier;
};

const point = (x: number, y: number): HexPoint => [encodeHex(x), encodeHex(y)];

const box = (
  e: ElkGraphElement & { getX(): number; getY(): number; getWidth(): number; getHeight(): number },
): BoxEntry => ({
  id: idOf(e),
  x: encodeHex(e.getX()),
  y: encodeHex(e.getY()),
  w: encodeHex(e.getWidth()),
  h: encodeHex(e.getHeight()),
});

class Dump {
  graph!: BoxEntry;
  readonly nodes: BoxEntry[] = [];
  readonly ports: BoxEntry[] = [];
  readonly labels: BoxEntry[] = [];
  readonly edges: EdgeEntry[] = [];
  readonly debug: DebugEntry[] = [];

  run(top: ElkNode): void {
    this.graph = box(top);
    this.debugOf(top);
    this.labelsOf(top.getLabels());
    this.portsOf(top);
    this.visit(top);
  }

  private portsOf(node: ElkNode): void {
    for (const port of node.getPorts() as Iterable<ElkPort>) {
      this.ports.push(box(port));
      this.labelsOf(port.getLabels());
    }
  }

  private visit(parent: ElkNode): void {
    for (const node of parent.getChildren()) {
      this.nodes.push(box(node));
      this.debugOf(node);
      this.labelsOf(node.getLabels());
      this.portsOf(node);
      this.visit(node);
    }
    for (const edge of parent.getContainedEdges()) {
      this.edges.push(this.edgeEntry(edge));
      this.labelsOf(edge.getLabels());
    }
  }

  private edgeEntry(edge: ElkEdge): EdgeEntry {
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

  private labelsOf(labels: Iterable<ElkLabel>): void {
    for (const label of labels) {
      this.labels.push(box(label));
      this.labelsOf(label.getLabels());
    }
  }

  private debugOf(node: ElkNode): void {
    const polysSet = node.hasProperty(DisCoOptions.DEBUG_DISCO_POLYS);
    const graphSet = node.hasProperty(DisCoOptions.DEBUG_DISCO_GRAPH);
    if (!polysSet && !graphSet) {
      return;
    }
    let polys: number | null = null;
    let comps: number | null = null;
    let dims: HexPoint | null = null;
    if (polysSet) {
      polys = (node.getProperty(DisCoOptions.DEBUG_DISCO_POLYS) as readonly unknown[]).length;
    }
    if (graphSet) {
      const graph = node.getProperty(DisCoOptions.DEBUG_DISCO_GRAPH) as DCGraph;
      comps = graph.getComponents().size;
      const dimensions = graph.getDimensions();
      dims = dimensions === null ? null : point(dimensions.x, dimensions.y);
    }
    this.debug.push({ id: idOf(node), polys, comps, dims });
  }
}

/** The recorder's ELK dump of `top` (the root for a full row, the layout node for a stop). */
export function dumpElk(top: ElkNode): ElkDump {
  const dump = new Dump();
  dump.run(top);
  return {
    graph: dump.graph,
    nodes: dump.nodes,
    ports: dump.ports,
    labels: dump.labels,
    edges: dump.edges,
    debug: dump.debug,
  };
}
