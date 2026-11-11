// SPDX-License-Identifier: EPL-2.0
// Generated option code no run reads (mission 8a, T19): the default of TOPDOWN_NODE_TYPE (MrTreeOptions.java src-gen :247,
// `HIERARCHICAL_NODE`) and `MrtreeFactory.destroy` (`obj.dispose()`).
import { describe, expect, it, vi } from 'vitest';
import { TopdownNodeTypes } from '../../../core/options/TopdownNodeTypes.js';
import { MrTreeOptions, MrtreeFactory } from './MrTreeOptions.js';

describe('MrTreeOptions generated code', () => {
  it('TOPDOWN_NODE_TYPE defaults to HIERARCHICAL_NODE and is cached', () => {
    expect(MrTreeOptions.TOPDOWN_NODE_TYPE.getDefault()).toBe(TopdownNodeTypes.HIERARCHICAL_NODE);
    expect(MrTreeOptions.TOPDOWN_NODE_TYPE).toBe(MrTreeOptions.TOPDOWN_NODE_TYPE);
  });

  it('MrtreeFactory.destroy disposes the provider', () => {
    const factory = new MrtreeFactory();
    const provider = factory.create();
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
