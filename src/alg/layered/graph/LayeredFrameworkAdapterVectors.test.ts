// SPDX-License-Identifier: EPL-2.0
// Replays the `adapters` group of test/golden/refs/java/layered-framework.json (mission 7a, T8): the two layered call
// sequences over LGraphAdapters (LabelAndNodeSizeProcessor.process, InnermostNodeMarginCalculator.process) run for
// every LGraph in pre-order, then every node of every graph (dump order) is compared at the AD-4 bar. This is also the
// end-to-end check for port alignment (BEGIN/END/JUSTIFIED) and non-zero N/S PORT_BORDER_OFFSET (6c follow-up).
import { describe, expect, it } from 'vitest';
import { NodeDimensionCalculation } from '../../common/nodespacing/NodeDimensionCalculation.js';
import {
  decodeHex,
  encodeHex,
  findImportTarget,
  importInput,
  loadLayeredFrameworkRows,
  TOLERANCE,
  type Hex,
  type LayeredFrameworkRow,
} from '../../../../test/helpers/layered-framework-replay.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import { ElkGraphTransformer } from './transform/ElkGraphTransformer.js';
import type { LGraph } from './LGraph.js';
import { Layer } from './Layer.js';
import { LGraphAdapters } from './LGraphAdapters.js';
import type { LLabel } from './LLabel.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';

type Pair = readonly [Hex, Hex];
type Quad = readonly [Hex, Hex, Hex, Hex];
interface LabelShape {
  readonly path: string;
  readonly pos: Pair;
  readonly size: Pair;
}
interface PortShape {
  readonly path: string;
  readonly pos: Pair;
  readonly size: Pair;
  readonly labels: readonly LabelShape[];
}
interface NodeShape {
  readonly path: string;
  readonly size: Pair;
  readonly margin: Quad;
  readonly padding: Quad;
  readonly ports: readonly PortShape[];
  readonly labels: readonly LabelShape[];
}
interface Outcome {
  readonly nodes?: readonly NodeShape[];
  readonly exception?: { readonly class: string; readonly message: string };
}

const BEGIN = 'BEGIN';
const END = 'END';
const JUSTIFIED = 'JUSTIFIED';
const ALIGNMENT_PREFIX = 'portAlignment.';
const BORDER_OFFSET = 'port.borderOffset';
const PORT_SIDE = 'port.side';
const NORTH_SOUTH = new Set(['NORTH', 'SOUTH']);

const pair = (x: number, y: number): Pair => [encodeHex(x), encodeHex(y)];
const quad = (m: { top: number; right: number; bottom: number; left: number }): Quad => [
  encodeHex(m.top),
  encodeHex(m.right),
  encodeHex(m.bottom),
  encodeHex(m.left),
];

/** Pre-order list of graphs and, per graph, its nodes: layerless first, then layer-only nodes (the recorder's Dump). */
function collect(root: LGraph): { graphs: LGraph[]; nodes: Map<LGraph, LNode[]> } {
  const graphs: LGraph[] = [];
  const nodes = new Map<LGraph, LNode[]>();
  const visit = (g: LGraph): void => {
    graphs.push(g);
    const list = [...g.getLayerlessNodes()];
    const seen = new Set<LNode>(list);
    for (const layer of g.getLayers()) {
      for (const n of layer.getNodes()) {
        if (!seen.has(n)) {
          seen.add(n);
          list.push(n);
        }
      }
    }
    nodes.set(g, list);
    for (const n of list) {
      const nested = n.getNestedGraph();
      if (nested !== null) {
        visit(nested);
      }
    }
  };
  visit(root);
  return { graphs, nodes };
}

const labelShapes = (labels: readonly LLabel[], owner: string): LabelShape[] =>
  labels.map((l, i) => ({
    path: `${owner}/l${String(i)}`,
    pos: pair(l.getPosition().x, l.getPosition().y),
    size: pair(l.getSize().x, l.getSize().y),
  }));

function nodeShape(gp: string, n: LNode, i: number): NodeShape {
  const np = `${gp}/n${String(i)}`;
  const p = n.getPadding();
  return {
    path: np,
    size: pair(n.getSize().x, n.getSize().y),
    margin: quad(n.getMargin()),
    padding: quad(p),
    ports: n.getPorts().map((port, j) => ({
      path: `${np}/p${String(j)}`,
      pos: pair(port.getPosition().x, port.getPosition().y),
      size: pair(port.getSize().x, port.getSize().y),
      labels: labelShapes(port.getLabels(), `${np}/p${String(j)}`),
    })),
    labels: labelShapes(n.getLabels(), np),
  };
}

/** `LayeredFrameworkVectors.layerAll` (X4): a new layer holding the graph's layerless nodes in list order. */
function layerAll(g: LGraph): void {
  const layer = new Layer(g);
  g.getLayers().push(layer);
  for (const n of [...g.getLayerlessNodes()]) {
    n.setLayer(layer);
  }
}

/** `LayeredFrameworkVectors.adaptersScenario`. */
function replay(row: LayeredFrameworkRow): Outcome {
  const root = importInput(row);
  try {
    const lgraph = new ElkGraphTransformer().importGraph(findImportTarget(root, row.target));
    const { graphs, nodes } = collect(lgraph);
    // X4: LGraphAdapter.getNodes() walks layers only, so each graph's layerless nodes go into one layer first
    for (const g of graphs) {
      layerAll(g);
    }
    for (const g of graphs) {
      NodeDimensionCalculation.calculateLabelAndNodeSizes(
        LGraphAdapters.adapt(g, true, true, (n) => n.getType() === NodeType.NORMAL),
      );
      NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(g, false))
        .excludeEdgeHeadTailLabels()
        .process();
    }
    return {
      nodes: graphs.flatMap((g, gi) => (nodes.get(g) as LNode[]).map((n, i) => nodeShape(`g${String(gi)}`, n, i))),
    };
  } catch (e) {
    if (e instanceof RuntimeException) {
      return { exception: { class: e.name, message: e.message } };
    }
    throw e;
  }
}

