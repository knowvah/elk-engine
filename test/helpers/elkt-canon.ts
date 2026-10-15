// SPDX-License-Identifier: EPL-2.0
// The canonical tree of an ElkGraph for `.elkt` equality checks (T22): `canonNode` with every property list in key
// order. A property holder is a map (`getAllProperties()` is hash-bucket ordered, which depends on the insertion
// history), so its order is not part of the graph; everything else in `canonNode` is compared as is.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { canonNode } from './graph-json-canon.js';

const PROPERTIES = 'properties';

interface CanonProperty {
  readonly id: string;
  readonly text: string;
}

function sortProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortProperties);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = key === PROPERTIES ? sortedById(child as CanonProperty[]) : sortProperties(child);
  }
  return result;
}

function sortedById(properties: readonly CanonProperty[]): readonly CanonProperty[] {
  return [...properties].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** `canonNode(root)` with each `properties` array sorted by property id. */
export function canonGraph(root: ElkNode): unknown {
  return sortProperties(canonNode(root));
}

function blankPortPositions(value: unknown, inPorts = false): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => blankPortPositions(v, inPorts));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const position = inPorts && (key === 'x' || key === 'y');
    result[key] = position ? null : blankPortPositions(child, key === 'ports');
  }
  return result;
}

/**
 * `canonGraph(root)` with the x and y of every port blanked: the D3 equality rule as amended by D3a
 * (plans/conformance-corpus/decisions.md, user 2026-10-14). Every realworld `.elkt` carries laid-out port positions
 * its `.json` lacks, and the oracle's parses differ in exactly those fields; everything else is compared as is.
 * Only valid together with `portsWithLayoutRelevantPosition(root)` being empty for both graphs.
 */
export function canonGraphWithoutPortPositions(root: ElkNode): unknown {
  return blankPortPositions(canonGraph(root));
}

/** Port constraints under which ELK takes the port position itself as the layout (PortListSorter.java:44-47). */
const POSITION_CONSTRAINTS: ReadonlySet<PortConstraints> = new Set([
  PortConstraints.FIXED_POS,
  PortConstraints.FIXED_RATIO,
]);

function portReason(node: ElkNode, port: ElkPort): string | null {
  if (POSITION_CONSTRAINTS.has(node.getProperty(CoreOptions.PORT_CONSTRAINTS))) {
    return `constraints ${node.getProperty(CoreOptions.PORT_CONSTRAINTS).toString()}`;
  }
  if (!port.hasProperty(CoreOptions.PORT_SIDE) || port.getProperty(CoreOptions.PORT_SIDE) === PortSide.UNDEFINED) {
    return 'no side (ELK infers it from the position, LGraphUtil.calcPortSide)';
  }
  if (!port.hasProperty(CoreOptions.PORT_INDEX)) {
    return 'no port.index (FIXED_ORDER infers the order from positions, PortListSorter.java:44-47)';
  }
  return null;
}

function collectPorts(node: ElkNode, path: string, out: string[]): void {
  for (const port of node.getPorts()) {
    const reason = portReason(node, port);
    if (reason !== null) out.push(`${path}/${String(port.getIdentifier())}: ${reason}`);
  }
  for (const child of node.getChildren()) {
    collectPorts(child, `${path}/${String(child.getIdentifier())}`, out);
  }
}

/**
 * The ports whose input position ELK could read during layout: a node with `FIXED_POS`/`FIXED_RATIO` constraints,
 * a port without an explicit side, or a port without `port.index`. D3a excludes port positions from the D3
 * comparison only when this list is empty for both graphs, so the excluded fields cannot change a layout.
 */
export function portsWithLayoutRelevantPosition(root: ElkNode): string[] {
  const out: string[] = [];
  collectPorts(root, String(root.getIdentifier()), out);
  return out;
}
