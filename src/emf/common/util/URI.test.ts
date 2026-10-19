// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from './URI.js';

const DOC = 'file:/models/a.elkj';
const FRAGMENT = '|3';

describe('URI', () => {
  it('splits a string at the first # into base and fragment', () => {
    const uri = URI.createURI(`${DOC}#${FRAGMENT}`);
    expect(uri.hasFragment()).toBe(true);
    expect(uri.fragment()).toBe(FRAGMENT);
    expect(uri.trimFragment().toString()).toBe(DOC);
    expect(uri.toString()).toBe(`${DOC}#${FRAGMENT}`);
  });

  it('keeps later # characters inside the fragment', () => {
    const uri = URI.createURI('a#b#c');
    expect(uri.fragment()).toBe('b#c');
    expect(uri.toString()).toBe('a#b#c');
  });

  it('reports no fragment, and trimFragment returns the same instance, without a #', () => {
    const uri = URI.createURI(DOC);
    expect(uri.hasFragment()).toBe(false);
    expect(uri.fragment()).toBeNull();
    expect(uri.trimFragment()).toBe(uri);
    expect(uri.toString()).toBe(DOC);
  });

  it('treats an empty fragment as a fragment and a lone fragment as an empty base', () => {
    const empty = URI.createURI(`${DOC}#`);
    expect(empty.hasFragment()).toBe(true);
    expect(empty.fragment()).toBe('');
    expect(empty.toString()).toBe(`${DOC}#`);
    const lone = URI.createURI('#x');
    expect(lone.trimFragment().toString()).toBe('');
    expect(lone.fragment()).toBe('x');
  });

  it('appendFragment adds, replaces, and leaves the URI unchanged for null', () => {
    const base = URI.createURI(DOC);
    const added = base.appendFragment(FRAGMENT);
    expect(added.toString()).toBe(`${DOC}#${FRAGMENT}`);
    expect(added.appendFragment('other').toString()).toBe(`${DOC}#other`);
    expect(base.appendFragment(null)).toBe(base);
    expect(added.appendFragment(null)).toBe(added);
    expect(base.hasFragment()).toBe(false);
  });

  it('round-trips createURI(appendFragment(...).toString())', () => {
    const uri = URI.createURI(DOC).appendFragment(FRAGMENT);
    expect(URI.createURI(uri.toString()).equals(uri)).toBe(true);
  });

  it('equals compares base and fragment, and rejects non-URIs', () => {
    const a = URI.createURI(`${DOC}#1`);
    expect(a.equals(a)).toBe(true);
    expect(a.equals(URI.createURI(`${DOC}#1`))).toBe(true);
    expect(a.equals(URI.createURI(`${DOC}#2`))).toBe(false);
    expect(a.equals(URI.createURI('file:/other.elkj#1'))).toBe(false);
    expect(a.equals(URI.createURI(DOC))).toBe(false);
    expect(URI.createURI(DOC).equals(a)).toBe(false);
    expect(a.equals(`${DOC}#1`)).toBe(false);
    expect(a.equals(null)).toBe(false);
  });
});
