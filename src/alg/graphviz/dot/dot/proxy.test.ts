// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../../../emf/common/util/URI.js';
import { DotFactory } from './DotFactory.js';
import type { DotEObject } from './DotPackage.js';

// Expected values: every generated toString starts with `if (eIsProxy()) return super.toString();`, so a proxy
// prints BasicEObjectImpl's form (class name, then the proxy URI) without the attribute list.

const F = DotFactory.eINSTANCE;
const IMPL = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

const KINDS: ReadonlyArray<readonly [string, () => DotEObject]> = [
  ['AttributeImpl', () => F.createAttribute()],
  ['AttributeStatementImpl', () => F.createAttributeStatement()],
  ['EdgeTargetImpl', () => F.createEdgeTarget()],
  ['NodeImpl', () => F.createNode()],
  ['PortImpl', () => F.createPort()],
  ['SubgraphImpl', () => F.createSubgraph()],
];

describe('toString of a proxy', () => {
  it.each(KINDS)('%s prints the base form only', (impl, create) => {
    const object = create();
    object.eSetProxyURI(URI.createURI('a.dot#/1'));
    expect(object.toString()).toBe(`${IMPL}${impl} (eProxyURI: a.dot#/1)`);
  });
});
