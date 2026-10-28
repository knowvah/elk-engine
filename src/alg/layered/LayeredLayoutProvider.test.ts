// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import { TestController } from '../../core/testing/TestController.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { importSiteInput } from '../../../test/helpers/transform-site-rows.js';
import { ElkLayered } from './ElkLayered.js';
import { LayeredLayoutProvider } from './LayeredLayoutProvider.js';
import { LayeredOptions } from './options/LayeredOptions.js';

const STAGED_MESSAGE = 'ElkLayered is ported in mission 7f';

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

  it('delegates a flat layout to the staged doLayout', () => {
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    expect(() => provider.layout(graphWithNode(), new NullElkProgressMonitor())).toThrow(
      new UnsupportedOperationException(STAGED_MESSAGE),
    );
    expect(doLayout).toHaveBeenCalledTimes(1);
    expect(doCompoundLayout).not.toHaveBeenCalled();
  });

  it('delegates INCLUDE_CHILDREN to the staged doCompoundLayout', () => {
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const graph = graphWithNode();
    graph.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    expect(() => provider.layout(graph, new NullElkProgressMonitor())).toThrow(
      new UnsupportedOperationException(STAGED_MESSAGE),
    );
    expect(doCompoundLayout).toHaveBeenCalledTimes(1);
    expect(doLayout).not.toHaveBeenCalled();
  });

  it('imports the graph before the staged layout test preparation', () => {
    const provider = new LayeredLayoutProvider();
    const prepare = vi.spyOn(provider.getLayoutAlgorithm(), 'prepareLayoutTest');
    expect(() => provider.startLayoutTest(graphWithNode())).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[0].getLayerlessNodes()).toHaveLength(1);
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
  // The cancelled rows (site/provider/cancelled, site/provider/include-children-cancelled) exercise the
  // `isCanceled` arm of LayeredLayoutProvider.java:64, which follows the layout call; ElkLayered.doLayout and
  // doCompoundLayout throw until mission 7f, so that arm is unreachable in 7a and has no case here.
  it('imports a flat graph and hands it to the staged doLayout', () => {
    // oracle: site/provider/flat; LayeredLayoutProvider.java:59-60 (layout, flat arm)
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const root = importSiteInput('site/provider/flat');
    const monitor = new NullElkProgressMonitor();
    const isCanceled = vi.spyOn(monitor, 'isCanceled');
    expect(() => provider.layout(root, monitor)).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(doLayout).toHaveBeenCalledTimes(1);
    expect(doCompoundLayout).not.toHaveBeenCalled();
    expect(isCanceled).not.toHaveBeenCalled();
    const imported = doLayout.mock.calls[0]?.[0];
    expect(imported?.getLayerlessNodes().map((node) => node.getPorts().length)).toEqual([1, 2, 1]);
    expect(root.getChildren().get(0)?.getX()).toBe(0);
    expect(root.getWidth()).toBe(0);
  });

  it('imports an INCLUDE_CHILDREN hierarchy and hands it to the staged doCompoundLayout', () => {
    // oracle: site/provider/include-children; LayeredLayoutProvider.java:55-57 (layout, INCLUDE_CHILDREN arm)
    const provider = new LayeredLayoutProvider();
    const doLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doLayout');
    const doCompoundLayout = vi.spyOn(provider.getLayoutAlgorithm(), 'doCompoundLayout');
    const root = importSiteInput('site/provider/include-children');
    const monitor = new NullElkProgressMonitor();
    const isCanceled = vi.spyOn(monitor, 'isCanceled');
    expect(() => provider.layout(root, monitor)).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(doCompoundLayout).toHaveBeenCalledTimes(1);
    expect(doLayout).not.toHaveBeenCalled();
    expect(isCanceled).not.toHaveBeenCalled();
    const imported = doCompoundLayout.mock.calls[0]?.[0];
    expect(imported?.getLayerlessNodes().length).toBe(2);
    expect(imported?.getLayerlessNodes()[1]?.getNestedGraph()?.getLayerlessNodes().length).toBe(2);
    expect(root.getChildren().get(0)?.getX()).toBe(0);
  });
});
