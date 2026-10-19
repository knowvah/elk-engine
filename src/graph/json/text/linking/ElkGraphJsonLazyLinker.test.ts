// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { LazyEClass } from '../../../../xtext/linking/lazy/LazyLinkingMetamodel.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import { ElkNodeImpl } from '../../../impl/ElkNodeImpl.js';
import { ElkGraphJsonLazyLinker } from './ElkGraphJsonLazyLinker.js';
import {
  ELK_EDGE__SOURCES,
  ELK_EDGE_SECTION__OUTGOING_SECTIONS,
  ElkGraphJsonReferences,
} from './ElkGraphJsonReferences.js';
import { LazyURIEncoder } from '../../../../xtext/linking/lazy/LazyURIEncoder.js';

/** Exposes the two protected overrides. */
class Probe extends ElkGraphJsonLazyLinker {
  proxyType(obj: EObject, ref: EReferenceInfo): LazyEClass {
    return this.getProxyType(obj, ref);
  }

  instance(eClass: LazyEClass): InternalEObject {
    return this.createInstance(eClass);
  }
}

const probe = new Probe(
  new ElkGraphJsonReferences(),
  { getCrossReferenceNodes: () => null },
  new LazyURIEncoder({} as never, true),
);
const NO_OBJECT = {} as EObject;

describe('ElkGraphJsonLazyLinker', () => {
  it('proxies a reference to ElkConnectableShape as the instantiable ElkNode class', () => {
    const type = probe.proxyType(NO_OBJECT, ELK_EDGE__SOURCES);
    expect([type.getName(), type.isAbstract(), type.isInterface()]).toEqual(['ElkNode', false, false]);
    expect(type.getEPackage().getNsURI()).toBe('http://www.eclipse.org/elk/ElkGraph');
    expect(type.getEPackage().getEClassifiers()).toEqual([]);
    expect(type.isAssignableFrom(type)).toBe(true);
    expect(type.isAssignableFrom({ ...type, getName: () => 'ElkPort' })).toBe(false);
  });

  it('refuses a reference to another type', () => {
    expect(() => probe.proxyType(NO_OBJECT, ELK_EDGE_SECTION__OUTGOING_SECTIONS)).toThrow(
      new IllegalStateException("No proxy type for references to 'ElkEdgeSection'."),
    );
  });

  it('instantiates the proxy as a new ElkNodeImpl each time', () => {
    const type = probe.proxyType(NO_OBJECT, ELK_EDGE__SOURCES);
    const [first, second] = [probe.instance(type), probe.instance(type)];
    expect(first).toBeInstanceOf(ElkNodeImpl);
    expect(first).not.toBe(second);
  });

  it('refuses to instantiate any other class', () => {
    const other = { getName: () => 'ElkPort' } as LazyEClass;
    expect(() => probe.instance(other)).toThrow(new IllegalStateException("No factory for 'ElkPort'."));
  });
});
