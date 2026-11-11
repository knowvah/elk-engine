// SPDX-License-Identifier: EPL-2.0
// The generated TOPDOWN_NODE_TYPE accessor default (ForceOptions.java:269 `TopdownNodeTypes.HIERARCHICAL_NODE`), and the generated factory's destroy (src-gen ForceOptions.java:284-293: `obj.dispose()`) and its create (`new ForceLayoutProvider()` then `initialize("")`).
import { describe, expect, it, vi } from 'vitest';
import { ForceLayoutProvider } from '../ForceLayoutProvider.js';
import { TopdownNodeTypes } from '../../../core/options/TopdownNodeTypes.js';
import { ForceFactory, ForceOptions } from './ForceOptions.js';

describe('ForceFactory (ForceOptions.java:284-293)', () => {
  it('create returns a ForceLayoutProvider and destroy disposes it', () => {
    const factory = new ForceFactory();
    const provider = factory.create();
    expect(provider).toBeInstanceOf(ForceLayoutProvider);
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('ForceOptions.TOPDOWN_NODE_TYPE (ForceOptions.java:269-279)', () => {
  it('defaults to HIERARCHICAL_NODE and is the same property on every read', () => {
    expect(ForceOptions.TOPDOWN_NODE_TYPE.getDefault()).toBe(TopdownNodeTypes.HIERARCHICAL_NODE);
    expect(ForceOptions.TOPDOWN_NODE_TYPE).toBe(ForceOptions.TOPDOWN_NODE_TYPE);
  });
});
