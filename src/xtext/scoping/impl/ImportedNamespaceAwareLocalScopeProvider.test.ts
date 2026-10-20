// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { EObjectDescription } from '../../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import { ResourceScopeCache } from '../../util/ResourceScopeCache.js';
import { CaseInsensitivityHelper } from './CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from './ImportedNamespaceAwareLocalScopeProvider.js';
import { ImportNormalizer } from './ImportNormalizer.js';
import { SingleResourceGlobalScopeProvider } from './SingleResourceGlobalScopeProvider.js';
import { isCoverageRun } from '../../../../test/helpers/coverage-run.js';
import {
  dotConverter,
  NODE_REFERENCE,
  Node,
  namesOf,
  newScopeProvider,
  nodeNameProvider,
  qn,
} from '../../../../test/helpers/xtext/ScopeFixture.js';

/** `getSingleElement` of the scope for `context` by dotted name: the described node, or null. */
function lookup(context: Node, text: string, ignoreCase = false): EObject | null {
  const scope = newScopeProvider(ignoreCase).getScope(context, NODE_REFERENCE);
  return scope.getSingleElement(qn(text))?.getEObjectOrProxy() ?? null;
}

describe('toy tree root{a{p},b}', () => {
  const p = Node.of('p');
  const a = Node.of('a', p);
  const b = Node.of('b');
  const root = Node.of('root', a, b);

  it('resolves a name relative to the owning container', () => {
    expect(lookup(a, 'p')).toBe(p);
    expect(lookup(root, 'a')).toBe(a);
    expect(lookup(root, 'b')).toBe(b);
  });

  it('resolves siblings and ancestors by their short name from inside', () => {
    expect(lookup(p, 'b')).toBe(b);
    expect(lookup(p, 'a')).toBe(a);
  });

  it('resolves a qualified name from outside, relative to the container', () => {
    expect(lookup(b, 'a.p')).toBe(p);
    expect(lookup(root, 'a.p')).toBe(p);
  });

  it('resolves the full name from anywhere, including an ancestor by its own name', () => {
    expect(lookup(p, 'root')).toBe(root);
    expect(lookup(p, 'root.a.p')).toBe(p);
    expect(lookup(b, 'root.a')).toBe(a);
  });

  it('does not see the short name of a nested element from outside its container', () => {
    expect(lookup(b, 'p')).toBeNull();
    expect(lookup(root, 'p')).toBeNull();
  });

  it('returns the shortest visible alias first in the reverse lookup, then longer ones', () => {
    expect(namesOf(newScopeProvider().getScope(a, NODE_REFERENCE).getElements(p))).toEqual(['p', 'a.p', 'root.a.p']);
    expect(namesOf(newScopeProvider().getScope(root, NODE_REFERENCE).getElements(p))).toEqual(['a.p', 'root.a.p']);
    expect(namesOf(newScopeProvider().getScope(b, NODE_REFERENCE).getElements(p))).toEqual(['a.p', 'root.a.p']);
    const single = newScopeProvider().getScope(p, NODE_REFERENCE).getSingleElement(p);
    expect(single?.getName().toString()).toBe('p');
    expect(single?.getQualifiedName().toString()).toBe('root.a.p');
  });

  it('returns no description for an element that is not in the resource', () => {
    const stranger = Node.of('s');
    expect(newScopeProvider().getScope(a, NODE_REFERENCE).getSingleElement(stranger)).toBeNull();
  });
});

describe('shadowing and duplicates', () => {
  it('lets an inner element shadow an outer one of the same name', () => {
    const innerX = Node.of('x');
    const y = Node.of('y');
    const a = Node.of('a', innerX, y);
    const outerX = Node.of('x');
    const root = Node.of(null, outerX, a);
    expect(lookup(y, 'x')).toBe(innerX);
    expect(lookup(a, 'x')).toBe(innerX);
    expect(lookup(root, 'x')).toBe(outerX);
    expect(lookup(root, 'a.x')).toBe(innerX);
  });

  it('shadows over three levels', () => {
    const x3 = Node.of('x');
    const b = Node.of('b', x3);
    const x2 = Node.of('x');
    const a = Node.of('a', x2, b);
    const x1 = Node.of('x');
    Node.of(null, x1, a);
    expect(lookup(b, 'x')).toBe(x3);
    expect(lookup(a, 'x')).toBe(x2);
  });

  it('finds the first of duplicate siblings and the children of both', () => {
    const p1 = Node.of('p1');
    const p2 = Node.of('p2');
    const first = Node.of('a', p1);
    const second = Node.of('a', p2);
    const root = Node.of(null, first, second);
    expect(lookup(root, 'a')).toBe(first);
    expect(lookup(root, 'a.p1')).toBe(p1);
    expect(lookup(root, 'a.p2')).toBe(p2);
  });

  it('finds the first of duplicate ports and no later duplicate by element', () => {
    const first = Node.of('p');
    const second = Node.of('p');
    const a = Node.of('a', first, second);
    const root = Node.of(null, a);
    expect(lookup(root, 'a.p')).toBe(first);
    const scope = newScopeProvider().getScope(root, NODE_REFERENCE);
    expect(scope.getSingleElement(first)?.getName().toString()).toBe('a.p');
    expect(scope.getSingleElement(second)).toBeNull();
  });

  it('is case sensitive unless the helper says otherwise', () => {
    const lower = Node.of('a');
    const upper = Node.of('A');
    const root = Node.of(null, lower, upper);
    expect(lookup(root, 'a')).toBe(lower);
    expect(lookup(root, 'A')).toBe(upper);
    expect(lookup(root, 'B')).toBeNull();
    expect(lookup(root, 'A', true)).toBe(lower);
  });
});

