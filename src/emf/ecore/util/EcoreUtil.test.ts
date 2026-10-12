// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EcoreUtil } from './EcoreUtil.js';

const PARENT = 0;
const THING_CLASS: EClass = { getName: () => 'Thing' };

/** Only a container pointer; containers are wired with `eBasicSetContainer`. */
class Thing extends BasicEObjectImpl {
  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return THING_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('unused');
  }

  protected override javaClassName(): string {
    return `Thing(${this.id})`;
  }
}

/** Builds `parent <- child` links from `[child, parent]` pairs. */
function tree(...links: Array<[string, string]>): Record<string, Thing> {
  const things: Record<string, Thing> = {};
  const at = (id: string): Thing => (things[id] ??= new Thing(id));
  for (const [child, parent] of links) {
    at(child).eBasicSetContainer(at(parent), PARENT);
  }
  return things;
}

describe('EcoreUtil.isAncestor', () => {
  it('is reflexive and follows the container chain upwards only', () => {
    const t = tree(['n1', 'g'], ['n2', 'n1']);
    const [g, n1, n2] = [t['g'], t['n1'], t['n2']] as [Thing, Thing, Thing];
    expect(EcoreUtil.isAncestor(n1, n1)).toBe(true);
    expect(EcoreUtil.isAncestor(g, n2)).toBe(true);
    expect(EcoreUtil.isAncestor(n2, g)).toBe(false);
    expect(EcoreUtil.isAncestor(null, n2)).toBe(false);
    expect(EcoreUtil.isAncestor(g, null)).toBe(false);
  });

  it('stops when a cycle returns to the start', () => {
    const t = tree(['n1', 'n2'], ['n2', 'n1']);
    expect(EcoreUtil.isAncestor(new Thing('g'), t['n1'] as Thing)).toBe(false);
    expect(EcoreUtil.isAncestor(t['n2'] as Thing, t['n1'] as Thing)).toBe(true);
  });

  it('restarts inside a cycle that does not contain the start after 100000 steps', () => {
    const t = tree(['x', 'a'], ['a', 'b'], ['b', 'a']);
    expect(EcoreUtil.isAncestor(new Thing('g'), t['x'] as Thing)).toBe(false);
    expect(EcoreUtil.isAncestor(t['b'] as Thing, t['x'] as Thing)).toBe(true);
  });
});

describe('EcoreUtil.getRootContainer', () => {
  it('returns the topmost container, the object itself when uncontained, and null for null', () => {
    const t = tree(['n1', 'g'], ['n2', 'n1']);
    expect(EcoreUtil.getRootContainer(t['n2'] as Thing)).toBe(t['g']);
    expect(EcoreUtil.getRootContainer(t['g'] as Thing)).toBe(t['g']);
    expect(EcoreUtil.getRootContainer(null)).toBeNull();
  });

  it('throws IllegalStateException on a cycle through the object', () => {
    const t = tree(['n1', 'n2'], ['n2', 'n1']);
    expect(() => EcoreUtil.getRootContainer(t['n1'] as Thing)).toThrow(
      new IllegalStateException('There is a cycle in the containment hierarchy of Thing(n1)'),
    );
  });

  it('restarts inside a cycle that does not contain the object after 100000 steps', () => {
    const t = tree(['x', 'a'], ['a', 'b'], ['b', 'a']);
    expect(() => EcoreUtil.getRootContainer(t['x'] as Thing)).toThrow(
      new IllegalStateException('There is a cycle in the containment hierarchy of Thing(a)'),
    );
  });
});
