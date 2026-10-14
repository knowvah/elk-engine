// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import { NULLSCOPE, type IScope } from '../IScope.js';
import type { IScopeProvider } from '../IScopeProvider.js';
import { NODE_REFERENCE, Node } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { CaseInsensitivityHelper } from './CaseInsensitivityHelper.js';
import { DelegatingScopeProvider } from './DelegatingScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from './SingleResourceGlobalScopeProvider.js';
import { AbstractGlobalScopeDelegatingScopeProvider } from './AbstractGlobalScopeDelegatingScopeProvider.js';
import type { IGlobalScopeProvider } from '../IGlobalScopeProvider.js';

const marker: IScope = { getSingleElement: () => null, getElements: () => [], getAllElements: () => [] };

describe('CaseInsensitivityHelper', () => {
  it('does not ignore case by default, for any reference', () => {
    expect(new CaseInsensitivityHelper().isIgnoreCase(NODE_REFERENCE)).toBe(false);
  });

  it('answers with its flag', () => {
    expect(new CaseInsensitivityHelper(true).isIgnoreCase(NODE_REFERENCE)).toBe(true);
  });
});

describe('SingleResourceGlobalScopeProvider', () => {
  it('contributes nothing', () => {
    expect(new SingleResourceGlobalScopeProvider().getScope(Node.of('r'), NODE_REFERENCE, null)).toBe(NULLSCOPE);
  });
});

describe('DelegatingScopeProvider', () => {
  const recorded: Array<[EObject, EReferenceInfo]> = [];
  const delegate: IScopeProvider = {
    getScope: (context, reference) => {
      recorded.push([context, reference]);
      return marker;
    },
  };

  it('hands the request to its delegate and returns its scope', () => {
    const context = Node.of('a');
    const provider = new DelegatingScopeProvider(delegate);
    expect(provider.getScope(context, NODE_REFERENCE)).toBe(marker);
    expect(recorded).toEqual([[context, NODE_REFERENCE]]);
    expect(provider.getDelegate()).toBe(delegate);
  });

  it('can be given another delegate', () => {
    const provider = new DelegatingScopeProvider(delegate);
    const other: IScopeProvider = { getScope: () => NULLSCOPE };
    provider.setDelegate(other);
    expect(provider.getDelegate()).toBe(other);
    expect(provider.getScope(Node.of('a'), NODE_REFERENCE)).toBe(NULLSCOPE);
  });
});

describe('AbstractGlobalScopeDelegatingScopeProvider', () => {
  class Probe extends AbstractGlobalScopeDelegatingScopeProvider {
    constructor(global: IGlobalScopeProvider) {
      super(global, new CaseInsensitivityHelper(true));
    }
    getScope(): IScope {
      return NULLSCOPE;
    }
    global(context: object, filter: ((d: IEObjectDescription) => boolean) | null = null): IScope {
      return this.getGlobalScope(context, NODE_REFERENCE, filter);
    }
    ignoreCase(): boolean {
      return this.isIgnoreCase(NODE_REFERENCE);
    }
  }
  const seen: Array<unknown> = [];
  const global: IGlobalScopeProvider = {
    getScope: (context, _reference, filter) => {
      seen.push([context, filter]);
      return marker;
    },
  };

  it('asks the global scope provider without a filter by default', () => {
    const resource = Node.of('r');
    const probe = new Probe(global);
    expect(probe.global(resource)).toBe(marker);
    expect(seen).toEqual([[resource, null]]);
  });

  it('passes a filter on and uses the case helper', () => {
    const probe = new Probe(global);
    const filter = (): boolean => true;
    probe.global(Node.of('r'), filter);
    expect((seen[1] as unknown[])[1]).toBe(filter);
    expect(probe.ignoreCase()).toBe(true);
  });

  it('applies and removes a wrapper', () => {
    const probe = new Probe(global);
    probe.setWrapper({ wrap: () => NULLSCOPE });
    expect(probe.global(Node.of('r'))).toBe(NULLSCOPE);
    probe.setWrapper(null);
    expect(probe.global(Node.of('r'))).toBe(marker);
  });
});
