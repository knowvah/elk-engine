// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import { DepthFirstCompaction } from './DepthFirstCompaction.js';
import { Node } from './Node.js';
import { ScanlineOverlapCheck } from './ScanlineOverlapCheck.js';

// Drives every `spore` row of test/golden/refs/java/alg-common.json (AlgCommonVectors.java, ELK oracle on the JVM):
// scanline rows replay ScanlineOverlapCheck.sweep and compare the handler calls in order; dfc rows replay
// DepthFirstCompaction.compact (2- and 3-argument overloads) and compare every node position bit for bit.

type Hex = string;
type TreeSpec = readonly [number, ...TreeSpec[]];

interface ScanlineRow {
  name: string;
  kind: 'scanline';
  input: { rects: Hex[][]; vertices: Hex[][] };
  result: { pairs: number[][] };
}

interface DfcRow {
  name: string;
  kind: 'dfc';
  input: { rects: Hex[][]; vertices: Hex[][]; tree: TreeSpec; orthogonal: boolean };
  result: { nodes: Hex[][] };
}

const VECTORS_URL = new URL('../../../../test/golden/refs/java/alg-common.json', import.meta.url);
const spore = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { spore: (ScanlineRow | DfcRow)[] }).spore;
const scanlineRows = spore.filter((r): r is ScanlineRow => r.kind === 'scanline');
const dfcRows = spore.filter((r): r is DfcRow => r.kind === 'dfc');

const HEX_DIGITS = 16;
const view = new DataView(new ArrayBuffer(8));

/** Decodes the 16-hex-digit raw IEEE-754 bits the recorder wrote. */
function hexToDouble(hex: Hex): number {
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

/** Encodes a double as the recorder's 16-hex-digit raw bits. */
function doubleToHex(d: number): Hex {
  view.setFloat64(0, d);
  return view.getBigUint64(0).toString(HEX_DIGITS).padStart(HEX_DIGITS, '0');
}

function buildNodes(input: { rects: Hex[][]; vertices: Hex[][] }): Node[] {
  return input.rects.map((r, i) => {
    const [x, y, w, h] = r.map(hexToDouble) as [number, number, number, number];
    const [vx, vy] = (input.vertices[i] as Hex[]).map(hexToDouble) as [number, number];
    return new Node(new KVector(vx, vy), new ElkRectangle(x, y, w, h));
  });
}

function buildTree(spec: TreeSpec, nodes: readonly Node[]): Tree<Node> {
  const [index, ...children] = spec;
  const tree = new Tree<Node>(nodes[index] as Node);
  tree.children = children.map((c) => buildTree(c, nodes));
  return tree;
}

describe('spore vectors: ScanlineOverlapCheck', () => {
  it('replays all scanline rows', () => {
    expect(scanlineRows).toHaveLength(8);
  });

  it.each(scanlineRows.map((r) => [r.name, r] as const))('%s: overlap pairs in call order', (_name, row) => {
    const nodes = buildNodes(row.input);
    const pairs: number[][] = [];
    const check = new ScanlineOverlapCheck(
      { handle: (n1, n2) => pairs.push([nodes.indexOf(n1), nodes.indexOf(n2)]) },
      new SVGImage(null),
    );
    check.sweep(nodes);
    expect(pairs).toEqual(row.result.pairs);
  });
});

describe('spore vectors: DepthFirstCompaction', () => {
  it('replays all dfc rows', () => {
    expect(dfcRows).toHaveLength(10);
  });

  const positions = (nodes: readonly Node[]): Hex[][] =>
    nodes.map((n) => [n.vertex.x, n.vertex.y, n.rect.x, n.rect.y].map(doubleToHex));

  it.each(dfcRows.map((r) => [r.name, r] as const))('%s: bit-exact positions, 2-arg overload', (_name, row) => {
    const nodes = buildNodes(row.input);
    DepthFirstCompaction.compact(buildTree(row.input.tree, nodes), row.input.orthogonal);
    expect(positions(nodes)).toEqual(row.result.nodes);
  });

  it.each(dfcRows.map((r) => [r.name, r] as const))('%s: bit-exact positions, 3-arg overload', (_name, row) => {
    const nodes = buildNodes(row.input);
    DepthFirstCompaction.compact(buildTree(row.input.tree, nodes), row.input.orthogonal, null);
    expect(positions(nodes)).toEqual(row.result.nodes);
  });
});