function hexDiffs(path: string, actual: readonly Hex[], expected: readonly Hex[]): string[] {
  if (actual.length !== expected.length) {
    return [`${path}.length: expected ${String(expected.length)}, actual ${String(actual.length)}`];
  }
  return expected.flatMap((e, i) => {
    const a = decodeHex(actual[i] as Hex);
    const x = decodeHex(e);
    return a === x || Math.abs(a - x) <= TOLERANCE
      ? []
      : [`${path}[${String(i)}]: expected ${String(x)}, actual ${String(a)}`];
  });
}

function labelDiffs(path: string, actual: readonly LabelShape[], expected: readonly LabelShape[]): string[] {
  if (actual.length !== expected.length) {
    return [`${path}.labels.length: expected ${String(expected.length)}, actual ${String(actual.length)}`];
  }
  return expected.flatMap((e, i) => {
    const a = actual[i] as LabelShape;
    const p = `${path}.labels[${String(i)}]`;
    return [
      ...(a.path === e.path ? [] : [`${p}.path: expected ${e.path}, actual ${a.path}`]),
      ...hexDiffs(`${p}.pos`, a.pos, e.pos),
      ...hexDiffs(`${p}.size`, a.size, e.size),
    ];
  });
}

function portDiffs(path: string, actual: readonly PortShape[], expected: readonly PortShape[]): string[] {
  if (actual.length !== expected.length) {
    return [`${path}.ports.length: expected ${String(expected.length)}, actual ${String(actual.length)}`];
  }
  return expected.flatMap((e, i) => {
    const a = actual[i] as PortShape;
    const p = `${path}.ports[${String(i)}]`;
    return [
      ...(a.path === e.path ? [] : [`${p}.path: expected ${e.path}, actual ${a.path}`]),
      ...hexDiffs(`${p}.pos`, a.pos, e.pos),
      ...hexDiffs(`${p}.size`, a.size, e.size),
      ...labelDiffs(p, a.labels, e.labels),
    ];
  });
}

function nodeDiffs(actual: readonly NodeShape[], expected: readonly NodeShape[]): string[] {
  if (actual.length !== expected.length) {
    return [`nodes.length: expected ${String(expected.length)}, actual ${String(actual.length)}`];
  }
  return expected.flatMap((e, i) => {
    const a = actual[i] as NodeShape;
    const p = `nodes[${String(i)}]`;
    return [
      ...(a.path === e.path ? [] : [`${p}.path: expected ${e.path}, actual ${a.path}`]),
      ...hexDiffs(`${p}.size`, a.size, e.size),
      ...hexDiffs(`${p}.margin`, a.margin, e.margin),
      ...hexDiffs(`${p}.padding`, a.padding, e.padding),
      ...portDiffs(p, a.ports, e.ports),
      ...labelDiffs(p, a.labels, e.labels),
    ];
  });
}

/** Every `layoutOptions` object of the ELK JSON input (any depth). */
function layoutOptionsOf(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    value.forEach((v) => layoutOptionsOf(v, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === 'layoutOptions' && v !== null && typeof v === 'object') {
        out.push(v as Record<string, unknown>);
      }
      layoutOptionsOf(v, out);
    }
  }
  return out;
}

function alignments(row: LayeredFrameworkRow): Set<string> {
  const found = new Set<string>();
  for (const o of layoutOptionsOf(row.input)) {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith(ALIGNMENT_PREFIX) && typeof v === 'string') {
        found.add(v);
      }
    }
  }
  return found;
}

function hasNorthSouthOffset(row: LayeredFrameworkRow): boolean {
  return layoutOptionsOf(row.input).some(
    (o) =>
      typeof o[PORT_SIDE] === 'string' &&
      NORTH_SOUTH.has(o[PORT_SIDE]) &&
      typeof o[BORDER_OFFSET] === 'string' &&
      Number(o[BORDER_OFFSET]) !== 0,
  );
}

const rows = loadLayeredFrameworkRows('adapters');

describe('layered-framework.json adapters rows', () => {
  it('has the recorded rows', () => {
    expect(rows.length).toBe(142);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const outcome = replay(row);
    if (row.exception !== undefined) {
      expect(outcome.exception).toEqual(row.exception);
      return;
    }
    expect(outcome.exception).toBeUndefined();
    const diffs = nodeDiffs(
      outcome.nodes as readonly NodeShape[],
      (row.expected as { nodes: readonly NodeShape[] }).nodes,
    );
    expect(diffs).toEqual([]);
  });

  it('exercises BEGIN, END, JUSTIFIED alignment and non-zero N/S border offsets', () => {
    const count = (kind: string): number => rows.filter((r) => alignments(r).has(kind)).length;
    expect(count(BEGIN)).toBeGreaterThan(0);
    expect(count(END)).toBeGreaterThan(0);
    expect(count(JUSTIFIED)).toBeGreaterThan(0);
    expect(rows.filter(hasNorthSouthOffset).length).toBeGreaterThan(0);
  });
});
