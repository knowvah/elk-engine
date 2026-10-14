// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { QualifiedName } from '../naming/QualifiedName.js';
import { Node, NODE_CLASS_NAME } from '../../../test/helpers/xtext/ScopeFixture.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import { AbstractEObjectDescription } from './AbstractEObjectDescription.js';
import { EObjectDescription } from './EObjectDescription.js';
import { AliasedEObjectDescription } from './impl/AliasedEObjectDescription.js';

describe('EObjectDescription', () => {
  const node = Node.of('n');

  it('rejects a null name', () => {
    expect(() => new EObjectDescription(null as unknown as QualifiedName, node, null)).toThrow(TypeError);
    expect(() => new EObjectDescription(null as unknown as QualifiedName, node, null)).toThrow(
      'qualified name may not be null',
    );
  });

  it('describes an element under a qualified name', () => {
    const description = EObjectDescription.create(QualifiedName.create('a', 'b'), node);
    expect(description.getName().toString()).toBe('a.b');
    expect(description.getQualifiedName()).toBe(description.getName());
    expect(description.getEObjectOrProxy()).toBe(node);
    expect(description.getEClass().getName()).toBe(NODE_CLASS_NAME);
    expect(description.toString()).toBe('a.b');
  });

  it('creates from a simple name', () => {
    expect(EObjectDescription.create('a', node).getName().getSegments()).toEqual(['a']);
  });

  it('carries user data, empty by default and null-safe', () => {
    const none = EObjectDescription.create('a', node);
    expect(none.getUserData('k')).toBeNull();
    expect(none.getUserDataKeys()).toEqual([]);
    const nullData = EObjectDescription.create('a', node, null);
    expect(nullData.getUserData('k')).toBeNull();
    expect(nullData.getUserDataKeys()).toEqual([]);
    const data = EObjectDescription.create('a', node, new Map([['k', 'v']]));
    expect(data.getUserData('k')).toBe('v');
    expect(data.getUserData('missing')).toBeNull();
    expect(data.getUserDataKeys()).toEqual(['k']);
  });
});

describe('AliasedEObjectDescription', () => {
  const node = Node.of('n');
  const delegate = EObjectDescription.create(QualifiedName.create('full', 'n'), node, new Map([['k', 'v']]));
  const aliased = new AliasedEObjectDescription(QualifiedName.create('n'), delegate);

  it('has its own name and the rest of its delegate', () => {
    expect(aliased.getName().toString()).toBe('n');
    expect(aliased.getQualifiedName().toString()).toBe('full.n');
    expect(aliased.getEObjectOrProxy()).toBe(node);
    expect(aliased.getEClass().getName()).toBe(NODE_CLASS_NAME);
    expect(aliased.getUserData('k')).toBe('v');
    expect(aliased.getUserDataKeys()).toEqual(['k']);
    expect(aliased.getAliasedEObjectDescription()).toBe(delegate);
    expect(aliased.toString()).toBe('n');
  });
});

describe('AbstractEObjectDescription defaults', () => {
  it('has no user data and prints its name', () => {
    const node = Node.of('n');
    class Bare extends AbstractEObjectDescription {
      getName(): QualifiedName {
        return QualifiedName.create('bare');
      }
      getQualifiedName(): QualifiedName {
        return this.getName();
      }
      getEObjectOrProxy(): Node {
        return node;
      }
      getEClass(): EClass {
        return node.eClass();
      }
    }
    const bare = new Bare();
    expect(bare.getUserData('k')).toBeNull();
    expect(bare.getUserDataKeys()).toEqual([]);
    expect(bare.toString()).toBe('bare');
  });
});
