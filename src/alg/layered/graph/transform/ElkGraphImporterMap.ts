// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { LGraphElement } from '../LGraphElement.js';
import type { LNode } from '../LNode.js';

/**
 * Map between ElkGraph nodes / ports and the LGraph nodes / ports created for them
 * (`ElkGraphImporter.nodeAndPortMap`, a Java `HashMap` keyed by identity-hashed EMF objects). AD-10: it is only
 * ever read through `get` and written through `put`, never iterated, so the insertion-ordered `Map` is exact.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export type NodeAndPortMap = Map<ElkGraphElement, LGraphElement>;

/** Java's `nodeAndPortMap.get(key)`, where `get(null)` answers `null` as `HashMap` does. */
export function lookup(map: NodeAndPortMap, key: ElkGraphElement | null): LGraphElement | null {
  return key === null ? null : (map.get(key) ?? null);
}

/**
 * Java's `(LNode) nodeAndPortMap.get(key)` for an ElkNode key. Keys that are ElkNodes are only ever put with the
 * LNode created for them (`transformNode`), so the unchecked cast cannot fail.
 */
export function lookupNode(map: NodeAndPortMap, key: ElkGraphElement | null): LNode | null {
  return lookup(map, key) as LNode | null;
}
