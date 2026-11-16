// SPDX-License-Identifier: EPL-2.0
// The generated factory's destroy (src-gen DisCoOptions.java:109-118: `obj.dispose()`) and its create (`new DisCoLayoutProvider()` then `initialize("")`).
import { describe, expect, it, vi } from 'vitest';
import { DisCoLayoutProvider } from '../DisCoLayoutProvider.js';
import { DiscoFactory } from './DisCoOptions.js';

describe('DiscoFactory (DisCoOptions.java:109-118)', () => {
  it('create returns a DisCoLayoutProvider and destroy disposes it', () => {
    const factory = new DiscoFactory();
    const provider = factory.create();
    expect(provider).toBeInstanceOf(DisCoLayoutProvider);
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
