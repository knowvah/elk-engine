// SPDX-License-Identifier: EPL-2.0
// NS3 harness shared by the node-micro-layout replay (plans/alg-common-nodespacing/decisions.md#ns3): imports a
// recorded row's ELK JSON input, runs NodeMicroLayout bottom-up on every node with children and collects the NS6
// fields in the order of tools/vectors/NodeMicroLayoutVectors.java (`run`, `micro`, `collect`).
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { RuntimeException } from '../../src/java/lang/RuntimeException.js';
import { longBitsToDouble } from '../../src/java/lang/JavaDouble.js';

export type Hex = string;
export type HexQuad = readonly [Hex, Hex, Hex, Hex];

export interface HexNode {
  readonly id: string | null;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
  readonly margins: HexQuad;
  readonly padding: HexQuad;
}
export interface HexPort {
  readonly id: string | null;
  readonly x: Hex;
  readonly y: Hex;
}
export interface HexLabel {
  readonly id: string | null;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
}

/** `expected` of a row (decisions.md NS6): the collected elements, or the captured exception. */
export type ExpectedResult =
  | { readonly nodes: readonly HexNode[]; readonly ports: readonly HexPort[]; readonly labels: readonly HexLabel[] }
  | { readonly throws: { readonly class: string; readonly message: string } };

export type ReplayGroup = 'corpus' | 'curated' | 'variants' | 'sweep';

export interface ReplayRow {
  readonly id: string;
  readonly group: ReplayGroup;
  readonly labels: 'raw' | 'sized';
  readonly input: unknown;
  readonly expected: ExpectedResult;
}

export interface ReplayFile {
  readonly rowCounts: Readonly<Record<ReplayGroup, number>>;
  readonly rows: readonly ReplayRow[];
}

/** The decoded counterpart of {@link ExpectedResult}. */
export type ReplayResult =
  | {
      readonly nodes: readonly NodeValues[];
      readonly ports: readonly PortValues[];
      readonly labels: readonly LabelValues[];
    }
  | { readonly throws: { readonly class: string; readonly message: string } };

export interface NodeValues {
  readonly id: string | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly margins: readonly number[];
  readonly padding: readonly number[];
}
export interface PortValues {
  readonly id: string | null;
  readonly x: number;
  readonly y: number;
}
export interface LabelValues {
  readonly id: string | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** 16 hex digits of raw double bits (the `JavaVectors.hex` convention) to a double. */
export function decodeHex(hex: Hex): number {
  return longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
}

const decodeQuad = (quad: HexQuad): number[] => quad.map(decodeHex);

/** Decodes a recorded `expected` into plain numbers. */
export function decodeExpected(expected: ExpectedResult): ReplayResult {
  if ('throws' in expected) {
    return expected;
  }
  return {
    nodes: expected.nodes.map((n) => ({
      id: n.id,
      x: decodeHex(n.x),
      y: decodeHex(n.y),
      w: decodeHex(n.w),
      h: decodeHex(n.h),
      margins: decodeQuad(n.margins),
      padding: decodeQuad(n.padding),
    })),
    ports: expected.ports.map((p) => ({ id: p.id, x: decodeHex(p.x), y: decodeHex(p.y) })),
    labels: expected.labels.map((l) => ({
      id: l.id,
      x: decodeHex(l.x),
      y: decodeHex(l.y),
      w: decodeHex(l.w),
      h: decodeHex(l.h),
    })),
  };
}

/** NS3: post-order, `NodeMicroLayout` on every node with children (`NodeMicroLayoutVectors.micro`). */
export function microLayoutBottomUp(node: ElkNode): void {
  for (const child of node.getChildren()) {
    microLayoutBottomUp(child);
  }
  if (node.getChildren().size() !== 0) {
    NodeMicroLayout.forGraph(node).execute();
  }
}

interface Collected {
  readonly nodes: NodeValues[];
  readonly ports: PortValues[];
  readonly labels: LabelValues[];
}

function collectLabels(owner: ElkGraphElement, out: Collected): void {
  for (const label of owner.getLabels() as Iterable<ElkLabel>) {
    out.labels.push({
      id: label.getIdentifier(),
      x: label.getX(),
      y: label.getY(),
      w: label.getWidth(),
      h: label.getHeight(),
    });
    collectLabels(label, out);
  }
}

/** Model traversal order: node, its labels, its ports (each followed by its labels), then its children. */
function collect(node: ElkNode, out: Collected): void {
  const m = node.getProperty(CoreOptions.MARGINS);
  const p = node.getProperty(CoreOptions.PADDING);
  out.nodes.push({
    id: node.getIdentifier(),
    x: node.getX(),
    y: node.getY(),
    w: node.getWidth(),
    h: node.getHeight(),
    margins: [m.top, m.right, m.bottom, m.left],
    padding: [p.top, p.right, p.bottom, p.left],
  });
  collectLabels(node, out);
  for (const port of node.getPorts()) {
    out.ports.push({ id: port.getIdentifier(), x: port.getX(), y: port.getY() });
    collectLabels(port, out);
  }
  for (const child of node.getChildren()) {
    collect(child, out);
  }
}

/**
 * Imports the row input and runs the NS3 pass. A `RuntimeException` anywhere aborts the whole row and is recorded
 * as `{ class, message }` (the Java simple class name is the TS `name`); nothing partial is kept.
 */
export function replayRow(input: unknown): ReplayResult {
  const root = ElkGraphJson.forGraph(JSON.stringify(input)).toElk();
  try {
    microLayoutBottomUp(root);
  } catch (e) {
    if (e instanceof RuntimeException) {
      return { throws: { class: e.name, message: e.message } };
    }
    throw e;
  }
  const out: Collected = { nodes: [], ports: [], labels: [] };
  collect(root, out);
  return out;
}
