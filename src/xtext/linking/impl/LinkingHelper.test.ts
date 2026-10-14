// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ValueConverterException } from '../../conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../conversion/ValueConverterWithValueException.js';
import type { IValueConverterService } from '../../conversion/IValueConverterService.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import { IllegalNodeException } from './IllegalNodeException.js';
import { LinkingHelper } from './LinkingHelper.js';

function node(text: string, ruleName = 'ID'): ICrossReferenceNode {
  return {
    ruleName,
    feature: 'target',
    index: 0,
    getText: () => text,
    getStartLine: () => 4,
    getSemanticElement: () => null,
  };
}

function converterThrowing(error: unknown): IValueConverterService {
  return {
    toValue: () => {
      throw error;
    },
    toString: (v) => String(v),
  };
}

describe('LinkingHelper', () => {
  it('returns the raw token text without converting', () => {
    const calls: string[] = [];
    const spy: IValueConverterService = { toValue: (s) => (calls.push(String(s)), 'x'), toString: String };
    expect(new LinkingHelper(spy).getCrossRefNodeAsString(node('^a'), false)).toBe('^a');
    expect(calls).toEqual([]);
  });

  it('converts the text with the rule of the node', () => {
    const seen: [string | null, string][] = [];
    const converter: IValueConverterService = {
      toValue: (s, rule) => (seen.push([s, rule]), 'a'),
      toString: String,
    };
    expect(new LinkingHelper(converter).getCrossRefNodeAsString(node('^a', 'ID'), true)).toBe('a');
    expect(seen).toEqual([['^a', 'ID']]);
  });

  it('answers null for a null converter result and stringifies other values', () => {
    const nulls: IValueConverterService = { toValue: () => null, toString: String };
    const numbers: IValueConverterService = { toValue: () => 42, toString: String };
    expect(new LinkingHelper(nulls).getCrossRefNodeAsString(node('a'), true)).toBeNull();
    expect(new LinkingHelper(numbers).getCrossRefNodeAsString(node('a'), true)).toBe('42');
  });

  it('takes the value of a ValueConverterWithValueException', () => {
    const withValue = new ValueConverterWithValueException('bad', null, 'recovered', null);
    const withNull = new ValueConverterWithValueException('bad', null, null, null);
    expect(new LinkingHelper(converterThrowing(withValue)).getCrossRefNodeAsString(node('a'), true)).toBe('recovered');
    expect(new LinkingHelper(converterThrowing(withNull)).getCrossRefNodeAsString(node('a'), true)).toBeNull();
  });

  it('wraps a ValueConverterException in an IllegalNodeException carrying the node', () => {
    const n = node('a');
    const helper = new LinkingHelper(converterThrowing(new ValueConverterException('bad name', n, null)));
    let caught: unknown;
    try {
      helper.getCrossRefNodeAsString(n, true);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(IllegalNodeException);
    expect((caught as IllegalNodeException).getNode()).toBe(n);
    expect((caught as IllegalNodeException).message).toBe(
      'org.eclipse.xtext.conversion.ValueConverterException: bad name',
    );
  });

  it('lets other errors propagate', () => {
    const helper = new LinkingHelper(converterThrowing(new RangeError('boom')));
    expect(() => helper.getCrossRefNodeAsString(node('a'), true)).toThrow(RangeError);
  });
});

describe('IllegalNodeException', () => {
  const n = node('a');

  it('takes a message, an optional cause, or the Throwable(cause) message', () => {
    const cause = new ValueConverterException(null, null, null);
    expect(new IllegalNodeException(n).message).toBe('');
    expect(new IllegalNodeException(n, 'text').message).toBe('text');
    const both = new IllegalNodeException(n, 'text', cause);
    expect([both.message, both.cause]).toEqual(['text', cause]);
    const fromCause = new IllegalNodeException(n, cause);
    expect([fromCause.message, fromCause.cause]).toEqual([
      'org.eclipse.xtext.conversion.ValueConverterException',
      cause,
    ]);
    expect(fromCause.getNode()).toBe(n);
    expect(fromCause.name).toBe('IllegalNodeException');
  });

  it('uses the plain message of a non-Xtext cause', () => {
    expect(new IllegalNodeException(n, new RangeError('r')).message).toBe('org.eclipse.xtext.conversion.RangeError: r');
  });
});
