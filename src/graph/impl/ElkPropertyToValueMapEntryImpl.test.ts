// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { Property } from '../properties/Property.js';
import { EMapPropertyHolderImpl } from './EMapPropertyHolderImpl.js';
import { ElkPropertyToValueMapEntryImpl } from './ElkPropertyToValueMapEntryImpl.js';

/** The abstract holder, made concrete. */
class TestHolder extends EMapPropertyHolderImpl {}

const KEY = new Property<string>('org.example.key');
const OTHER = new Property<string>('org.example.other');

describe('ElkPropertyToValueMapEntryImpl', () => {
  it('starts with a null key and value', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    expect(entry.getTypedKey()).toBeNull();
    expect(entry.getTypedValue()).toBeNull();
    expect(entry.getKey()).toBeNull();
    expect(entry.getValue()).toBeNull();
  });

  it('reports the ElkPropertyToValueMapEntry EClass and has no contents', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    expect(entry.eClass().getName()).toBe('ElkPropertyToValueMapEntry');
    expect(entry.eContents().size()).toBe(0);
  });

  it('getKey/setKey and getValue/setValue go through the typed accessors', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    entry.setKey(KEY);
    expect(entry.getTypedKey()).toBe(KEY);
    entry.setTypedKey(OTHER);
    expect(entry.getKey()).toBe(OTHER);
    expect(entry.setValue('v1')).toBeNull();
    expect(entry.setValue('v2')).toBe('v1');
    expect(entry.getTypedValue()).toBe('v2');
    entry.setTypedValue(4);
    expect(entry.getValue()).toBe(4);
  });

  it('computes the hash from the key once and caches it', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    entry.setKey(KEY);
    expect(entry.getHash()).toBe(KEY.hashCode());
    entry.setKey(OTHER);
    expect(entry.getHash()).toBe(KEY.hashCode());
    entry.setHash(-1);
    expect(entry.getHash()).toBe(OTHER.hashCode());
    entry.setHash(42);
    expect(entry.getHash()).toBe(42);
  });

  it('hashes a null key to 0', () => {
    expect(new ElkPropertyToValueMapEntryImpl().getHash()).toBe(0);
  });

  it('prints "id -> value" with Java null text', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    expect(entry.toString()).toBe('null -> null');
    entry.setKey(KEY);
    entry.setValue('text');
    expect(entry.toString()).toBe('org.example.key -> text');
    entry.setValue({ toString: () => 'custom' });
    expect(entry.toString()).toBe('org.example.key -> custom');
  });

  it('returns the containing holder map, or null when uncontained', () => {
    expect(new ElkPropertyToValueMapEntryImpl().getEMap()).toBeNull();
    const holder = new TestHolder();
    holder.setProperty(KEY, 'v');
    const entry = holder.getProperties().entryList().get(0) as ElkPropertyToValueMapEntryImpl;
    expect(entry.getEMap()).toBe(holder.getProperties());
  });

  it('has no generated container feature to remove from', () => {
    expect(() => new ElkPropertyToValueMapEntryImpl().eBasicRemoveFromContainerFeature()).toThrow(
      new UnsupportedOperationException('eBasicRemoveFromContainerFeature: no generated case for feature 0'),
    );
  });
});
