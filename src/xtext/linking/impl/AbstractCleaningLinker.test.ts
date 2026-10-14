// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicEList } from '../../../emf/common/util/BasicEList.js';
import type { EList } from '../../../emf/common/util/EList.js';
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import { AbstractCleaningLinker } from './AbstractCleaningLinker.js';
import type { ReferenceAccess } from './ReferenceAccess.js';

const CLASS: EClass = { getName: (): string => 'T' };

class T implements EObject {
  readonly children: T[];
  constructor(
    readonly id: string,
    ...children: T[]
  ) {
    this.children = children;
  }
  eClass(): EClass {
    return CLASS;
  }
  eContainer(): EObject | null {
    return null;
  }
  eContents(): EList<EObject> {
    const list = new BasicEList<EObject>();
    for (const c of this.children) list.add(c);
    return list;
  }
  eAllContents(): IterableIterator<EObject> {
    return this.children[Symbol.iterator]();
  }
}

const BASE: EReferenceInfo = {
  name: 'r',
  referenceType: { name: 'T', isAssignableFrom: () => true },
  upperBound: -1,
  unique: true,
  containment: false,
  container: false,
  derived: false,
  changeable: true,
  transient: false,
};

class Probe extends AbstractCleaningLinker {
  readonly unset: string[] = [];
  readonly events: string[] = [];

  constructor(references: readonly EReferenceInfo[]) {
    const unset: string[] = [];
    const access: ReferenceAccess = {
      getEAllReferences: () => references,
      getReference: () => null,
      eUnset: (obj, ref) => void unset.push(`${(obj as T).id}.${ref.name}`),
      eSet: () => undefined,
      eGetList: () => ({ addAll: () => false }),
    };
    super(access);
    this.unset = unset;
  }

  protected override doLinkModel(): void {
    this.events.push('do');
  }
  protected override beforeModelLinked(): void {
    this.events.push('before');
  }
  protected override afterModelLinked(): void {
    this.events.push('after');
  }

  clear(obj: EObject): void {
    this.clearReferences(obj);
  }
  contents(model: EObject): string[] {
    return [...this.getAllLinkableContents(model)].map((o) => (o as T).id);
  }
  clearAllRequired(): boolean {
    return this.isClearAllReferencesRequired();
  }
  producerOf(consumer: IDiagnosticConsumer): unknown {
    return this.createDiagnosticProducer(consumer);
  }
}

const NOOP_CONSUMER: IDiagnosticConsumer = { consume: () => undefined, hasConsumedDiagnostics: () => false };

describe('AbstractCleaningLinker', () => {
  it.each([
    ['plain', {}, true],
    ['containment', { containment: true }, false],
    ['container', { container: true }, false],
    ['derived', { derived: true }, false],
    ['unchangeable', { changeable: false }, false],
    ['transient', { transient: true }, false],
  ])('clearReference with a %s reference unsets=%s', (_label, flags, unsets) => {
    const probe = new Probe([{ ...BASE, ...flags }]);

    probe.clear(new T('x'));

    expect(probe.unset).toEqual(unsets ? ['x.r'] : []);
  });

  it('clears every reference of the object in declaration order', () => {
    const probe = new Probe([BASE, { ...BASE, name: 's' }]);

    probe.clear(new T('x'));

    expect(probe.unset).toEqual(['x.r', 'x.s']);
  });

  it('walks the model first, then its contents pre-order', () => {
    const model = new T('m', new T('a', new T('a1'), new T('a2')), new T('b'));

    expect(new Probe([]).contents(model)).toEqual(['m', 'a', 'a1', 'a2', 'b']);
  });

  it('calls before, do and after in order and requires clearing by default', () => {
    const probe = new Probe([]);

    probe.linkModel(new T('m'), NOOP_CONSUMER);

    expect(probe.events).toEqual(['before', 'do', 'after']);
    expect(probe.clearAllRequired()).toBe(true);
  });

  it('creates a linking diagnostic producer', () => {
    expect(new Probe([]).producerOf(NOOP_CONSUMER)).toHaveProperty('addDiagnostic');
  });
});
