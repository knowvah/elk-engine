// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { TestController } from '../../core/testing/TestController.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { compareLayout, formatDiffs } from '../../../test/golden/compare-json.js';
import { exportElk, importSiteInput, loadSiteRow } from '../../../test/helpers/transform-site-rows.js';
import { ElkLayered } from './ElkLayered.js';
import { LayeredLayoutProvider } from './LayeredLayoutProvider.js';
import { LayeredOptions } from './options/LayeredOptions.js';

const INCLUDE_CHILDREN_ROW = 'site/provider/include-children';

/** The AD-4 diffs of the laid-out `root` against the recorded `elk` export of the layered-sites row `id`. */
function diffsAgainstRow(id: string, root: ElkNode): string {
  const comparison = compareLayout(loadSiteRow(id).expected.elk, exportElk(root));
  return comparison.ok ? '' : formatDiffs(comparison.diffs);
}

function graphWithNode(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  ElkGraphUtil.createNode(graph);
  return graph;
}

describe('LayeredLayoutProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('is a layout provider owning one ElkLayered', () => {
    const provider = new LayeredLayoutProvider();
    expect(provider).toBeInstanceOf(AbstractLayoutProvider);
    expect(provider.getLayoutAlgorithm()).toBeInstanceOf(ElkLayered);
    expect(provider.getLayoutAlgorithm()).toBe(provider.getLayoutAlgorithm());
    expect(new LayeredLayoutProvider().getLayoutAlgorithm()).not.toBe(provider.getLayoutAlgorithm());
  });

  it('delegates a flat layout to doLayout and runs it', () => {
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    provider.layout(graphWithNode(), new NullElkProgressMonitor());
    expect(doLayout).toHaveBeenCalledTimes(1);
    expect(doLayout.mock.results[0]?.type).toBe('return');
    expect(doCompoundLayout).not.toHaveBeenCalled();
  });

  it('delegates INCLUDE_CHILDREN to doCompoundLayout, which completes the recorded layout', () => {
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const root = importSiteInput(INCLUDE_CHILDREN_ROW);
    provider.layout(root, new NullElkProgressMonitor());
    expect(doCompoundLayout).toHaveBeenCalledTimes(1);
    expect(doCompoundLayout.mock.results[0]?.type).toBe('return');
    expect(doLayout).not.toHaveBeenCalled();
    expect(diffsAgainstRow(INCLUDE_CHILDREN_ROW, root)).toBe('');
  });

  it('imports the graph before the layout test preparation', () => {
    const provider = new LayeredLayoutProvider();
    const prepare = vi.spyOn(provider.getLayoutAlgorithm(), 'prepareLayoutTest');
    const state = provider.startLayoutTest(graphWithNode());
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[0].getLayerlessNodes()).toHaveLength(1);
    expect(state.getGraphs()).toHaveLength(1);
    expect(state.getGraphs()?.[0]?.getLayerlessNodes()).toHaveLength(1);
    expect(state.getStep()).toBe(0);
  });

  it('hands the test controller to ElkLayered', () => {
    const provider = new LayeredLayoutProvider();
    const setTestController = vi.spyOn(provider.getLayoutAlgorithm(), 'setTestController');
    const controller = new TestController('org.eclipse.elk.layered');
    provider.setTestController(controller);
    expect(setTestController).toHaveBeenCalledTimes(1);
    expect(setTestController.mock.calls[0]?.[0]).toBe(controller);
  });

  it('is created by the registered LayeredFactory with an initialized provider', () => {
    const factory = new LayeredOptions.LayeredFactory();
    const provider = factory.create();
    expect(provider).toBeInstanceOf(LayeredLayoutProvider);
    const dispose = vi.spyOn(provider, 'dispose');
    factory.destroy(provider);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('LayeredLayoutProvider (oracle site rows)', () => {
  // The flat rows lay out for real since 7f2 (FX5) and the INCLUDE_CHILDREN row since 7h; only the flat cancelled row has a
  // cancelled case here.
  it('imports a flat labelled graph, hands it to doLayout and applies the recorded layout', () => {
    // oracle: site/provider/flat; LayeredLayoutProvider.java:59-60 (layout, flat arm); coordinates of the row
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const root = importSiteInput('site/provider/flat');
    const monitor = new NullElkProgressMonitor();
    const isCanceled = vi.spyOn(monitor, 'isCanceled');
    provider.layout(root, monitor);
    expect(doLayout).toHaveBeenCalledTimes(1);
    expect(doCompoundLayout).not.toHaveBeenCalled();
    expect(isCanceled).toHaveBeenCalled();
    expect(root.getChildren().get(0)?.getX()).toBe(12);
    expect(root.getChildren().get(2)?.getX()).toBe(148);
    expect(root.getWidth()).toBe(190);
    expect(root.getHeight()).toBe(44);
    const label = root.getContainedEdges().get(1)?.getLabels().get(0);
    expect([label?.getX(), label?.getY()]).toEqual([116, 25]);
  });

  it('keeps the graph untouched when the monitor is cancelled', () => {
    // oracle: site/provider/cancelled; LayeredLayoutProvider.java:64 (isCanceled arm after the layout call)
    const provider = new LayeredLayoutProvider();
    const root = importSiteInput('site/provider/cancelled');
    const monitor = new NullElkProgressMonitor();
    vi.spyOn(monitor, 'isCanceled').mockReturnValue(true);
    provider.layout(root, monitor);
    expect(root.getChildren().get(0)?.getX()).toBe(0);
    expect(root.getWidth()).toBe(0);
    expect(root.getHeight()).toBe(0);
  });

  it('imports an INCLUDE_CHILDREN hierarchy, hands it to doCompoundLayout and applies the recorded layout', () => {
    // oracle: site/provider/include-children; LayeredLayoutProvider.java:55-57 (layout, INCLUDE_CHILDREN arm)
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const root = importSiteInput(INCLUDE_CHILDREN_ROW);
    const monitor = new NullElkProgressMonitor();
    const isCanceled = vi.spyOn(monitor, 'isCanceled');
    provider.layout(root, monitor);
    expect(doCompoundLayout).toHaveBeenCalledTimes(1);
    expect(doLayout).not.toHaveBeenCalled();
    expect(isCanceled).toHaveBeenCalled();
    const imported = doCompoundLayout.mock.calls[0]?.[0];
    expect(imported?.getLayerlessNodes().length).toBe(2);
    expect(imported?.getLayerlessNodes()[1]?.getNestedGraph()?.getLayerlessNodes().length).toBe(2);
    expect(diffsAgainstRow(INCLUDE_CHILDREN_ROW, root)).toBe('');
  });
});
