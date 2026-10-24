// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { RuntimeException } from '../../java/lang/RuntimeException.js';
import { GraphIssue, Severity } from './GraphIssue.js';
import { GraphValidationException } from './GraphValidationException.js';

describe('GraphValidationException', () => {
  it('returns the issues it was built with and keeps the message', () => {
    const issues = [new GraphIssue(null, 'bad', Severity.ERROR)];
    const e = new GraphValidationException('invalid', issues);
    expect(e.getIssues()).toBe(issues);
    expect(e.message).toBe('invalid');
    expect(e.name).toBe('GraphValidationException');
    expect(e).toBeInstanceOf(RuntimeException);
  });

  it('has null issues when none were given', () => {
    expect(new GraphValidationException('m').getIssues()).toBeNull();
    expect(new GraphValidationException().message).toBe('');
  });
});
