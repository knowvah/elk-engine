// SPDX-License-Identifier: EPL-2.0
// The generated EDGE_LABELS_INLINE accessor default (StressOptions.java:50 `true`), and the generated factory's destroy (src-gen StressOptions.java:130-139: `obj.dispose()`) and its create (`new StressLayoutProvider()` then `initialize("")`).
import { describe, expect, it, vi } from 'vitest';
import { StressLayoutProvider } from '../stress/StressLayoutProvider.js';
import { StressFactory, StressOptions } from './StressOptions.js';

describe('StressFactory (StressOptions.java:130-139)', () => {
  it('create returns a StressLayoutProvider and destroy disposes it', () => {
    const factory = new StressFactory();
    const provider = factory.create();
    expect(provider).toBeInstanceOf(StressLayoutProvider);
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('StressOptions.EDGE_LABELS_INLINE (StressOptions.java:50-59)', () => {
  it('defaults to true and is the same property on every read', () => {
    expect(StressOptions.EDGE_LABELS_INLINE.getDefault()).toBe(true);
    expect(StressOptions.EDGE_LABELS_INLINE).toBe(StressOptions.EDGE_LABELS_INLINE);
  });
});
