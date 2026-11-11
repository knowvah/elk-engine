// SPDX-License-Identifier: EPL-2.0
// The generated option accessors no run reads (mission 8a, T19): the defaults of SPACING_NODE_NODE, PADDING and EDGE_LABELS_INLINE
// as VertiFlexOptions.java (src-gen) declares them (:44 `20`, :56 `new ElkPadding(5)`, :83 `false`), and the factory's destroy
// (:144-146 `obj.dispose()`).
import { describe, expect, it, vi } from 'vitest';
import { registerVertiFlex } from '../../../../test/helpers/vertiflex-replay-dump.js';
import { VertiflexFactory, VertiFlexOptions } from './VertiFlexOptions.js';

describe('VertiFlexOptions accessors (VertiFlexOptions.java src-gen)', () => {
  it('SPACING_NODE_NODE defaults to 20', () => {
    expect(VertiFlexOptions.SPACING_NODE_NODE.getDefault()).toBe(20);
    expect(VertiFlexOptions.SPACING_NODE_NODE).toBe(VertiFlexOptions.SPACING_NODE_NODE);
  });

  it('PADDING defaults to ElkPadding(5)', () => {
    registerVertiFlex(); // loads LayoutMetaDataService, which registers the ElkReflect clone of ElkPadding
    const padding = VertiFlexOptions.PADDING.getDefault();
    expect([padding.top, padding.left, padding.bottom, padding.right]).toEqual([5, 5, 5, 5]);
  });

  it('EDGE_LABELS_INLINE defaults to false', () => {
    expect(VertiFlexOptions.EDGE_LABELS_INLINE.getDefault()).toBe(false);
  });
});

describe('VertiflexFactory (VertiFlexOptions.java:144-146)', () => {
  it('destroy disposes the provider', () => {
    const factory = new VertiflexFactory();
    const provider = factory.create();
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
