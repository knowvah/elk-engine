// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { dotConverter, NODE_REFERENCE, Node } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { IValueConverterService } from '../../conversion/IValueConverterService.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { IScope } from '../../scoping/IScope.js';
import { NULLSCOPE } from '../../scoping/IScope.js';
import { DefaultLinkingService } from './DefaultLinkingService.js';
import { LinkingHelper } from './LinkingHelper.js';

const identity: IValueConverterService = { toValue: (s) => s, toString: (v) => String(v) };

function node(text: string): ICrossReferenceNode {
  return {
    ruleName: 'QualifiedId',
    feature: 'target',
    index: 0,
    getText: () => text,
    getStartLine: () => 1,
    getSemanticElement: () => null,
  };
}

function service(scope: IScope | null, converter = identity): DefaultLinkingService {
  return new DefaultLinkingService({ getScope: () => scope as IScope }, new LinkingHelper(converter), dotConverter);
}

describe('DefaultLinkingService', () => {
  const target = Node.of('b');
  const context: EObject = Node.of('a');
  const scope: IScope = {
    getSingleElement: (name: unknown) => (String(name) === 'b' ? EObjectDescription.create('b', target) : null),
    getElements: () => [],
    getAllElements: () => [],
  } as IScope;

  it('returns the single element of the scope for the converted link text', () => {
    expect(service(scope).getLinkedObjects(context, NODE_REFERENCE, node('b'))).toEqual([target]);
  });

  it('returns nothing for a name the scope does not know', () => {
    expect(service(scope).getLinkedObjects(context, NODE_REFERENCE, node('c'))).toEqual([]);
    expect(service(NULLSCOPE).getLinkedObjects(context, NODE_REFERENCE, node('b'))).toEqual([]);
  });

  it('returns nothing for an empty link text without asking the scope', () => {
    expect(service(null).getLinkedObjects(context, NODE_REFERENCE, node(''))).toEqual([]);
  });

  it('returns nothing when the converter yields null', () => {
    const nullConverter: IValueConverterService = { toValue: () => null, toString: (v) => String(v) };
    expect(service(null, nullConverter).getLinkedObjects(context, NODE_REFERENCE, node('b'))).toEqual([]);
  });

  it('returns nothing for a reference without a type', () => {
    const untyped = { ...NODE_REFERENCE, referenceType: null } as unknown as EReferenceInfo;
    expect(service(null).getLinkedObjects(context, untyped, node('b'))).toEqual([]);
  });

  it('throws an AssertionError for a null scope', () => {
    expect(() => service(null).getLinkedObjects(context, NODE_REFERENCE, node('b'))).toThrow(
      expect.objectContaining({
        name: 'AssertionError',
        message: expect.stringContaining('must not return null for context') as string,
      }) as Error,
    );
  });

  it('propagates a failure of the qualified name converter', () => {
    const throwing = new DefaultLinkingService({ getScope: () => scope }, new LinkingHelper(identity), {
      toString: () => '',
      toQualifiedName: (): never => {
        throw new IllegalArgumentException('Illegal qualified name: b');
      },
    });
    expect(() => throwing.getLinkedObjects(context, NODE_REFERENCE, node('b'))).toThrow('Illegal qualified name: b');
  });

  it('exposes the converted link text and its collaborators', () => {
    const provider = { getScope: () => scope };
    const helper = new LinkingHelper(identity);
    const s = new DefaultLinkingService(provider, helper, dotConverter);
    expect(s.getCrossRefNodeAsString(node('x.y'))).toBe('x.y');
    expect(s.getScopeProvider()).toBe(provider);
    expect((s as unknown as { getLinkingHelper(): LinkingHelper }).getLinkingHelper()).toBe(helper);
  });
});
