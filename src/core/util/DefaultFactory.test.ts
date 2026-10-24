// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { DefaultFactory } from './DefaultFactory.js';

class Sample {
  readonly tag = 'sample';
}

describe('DefaultFactory', () => {
  it('create returns a new instance each call', () => {
    const factory = new DefaultFactory(Sample);
    const a = factory.create();
    const b = factory.create();
    expect(a).toBeInstanceOf(Sample);
    expect(b).toBeInstanceOf(Sample);
    expect(a).not.toBe(b);
  });

  it('destroy does nothing', () => {
    const factory = new DefaultFactory(Sample);
    const a = factory.create();
    expect(factory.destroy(a)).toBeUndefined();
    expect(a.tag).toBe('sample');
  });
});
