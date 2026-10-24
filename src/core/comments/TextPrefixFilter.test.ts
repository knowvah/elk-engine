// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { TextPrefixFilter } from './TextPrefixFilter.js';

const identity = (text: string): string => text;
const base = (): TextPrefixFilter<string> => new TextPrefixFilter<string>().withCommentTextProvider(identity);

describe('TextPrefixFilter (default: a prefix match rejects, case-insensitive)', () => {
  it('rejects a comment with the exact prefix', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('Note: hello')).toBe(false);
  });

  it('rejects a comment whose prefix differs only in case', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('NOTE: hello')).toBe(false);
  });

  it('accepts a comment without the prefix', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('hello Note:')).toBe(true);
  });

  it('accepts a comment shorter than the prefix', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('Not')).toBe(true);
  });

  it('rejects a comment equal to the prefix', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('note:')).toBe(false);
  });

  it('accepts empty comment text', () => {
    expect(base().addPrefix('Note:').eligibleForAttachment('')).toBe(true);
  });

  it('checks every prefix', () => {
    const f = base().addPrefix('A').addPrefix('Todo');
    expect(f.eligibleForAttachment('todo: x')).toBe(false);
    expect(f.eligibleForAttachment('xyz')).toBe(true);
  });
});

describe('TextPrefixFilter options', () => {
  it('matches case-sensitively on request', () => {
    const f = base().withCaseSensitiveMatching().addPrefix('Note:');
    expect(f.eligibleForAttachment('NOTE: hello')).toBe(true);
    expect(f.eligibleForAttachment('Note: hello')).toBe(false);
  });

  it('requires a prefix match for eligibility on request', () => {
    const f = base().withPrefixMatchRequiredForEligibility().addPrefix('Note:');
    expect(f.eligibleForAttachment('nOtE: hello')).toBe(true);
    expect(f.eligibleForAttachment('hello')).toBe(false);
    expect(f.eligibleForAttachment('')).toBe(false);
  });

  it('combines required match and case sensitivity', () => {
    const f = base().withPrefixMatchRequiredForEligibility().withCaseSensitiveMatching().addPrefix('Note:');
    expect(f.eligibleForAttachment('NOTE: hello')).toBe(false);
    expect(f.eligibleForAttachment('Note: hello')).toBe(true);
  });

  it('compares UTF-16 units of the prefix length', () => {
    expect(base().addPrefix('äb').eligibleForAttachment('ÄBc')).toBe(false);
  });

  it('rejects null and empty prefixes', () => {
    expect(() => base().addPrefix('')).toThrow(IllegalArgumentException);
    expect(() => base().addPrefix(null)).toThrow("Prefix cannot be null or empty. Wouldn't make sense.");
  });

  it('rejects a null text function', () => {
    expect(() => new TextPrefixFilter<string>().withCommentTextProvider(null)).toThrow(
      new TypeError('Comment text function cannot be null.'),
    );
  });

  it('validates configuration on preprocess', () => {
    const dataProvider = {} as never;
    expect(() => new TextPrefixFilter<string>().addPrefix('a').preprocess(dataProvider, false)).toThrow(
      new IllegalStateException('A comment text provider is required.'),
    );
    expect(() => base().preprocess(dataProvider, false)).toThrow('At least one prefix is required.');
    expect(() => base().addPrefix('a').preprocess(dataProvider, false)).not.toThrow();
  });
});
