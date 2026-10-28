// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import { UnspecifiedSpacingException } from './SpacingsUnspecifiedSpacingException.js';

describe('UnspecifiedSpacingException', () => {
  it('is a RuntimeException named after the class', () => {
    const exception = new UnspecifiedSpacingException();
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('UnspecifiedSpacingException');
  });

  it('carries the optional message', () => {
    expect(new UnspecifiedSpacingException('no spacing for x').message).toBe('no spacing for x');
    expect(new UnspecifiedSpacingException().message).toBe('');
  });
});
