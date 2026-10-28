// SPDX-License-Identifier: EPL-2.0
// LGraph creation of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { prop, quad, xy } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';
import { beforeAll } from 'vitest';
import { LabelManagementOptions } from '../../../../core/labels/LabelManagementOptions.js';
import type { ILabelManager } from '../../../../core/labels/ILabelManager.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { createLGraph } from './ElkGraphImporterGraphs.js';

describe('ElkGraphImporterGraphs (oracle site rows)', () => {
  it('takes the padding of the imported node and the origin from the ELK node', () => {
    // oracle: site/transform/misc/parent-node-layout-flags; ElkGraphImporter.java:592-650 (createLGraph)
    const run = runSiteRow('site/transform/misc/parent-node-layout-flags');
    const d = run.dump;
    expect(quad(d.graph('g0').padding)).toEqual([3, 6, 5, 4]);
    expect(prop(d.graph('g0'), 'origin')).toEqual('elk:host');
    expect(prop(d.graph('g0'), 'nodeSize.constraints')).toEqual(['PORT_LABELS', 'MINIMUM_SIZE']);
    expect(prop(d.graph('g0'), 'nodeSize.options')).toEqual(['COMPUTE_PADDING']);
    expect(prop(d.graph('g0'), 'direction')).toEqual('RIGHT');
    expect(xy(d.graph('g0').offset)).toEqual([0, 0]);
  });

  it('takes the default padding for the root graph', () => {
    // oracle: site/transform/misc/parent-node-layout-flags-root; ElkGraphImporter.java:592-650 (createLGraph)
    const run = runSiteRow('site/transform/misc/parent-node-layout-flags-root');
    const d = run.dump;
    expect(quad(d.graph('g0').padding)).toEqual([12, 12, 12, 12]);
    expect(prop(d.graph('g0'), 'origin')).toEqual('elk:root');
    expect(prop(d.graph('g0'), 'nodeSize.constraints')).toEqual(['NODE_LABELS']);
    expect(prop(d.graph('g0'), 'nodeSize.options')).toEqual(['COMPUTE_PADDING']);
  });

  // No oracle row sets a label manager (ELK JSON cannot carry one); the expectations follow
  // ElkGraphImporter.java:602-606.
  describe('label manager', () => {
    const manager: ILabelManager = { manageLabelSize: () => null };
    const other: ILabelManager = { manageLabelSize: () => null };

    beforeAll(() => {
      registerLayered();
    });

    it('keeps the label manager of the imported node', () => {
      const root = ElkGraphUtil.createGraph();
      root.setProperty(LabelManagementOptions.LABEL_MANAGER, other);
      const node = ElkGraphUtil.createNode(root);
      node.setProperty(LabelManagementOptions.LABEL_MANAGER, manager);
      expect(createLGraph(node).getProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(manager);
    });

    it('takes the label manager of the root graph for a node without one', () => {
      const root = ElkGraphUtil.createGraph();
      root.setProperty(LabelManagementOptions.LABEL_MANAGER, other);
      const node = ElkGraphUtil.createNode(root);
      expect(createLGraph(node).getProperty(LabelManagementOptions.LABEL_MANAGER)).toBe(other);
    });
  });
});
