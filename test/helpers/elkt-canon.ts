// SPDX-License-Identifier: EPL-2.0
// The canonical tree of an ElkGraph for `.elkt` equality checks (T22): `canonNode` with every property list in key
// order. A property holder is a map (`getAllProperties()` is hash-bucket ordered, which depends on the insertion
// history), so its order is not part of the graph; everything else in `canonNode` is compared as is.
import type { ElkNode } from '../../src/graph/ElkNode.js';
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
 * `canonGraph(root)` with the x and y of every port blanked: the comparison that confines a listed D3 difference to
 * its mechanism (the `.elkt` of a realworld model carries port positions its `.json` lacks). Only ever applied to
 * models already listed as differing; the primary D3 rule blanks nothing.
 */
export function canonGraphWithoutPortPositions(root: ElkNode): unknown {
  return blankPortPositions(canonGraph(root));
}