describe('root naming', () => {
  it('makes a named root a prefix, a valid endpoint, and keeps the short names', () => {
    const a = Node.of('a');
    const b = Node.of('b');
    const g = Node.of('g', a, b);
    expect(lookup(g, 'a')).toBe(a);
    expect(lookup(g, 'g.a')).toBe(a);
    expect(lookup(g, 'g')).toBe(g);
    expect(lookup(a, 'g')).toBe(g);
  });

  it('resolves only the dotted full name of nested elements of an unnamed root', () => {
    const c = Node.of('c');
    const b = Node.of('b', c);
    const a = Node.of('a', b);
    const z = Node.of('z');
    const root = Node.of(null, a, z);
    expect(lookup(root, 'b')).toBeNull();
    expect(lookup(root, 'b.c')).toBeNull();
    expect(lookup(root, 'a.b.c')).toBe(c);
    expect(lookup(a, 'b.c')).toBe(c);
    expect(lookup(a, 'a.b.c')).toBe(c);
  });

  it('resolves ancestors by short name from deep inside', () => {
    const c = Node.of('c');
    const b = Node.of('b', c);
    const a = Node.of('a', b);
    const top = Node.of('top');
    Node.of(null, top, a);
    expect(lookup(c, 'top')).toBe(top);
    expect(lookup(c, 'a')).toBe(a);
    expect(lookup(c, 'b')).toBe(b);
  });

  it('does not resolve a name with spaces around the dot', () => {
    const b = Node.of('b');
    const root = Node.of(null, Node.of('a', b));
    expect(scopeLookupByText(root, 'a . b')).toBeNull();
  });
});

function scopeLookupByText(context: Node, text: string): IEObjectDescription | null {
  return newScopeProvider().getScope(context, NODE_REFERENCE).getSingleElement(dotConverter.toQualifiedName(text));
}

describe('getAllElements of the provider chain', () => {
  it('lists the container-relative names first, then the names relative to the ancestors, then the full names', () => {
    const p = Node.of('p');
    const a = Node.of('a', p);
    Node.of('root', a);
    const all = newScopeProvider().getScope(a, NODE_REFERENCE).getAllElements();
    expect(namesOf(all)).toEqual(['p', 'a', 'a.p', 'root', 'root.a', 'root.a.p']);
  });
});

