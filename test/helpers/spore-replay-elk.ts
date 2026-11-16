// SPDX-License-Identifier: EPL-2.0
// ELK side of the spore replay (mission 8c, T7; T11 reuses it for the real providers): registers what the recorder registered
// (tools/vectors/SporeLayoutVectors.java: SporeMetaDataProvider + SporeCompactionOptions + SporeOverlapRemovalOptions, ForceMetaDataProvider
// + ForceOptions, LayeredMetaDataProvider + LayeredOptions), imports a row's input, and dumps an ELK graph in the shape of the recorder's
// `dumpBody` (the header of that file is the contract): `graph` (the top node), `nodes` (descendants: each node, then its labels, its ports
// with their labels, then its children; then the node's contained edges with their labels), `ports`, `labels`, `edges` (sections only).
// `getAllProperties()` is never read here: the dump reads geometry only.
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
import { SporeMetaDataProvider } from '../../src/alg/spore/options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { encodeHex, type BoxEntry, type EdgeEntry, type ElkDump, type HexPoint } from './spore-replay-rows.js';

const SPORE_PROBE_OPTION = 'org.eclipse.elk.overlapRemoval.maxIterations';
const FORCE_PROBE_OPTION = 'org.eclipse.elk.force.model';
const LAYERED_PROBE_OPTION = 'org.eclipse.elk.layered.spacing.baseValue';

/** Registers the option models and algorithms of the recorder, once per module registry. */
export function registerSporeEngine(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(SPORE_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(
      new SporeMetaDataProvider(),
      new SporeCompactionOptions(),
      new SporeOverlapRemovalOptions(),
    );
  }
  if (service.getOptionData(FORCE_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new ForceMetaDataProvider(), new ForceOptions());
  }
  if (service.getOptionData(LAYERED_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new LayeredMetaDataProvider(), new LayeredOptions());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph, which names `elk.algorithm`). */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerSporeEngine();
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
  /** The recorder fails on a duplicate id (`unique`). */
  private readonly seen = new Set<string>();

  run(top: ElkNode): void {
    this.graph = box(top);
    this.unique(this.graph.id);
    this.labelsOf(top.getLabels());
    this.portsOf(top);
    this.visit(top);
  }

  private unique(id: string): void {
    if (this.seen.has(id)) {
      throw new Error(`duplicate element id ${id}`);
    }
    this.seen.add(id);
  }

  private portsOf(node: ElkNode): void {
    for (const port of node.getPorts() as Iterable<ElkPort>) {
      const entry = box(port);
      this.unique(entry.id);
      this.ports.push(entry);
      this.labelsOf(port.getLabels());
    }
  }

  private visit(parent: ElkNode): void {
    for (const node of parent.getChildren()) {
      const entry = box(node);
      this.unique(entry.id);
      this.nodes.push(entry);
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
    const id = idOf(edge);
    this.unique(id);
    const sections = [...edge.getSections()].map((section) => ({
      start: point(section.getStartX(), section.getStartY()),
      end: point(section.getEndX(), section.getEndY()),
      bends: [...section.getBendPoints()].map((b) => point(b.getX(), b.getY())),
    }));
    return { id, sections };
  }

  private labelsOf(labels: Iterable<ElkLabel>): void {
    for (const label of labels) {
      const entry = box(label);
      this.unique(entry.id);
      this.labels.push(entry);
      this.labelsOf(label.getLabels());
    }
  }
}

/** The recorder's ELK dump of `top` (the root for a full row and the end stop). */
export function dumpElk(top: ElkNode): ElkDump {
  const dump = new Dump();
  dump.run(top);
  return { graph: dump.graph, nodes: dump.nodes, ports: dump.ports, labels: dump.labels, edges: dump.edges };
}
