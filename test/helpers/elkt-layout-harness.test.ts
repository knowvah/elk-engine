// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { BoxLayouterOptions } from '../../src/core/options/BoxLayouterOptions.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { layoutElkt } from './elkt-layout-harness.js';

const MODEL = 'tickets/core/489_paddingAndMinSize_Small.elkt';

describe('layoutElkt', () => {
  it('runs the configurator on the loaded graph before layout and returns the laid-out root', () => {
    const seen: string[] = [];
    const root = layoutElkt(MODEL, BoxLayouterOptions.ALGORITHM_ID, (graph: ElkNode) => {
      seen.push(graph.getChildren().get(0).getIdentifier() ?? '', String(graph.getChildren().get(0).getWidth()));
    });
    expect(seen).toEqual(['N1', '0']);
    const n1 = root.getChildren().get(0);
    expect(n1.getWidth()).toBe(100);
    expect(n1.getChildren().get(0).getX()).toBe(5);
  });

  it('delivers the algorithm to every node through a LayoutConfigurator', () => {
    const root = layoutElkt(MODEL, BoxLayouterOptions.ALGORITHM_ID);
    const n1 = root.getChildren().get(0);
    const nested = n1.getChildren().get(0);
    expect(root.getProperty(CoreOptions.ALGORITHM)).toBe(BoxLayouterOptions.ALGORITHM_ID);
    expect(n1.getProperty(CoreOptions.ALGORITHM)).toBe(BoxLayouterOptions.ALGORITHM_ID);
    expect(nested.getProperty(CoreOptions.ALGORITHM)).toBe(BoxLayouterOptions.ALGORITHM_ID);
    // configure(ElkNodeImpl) reaches nodes only, so an edge never receives the option
    for (const edge of root.getContainedEdges()) {
      expect(edge.hasProperty(CoreOptions.ALGORITHM)).toBe(false);
    }
  });

  it('rejects a model that does not exist', () => {
    expect(() => layoutElkt('tickets/core/missing.elkt', BoxLayouterOptions.ALGORITHM_ID)).toThrow();
  });
});
