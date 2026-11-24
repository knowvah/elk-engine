// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/mrtree-units.json (mission 8a, T15; recorded by tools/vectors/MrTreeUnitVectors.java, whose header is
// the contract): JVM vectors for mrtree units the whole-pipeline ref cannot reach. Four groups: `edgeRouter` (EdgeRouter on
// hand-built graphs), `cyrusBeck` (its private, never-called method), `orderBalance` (a phase nothing references at the pin) and
// `average` (DoubleStream.average as EdgeRouter calls it). This module types and validates the file once, decodes hex doubles and
// builds the TGraphs the rows describe.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { canonicalHex } from './double-hex.js';
import { Direction } from '../../src/core/options/Direction.js';
import { TEdge } from '../../src/alg/mrtree/graph/TEdge.js';
import { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { TNode } from '../../src/alg/mrtree/graph/TNode.js';
import { EdgeRoutingMode } from '../../src/alg/mrtree/options/EdgeRoutingMode.js';
import { InternalProperties } from '../../src/alg/mrtree/options/InternalProperties.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { OrderWeighting } from '../../src/alg/mrtree/options/OrderWeighting.js';

export const EDGE_ROUTER_GROUP = 'edgeRouter';
export const CYRUS_BECK_GROUP = 'cyrusBeck';
export const ORDER_BALANCE_GROUP = 'orderBalance';
export const AVERAGE_GROUP = 'average';

/** The ref's `rowCounts` keys, header order. */
export const UNIT_ROW_GROUPS = [EDGE_ROUTER_GROUP, CYRUS_BECK_GROUP, ORDER_BALANCE_GROUP, AVERAGE_GROUP] as const;
export type UnitRowGroup = (typeof UNIT_ROW_GROUPS)[number];

const REF_PATH = ['test', 'golden', 'refs', 'java', 'mrtree-units.json'] as const;

/** 16 lowercase hex digits of `Double.doubleToLongBits` (NaN canonical, issue #72). */
export type Hex = string;

export interface GraphNodeSpec {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly level: number;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly ascension: boolean;
  readonly root?: boolean;
}

/** Input of the groups `edgeRouter` and `cyrusBeck` (recorder header). */
export interface GraphSpec {
  readonly name: string;
  readonly mode: string;
  readonly direction: string;
  readonly spacing: number;
  readonly texture: number;
  readonly bounds: readonly number[];
  readonly nodes: readonly GraphNodeSpec[];
  readonly edges: ReadonlyArray<readonly number[]>;
}

export interface GraphExpected {
  /** fully qualified Java exception class, or null */
  readonly error: string | null;
  readonly bends: ReadonlyArray<ReadonlyArray<readonly [Hex, Hex]>>;
}

export interface OrderBalanceInput {
  readonly parents: readonly number[];
  readonly weighting: string;
}

export interface OrderBalanceExpected {
  /** [FAN, DESCENDANTS, LEFTNEIGHBOR, RIGHTNEIGHBOR] per node, -1 = null */
  readonly props: ReadonlyArray<readonly [number, number, number, number]>;
  readonly out: ReadonlyArray<readonly number[]>;
  readonly reset: boolean;
}

export interface UnitRow<I, E> {
  readonly id: string;
  readonly group: UnitRowGroup;
  readonly input: I;
  readonly expected: E;
}

export type GraphRow = UnitRow<GraphSpec, GraphExpected>;
export type OrderBalanceRow = UnitRow<OrderBalanceInput, OrderBalanceExpected>;
export type AverageRow = UnitRow<readonly Hex[], { readonly bits: Hex }>;

export interface UnitRows {
  readonly rowCounts: Readonly<Record<UnitRowGroup, number>>;
  readonly rows: readonly UnitRow<unknown, unknown>[];
}

let cached: UnitRows | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parses and validates the envelope of the file (the shape of every row is the recorder's contract). */
export function parseUnitRows(text: string): UnitRows {
  const doc: unknown = JSON.parse(text);
  if (!isRecord(doc) || !isRecord(doc.rowCounts) || !Array.isArray(doc.rows)) {
    throw new TypeError('mrtree-units.json: unexpected envelope');
  }
  const counts = doc.rowCounts;
  for (const group of UNIT_ROW_GROUPS) {
    const actual = doc.rows.filter((r: unknown) => isRecord(r) && r.group === group).length;
    if (counts[group] !== actual) {
      throw new TypeError(`mrtree-units.json: rowCounts.${group} is ${String(counts[group])}, found ${String(actual)}`);
    }
  }
  return doc as unknown as UnitRows;
}

/** The rows of the landed ref (read once). */
export function loadUnitRows(): UnitRows {
  cached ??= parseUnitRows(readFileSync(path.join(repoRoot(), ...REF_PATH), 'utf8'));
  return cached;
}

/** The rows of one group, in file order. */
export function unitRowsOf<I, E>(group: UnitRowGroup): ReadonlyArray<UnitRow<I, E>> {
  return loadUnitRows().rows.filter((r) => r.group === group) as ReadonlyArray<UnitRow<I, E>>;
}

/** The double whose raw bits are the 16 hex digits. */
export function unhex(hex: Hex): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

/** The 16 lowercase hex digits of `value` as the recorder's `hex` writes them: raw bits, every NaN canonical (`Double.doubleToLongBits`, issue #72). */
export function hexOf(value: number): Hex {
  return canonicalHex(value);
}

/** Builds the TGraph of a graph row exactly as the recorder does (recorder header: groups edgeRouter and cyrusBeck). */
export function buildGraph(spec: GraphSpec): { readonly graph: TGraph; readonly edges: readonly TEdge[] } {
  const graph = new TGraph();
  graph.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.valueOf(spec.mode));
  graph.setProperty(MrTreeOptions.DIRECTION, Direction.valueOf(spec.direction));
  graph.setProperty(MrTreeOptions.SPACING_EDGE_NODE, spec.spacing);
  graph.setProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH, spec.texture);
  graph.setProperty(InternalProperties.GRAPH_XMIN, spec.bounds[0]!);
  graph.setProperty(InternalProperties.GRAPH_XMAX, spec.bounds[1]!);
  graph.setProperty(InternalProperties.GRAPH_YMIN, spec.bounds[2]!);
  graph.setProperty(InternalProperties.GRAPH_YMAX, spec.bounds[3]!);
  const nodes = spec.nodes.map((nd, id) => {
    const n = new TNode(id, graph, nd.label);
    n.getPosition().x = nd.x;
    n.getPosition().y = nd.y;
    n.getSize().x = nd.w;
    n.getSize().y = nd.h;
    n.setProperty(MrTreeOptions.TREE_LEVEL, nd.level);
    n.setProperty(InternalProperties.LEVELMIN, nd.levelMin);
    n.setProperty(InternalProperties.LEVELMAX, nd.levelMax);
    n.setProperty(InternalProperties.COMPACT_LEVEL_ASCENSION, nd.ascension);
    if (nd.root === true) {
      n.setProperty(InternalProperties.ROOT, true);
    }
    graph.getNodes().add(n);
    return n;
  });
  const edges = spec.edges.map(([s, t]) => {
    const e = new TEdge(nodes[s!]!, nodes[t!]!);
    e.getSource()!.getOutgoingEdges().add(e);
    e.getTarget()!.getIncomingEdges().add(e);
    graph.getEdges().add(e);
    return e;
  });
  return { graph, edges };
}

