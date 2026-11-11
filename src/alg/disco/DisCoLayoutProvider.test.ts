// SPDX-License-Identifier: EPL-2.0
// The unreachable arm of DisCoLayoutProvider.layout, derived from reading DisCoLayoutProvider.java:78-79: with a strategy other than
// POLYOMINO (CompactionStrategy has no other value, so the value is forged) the provider prints a message, runs no compaction, and
// transformer.applyLayout then dereferences the graph dimensions the compaction never set (a NullPointerException, a TypeError here).
import { describe, expect, it, vi } from 'vitest';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { DisCoLayoutProvider } from './DisCoLayoutProvider.js';
import type { CompactionStrategy } from './options/CompactionStrategy.js';
import { DisCoMetaDataProvider } from './options/DisCoMetaDataProvider.js';

describe('DisCoLayoutProvider', () => {
  it('prints the message of the default arm and fails in applyLayout without dimensions (java:78-79)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root).setDimensions(10, 10);
    root.setProperty(DisCoMetaDataProvider.COMPONENT_COMPACTION_STRATEGY, {} as unknown as CompactionStrategy);
    expect(() => new DisCoLayoutProvider().layout(root, new BasicProgressMonitor())).toThrow(TypeError);
    expect(log).toHaveBeenCalledWith('DisCo: no compaction strategy used for connected components.');
    log.mockRestore();
  });
});
