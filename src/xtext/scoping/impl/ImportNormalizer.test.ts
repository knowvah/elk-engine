// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { QualifiedName } from '../../naming/QualifiedName.js';
import { qn } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { ImportNormalizer } from './ImportNormalizer.js';

const text = (name: QualifiedName | null): string | null => (name === null ? null : name.toString());

describe('ImportNormalizer construction', () => {
  it('rejects an empty namespace', () => {
    expect(() => new ImportNormalizer(QualifiedName.EMPTY, true, false)).toThrow(IllegalArgumentException);
    expect(() => new ImportNormalizer(QualifiedName.EMPTY, true, false)).toThrow(
      'Imported namespace must not be null / empty',
    );
  });

  it('rejects a null namespace', () => {
    expect(() => new ImportNormalizer(null as unknown as QualifiedName, true, false)).toThrow(IllegalArgumentException);
  });

  it('exposes its parts', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), true, false);
    expect(normalizer.getImportedNamespacePrefix().toString()).toBe('a.b');
    expect(normalizer.hasWildCard()).toBe(true);
    expect(normalizer.isIgnoreCase()).toBe(false);
  });
});

describe('ImportNormalizer.deresolve', () => {
  it('wildcard: strips the prefix from everything below it', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), true, false);
    expect(text(normalizer.deresolve(qn('a.b.c')))).toBe('c');
    expect(text(normalizer.deresolve(qn('a.b.c.d')))).toBe('c.d');
  });

  it('wildcard: not the namespace itself, nor anything outside, nor another case', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), true, false);
    expect(normalizer.deresolve(qn('a.b'))).toBeNull();
    expect(normalizer.deresolve(qn('a.x.c'))).toBeNull();
    expect(normalizer.deresolve(qn('A.B.c'))).toBeNull();
    expect(normalizer.deresolve(qn('a'))).toBeNull();
  });

  it('wildcard, ignoring case: matches the prefix in any case and keeps the rest as is', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), true, true);
    expect(text(normalizer.deresolve(qn('A.B.Cc')))).toBe('Cc');
    expect(normalizer.deresolve(qn('A.B'))).toBeNull();
    expect(normalizer.deresolve(qn('a.x.c'))).toBeNull();
  });

  it('exact: only the namespace itself, by its last segment', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), false, false);
    expect(text(normalizer.deresolve(qn('a.b')))).toBe('b');
    expect(normalizer.deresolve(qn('a.b.c'))).toBeNull();
    expect(normalizer.deresolve(qn('A.B'))).toBeNull();
  });

  it('exact, ignoring case: the namespace in any case, by the last segment as written', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), false, true);
    expect(text(normalizer.deresolve(qn('A.B')))).toBe('B');
    expect(normalizer.deresolve(qn('a.c'))).toBeNull();
  });
});

describe('ImportNormalizer.resolve', () => {
  it('nothing resolves an empty name', () => {
    expect(new ImportNormalizer(qn('a.b'), true, false).resolve(QualifiedName.EMPTY)).toBeNull();
    expect(new ImportNormalizer(qn('a.b'), false, false).resolve(QualifiedName.EMPTY)).toBeNull();
  });

  it('wildcard: appends the relative name to the prefix', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), true, false);
    expect(text(normalizer.resolve(qn('c')))).toBe('a.b.c');
    expect(text(normalizer.resolve(qn('c.d')))).toBe('a.b.c.d');
  });

  it('exact: the namespace for its last segment alone', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), false, false);
    expect(text(normalizer.resolve(qn('b')))).toBe('a.b');
    expect(normalizer.resolve(qn('c'))).toBeNull();
    expect(normalizer.resolve(qn('B'))).toBeNull();
    expect(normalizer.resolve(qn('x.b'))).toBeNull();
  });

  it('exact, ignoring case: the namespace with the last segment as written', () => {
    const normalizer = new ImportNormalizer(qn('a.b'), false, true);
    expect(text(normalizer.resolve(qn('B')))).toBe('a.B');
    expect(normalizer.resolve(qn('c'))).toBeNull();
    expect(normalizer.resolve(qn('x.b'))).toBeNull();
  });
});

describe('ImportNormalizer identity', () => {
  it('prints the namespace with a star for a wildcard', () => {
    expect(new ImportNormalizer(qn('a.b'), true, false).toString()).toBe('a.b.*');
    expect(new ImportNormalizer(qn('a.b'), false, false).toString()).toBe('a.b');
  });

  it('hashes by the Java formula (31-fold of wildcard, ignoreCase, prefix hash)', () => {
    // ((31 * 1 + 1231) * 31 + 1237) * 31 + hash(['a']) with hash(['a']) = 31 * 1 + 97
    expect(new ImportNormalizer(qn('a'), true, false).hashCode()).toBe(1251257);
  });

  it('equals by flags and prefix, ignoring case only when asked to', () => {
    const base = new ImportNormalizer(qn('a.b'), true, false);
    expect(base.equals(base)).toBe(true);
    expect(base.equals(new ImportNormalizer(qn('a.b'), true, false))).toBe(true);
    expect(base.equals(new ImportNormalizer(qn('A.b'), true, false))).toBe(false);
    expect(base.equals(new ImportNormalizer(qn('a.b'), false, false))).toBe(false);
    expect(base.equals(new ImportNormalizer(qn('a.b'), true, true))).toBe(false);
    expect(base.equals('a.b')).toBe(false);
    expect(base.equals(null)).toBe(false);
    const ignoring = new ImportNormalizer(qn('a.B'), true, true);
    const other = new ImportNormalizer(qn('A.b'), true, true);
    expect(ignoring.equals(other)).toBe(true);
    expect(ignoring.hashCode()).toBe(other.hashCode());
  });
});