/**
 * Builds the state OrderBalance is run from (recorder header: group orderBalance): the tree, the weighting and the properties the
 * recorder read after the oracle's Root, Fan, Level and Neighbors processors (set directly, as those processors are not part of
 * the unit under test). The sibling properties are set (to the root) so that the phase's reset to null is observable.
 */
export function buildOrderBalanceGraph(
  input: OrderBalanceInput,
  expected: OrderBalanceExpected,
): { readonly graph: TGraph; readonly nodes: readonly TNode[] } {
  const graph = new TGraph();
  graph.setProperty(MrTreeOptions.WEIGHTING, OrderWeighting.valueOf(input.weighting));
  const nodes = input.parents.map((_, i) => new TNode(i, graph, `n${String(i)}`));
  nodes.forEach((n) => graph.getNodes().add(n));
  for (let i = 1; i < nodes.length; i++) {
    nodes[input.parents[i]!]!.addChild(nodes[i]!);
  }
  const ref = (i: number): TNode | null => (i < 0 ? null : nodes[i]!);
  nodes[0]!.setProperty(InternalProperties.ROOT, true);
  expected.props.forEach(([fan, descendants, left, right], i) => {
    const node = nodes[i]!;
    node.setProperty(InternalProperties.FAN, fan);
    node.setProperty(InternalProperties.DESCENDANTS, descendants);
    node.setProperty(InternalProperties.LEFTNEIGHBOR, ref(left));
    node.setProperty(InternalProperties.RIGHTNEIGHBOR, ref(right));
    node.setProperty(InternalProperties.LEFTSIBLING, nodes[0]!);
    node.setProperty(InternalProperties.RIGHTSIBLING, nodes[0]!);
  });
  return { graph, nodes };
}