describe('extension points', () => {
  it('has no wildcard import below the root and exposes its collaborators', () => {
    const provider = newScopeProvider();
    expect(provider.getWildCard()).toBe('*');
    expect(provider.getQualifiedNameProvider()).toBe(nodeNameProvider);
    expect(provider.getQualifiedNameConverter()).toBe(dotConverter);
  });

  /** A provider whose elements declare imported namespaces by their id prefix `import:`. */
  class ImportingProvider extends ImportedNamespaceAwareLocalScopeProvider {
    constructor(private readonly implicit: readonly ImportNormalizer[] = []) {
      super(
        new SingleResourceGlobalScopeProvider(),
        nodeNameProvider,
        dotConverter,
        new CaseInsensitivityHelper(false),
        new ResourceScopeCache(),
      );
    }
    protected override getImportedNamespace(object: EObject): string | null {
      const id = (object as Node).id;
      return id?.startsWith('import:') === true ? id.slice('import:'.length) : null;
    }
    protected override getImplicitImports(): readonly ImportNormalizer[] {
      return this.implicit;
    }
    resolver(text: string | null, ignoreCase: boolean): ImportNormalizer | null {
      return this.createImportedNamespaceResolver(text, ignoreCase);
    }
  }

  it('builds a wildcard normalizer from a trailing star', () => {
    const provider = new ImportingProvider();
    const wildcard = provider.resolver('a.b.*', false);
    expect(wildcard?.hasWildCard()).toBe(true);
    expect(wildcard?.getImportedNamespacePrefix().toString()).toBe('a.b');
    const exact = provider.resolver('a.b', false);
    expect(exact?.hasWildCard()).toBe(false);
    expect(exact?.getImportedNamespacePrefix().toString()).toBe('a.b');
  });

  it('builds no normalizer for an empty text or a lone star', () => {
    const provider = new ImportingProvider();
    expect(provider.resolver(null, false)).toBeNull();
    expect(provider.resolver('', false)).toBeNull();
    expect(provider.resolver('*', false)).toBeNull();
  });

  it('recognises the star ignoring case without changing it', () => {
    const provider = new ImportingProvider();
    expect(provider.resolver('a.*', true)?.isIgnoreCase()).toBe(true);
  });

  it('builds nothing when the converter yields an empty name', () => {
    const provider = new ImportedNamespaceAwareLocalScopeProvider(
      new SingleResourceGlobalScopeProvider(),
      nodeNameProvider,
      { toString: (n) => n.toString(), toQualifiedName: () => qn('x').skipFirst(1) },
      new CaseInsensitivityHelper(false),
      new ResourceScopeCache(),
    );
    const create = (provider as unknown as { createImportedNamespaceResolver(t: string, i: boolean): unknown })
      .createImportedNamespaceResolver;
    expect(create.call(provider, 'anything', false)).toBeNull();
  });

  it('makes an imported element visible under its last segment', () => {
    // root{ lib{ item }, app{ import:lib.item } }: the exact import `lib.item` (found as root.lib.item
    // through the parent scopes) is visible inside app as `item`
    const item = Node.of('item');
    const lib = Node.of('lib', item);
    const app = Node.of('app', Node.of('import:lib.item'));
    Node.of('root', lib, app);
    const scope = new ImportingProvider().getScope(app, NODE_REFERENCE);
    const imported = scope.getSingleElement(qn('item'));
    expect(imported?.getEObjectOrProxy()).toBe(item);
    expect(imported?.getName().toString()).toBe('item');
    expect(imported?.getQualifiedName().toString()).toBe('root.lib.item');
    expect(
      new ImportingProvider().getScope(lib, NODE_REFERENCE).getSingleElement(qn('item'))?.getName().toString(),
    ).toBe('item');
  });

  it('puts the implicit imports below the resource scope', () => {
    const item = Node.of('item');
    const lib = Node.of('lib', item);
    const root = Node.of('root', lib);
    const provider = new ImportingProvider([new ImportNormalizer(qn('root.lib'), true, false)]);
    // implicit imports apply to the global scope, which is empty: nothing new is visible
    expect(provider.getScope(root, NODE_REFERENCE).getSingleElement(qn('item'))).toBeNull();
    expect(provider.getScope(root, NODE_REFERENCE).getSingleElement(qn('lib.item'))?.getEObjectOrProxy()).toBe(item);
  });

  it('wraps the global scope with an installed wrapper', () => {
    const root = Node.of('root');
    const replacement = Node.of('other');
    const provider = new ImportingProvider();
    provider.setWrapper({
      wrap: () => ({
        getSingleElement: () => EObjectDescription.create('wrapped', replacement),
        getElements: () => [],
        getAllElements: () => [],
      }),
    });
    expect(provider.getScope(root, NODE_REFERENCE).getSingleElement(qn('wrapped'))?.getEObjectOrProxy()).toBe(
      replacement,
    );
  });
});

// About 85 ms on a performance core; macOS may run a vitest worker on an efficiency core instead (230-330 ms alone,
// 363-450 ms under suite load). 450 ms plus 25%, rounded up (follow-up C5); quadratic lookups would take seconds.
const LOOKUP_BUDGET_MS = 600;
// V8 coverage instrumentation slows tight loops about threefold; the looser bound still catches quadratic behaviour.
const INSTRUMENTED_LOOKUP_BUDGET_MS = 1000;
const TIMED_RUNS = 3;
const LOOKUPS = 5000;

describe('performance budget', () => {
  it(`answers 5,000 qualified lookups on a 20,000 object tree in under ${LOOKUP_BUDGET_MS} ms (best of three runs, JIT warm)`, () => {
    const groups: Node[] = [];
    for (let g = 0; g < 100; g++) {
      const members: Node[] = [];
      for (let m = 0; m < 199; m++) members.push(Node.of(`m${m}`));
      groups.push(Node.of(`g${g}`, ...members));
    }
    const root = Node.of('root', ...groups); // 1 + 100 + 19,900 = 20,001 objects
    const target = groups[57]?.children[123] as Node;
    // Each run uses a fresh provider (and so a fresh scope cache), so every run does the same work.
    const runs = Array.from({ length: TIMED_RUNS }, () => {
      const provider = newScopeProvider();
      const start = performance.now();
      let found = 0;
      for (let i = 0; i < LOOKUPS; i++) {
        const context = groups[i % groups.length]?.children[i % 199] as Node;
        const hit = provider.getScope(context, NODE_REFERENCE).getSingleElement(qn('g57.m123'));
        if (hit?.getEObjectOrProxy() === target) found++;
      }
      return { found, elapsed: performance.now() - start };
    });
    expect(runs.map((r) => r.found)).toEqual(Array.from({ length: TIMED_RUNS }, () => LOOKUPS));
    expect(root.children).toHaveLength(100);
    expect(Math.min(...runs.map((r) => r.elapsed))).toBeLessThan(
      isCoverageRun() ? INSTRUMENTED_LOOKUP_BUDGET_MS : LOOKUP_BUDGET_MS,
    );
  });
});
