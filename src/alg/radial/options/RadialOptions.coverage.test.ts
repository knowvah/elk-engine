// SPDX-License-Identifier: EPL-2.0
// RadialFactory.destroy (RadialOptions.java src-gen: `obj.dispose()`), mission 8a, T19.
import { describe, expect, it, vi } from 'vitest';
import { RadialFactory } from './RadialOptions.js';

describe('RadialFactory', () => {
  it('destroy disposes the provider', () => {
    const factory = new RadialFactory();
    const provider = factory.create();
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
