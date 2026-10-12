// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { BasicIndexOutOfBoundsException } from './BasicIndexOutOfBoundsException.js';

describe('BasicIndexOutOfBoundsException', () => {
  it('formats index and size like EMF and is an IndexOutOfBoundsException', () => {
    const e = new BasicIndexOutOfBoundsException(5, 2);
    expect(e.message).toBe('index=5, size=2');
    expect(e.name).toBe('BasicIndexOutOfBoundsException');
    expect(e).toBeInstanceOf(IndexOutOfBoundsException);
  });
});
