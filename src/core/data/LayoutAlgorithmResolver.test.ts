// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { UnsupportedConfigurationException } from '../UnsupportedConfigurationException.js';
import { applyVisitors } from '../util/ElkUtilVisitors.js';
import type { IFactory } from '../util/IFactory.js';
import type { ILayoutMetaDataProvider } from './ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutAlgorithmResolver } from './LayoutAlgorithmResolver.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';

const BOX_ID = 'test.alg.stubbox';
const BOX_SUFFIX = 'stubbox';
const LAYERED_ID = 'org.eclipse.elk.layered';
const DEFAULT_ID = 'org.eclipse.elk.layered';
const UNKNOWN_ID = 'foo.Bar';

function algorithm(id: string): LayoutAlgorithmData {
  const stub: IFactory<AbstractLayoutProvider> = {
    create: () => ({}) as AbstractLayoutProvider,
    destroy: () => undefined,
  };
  return new LayoutAlgorithmData.Builder().id(id).name(id).providerFactory(stub).create();
}

function register(...data: LayoutAlgorithmData[]): void {
  const provider: ILayoutMetaDataProvider = {
    apply(registry: ILayoutMetaDataProvider.Registry): void {
      data.forEach((d) => registry.register(d));
    },
  };
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(provider);
}

/** A named root node with one child. */
function hierarchicalRoot(): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('r');
  ElkGraphUtil.createNode(root);
  return root;
}

beforeEach(() => {
  LayoutMetaDataService.unload();
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('LayoutAlgorithmResolver', () => {
  it('resolves a configured algorithm by suffix', () => {
    const box = algorithm(BOX_ID);
    register(box);
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.ALGORITHM, BOX_SUFFIX);
    new LayoutAlgorithmResolver().visit(root);
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(box);
  });

  it('resolves a configured algorithm on a leaf node', () => {
    const box = algorithm(BOX_ID);
    register(box);
    const leaf = ElkGraphUtil.createGraph();
    leaf.setProperty(CoreOptions.ALGORITHM, BOX_ID);
    new LayoutAlgorithmResolver().visit(leaf);
    expect(leaf.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(box);
  });

  it('throws for an unknown algorithm on a hierarchical node', () => {
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    const visit = (): void => new LayoutAlgorithmResolver().visit(root);
    expect(visit).toThrow(UnsupportedConfigurationException);
    expect(visit).toThrow(`Layout algorithm '${UNKNOWN_ID}' not found for Root Node r`);
  });

  it('throws for an unknown algorithm on a node with inside self loops', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('r');
    root.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    root.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true);
    expect(() => new LayoutAlgorithmResolver().visit(root)).toThrow(
      `Layout algorithm '${UNKNOWN_ID}' not found for Root Node r`,
    );
  });

  it('ignores an unknown algorithm on a leaf node', () => {
    const leaf = ElkGraphUtil.createGraph();
    leaf.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    new LayoutAlgorithmResolver().visit(leaf);
    expect(leaf.hasProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(false);
  });

  it('throws the "no default" message when nothing is configured and layered is unregistered', () => {
    const root = hierarchicalRoot();
    const visit = (): void => new LayoutAlgorithmResolver().visit(root);
    expect(visit).toThrow(UnsupportedConfigurationException);
    expect(visit).toThrow(`Unable to load default layout algorithm ${DEFAULT_ID} for unconfigured node Root Node r`);
  });

  it('treats a blank algorithm id as unconfigured', () => {
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.ALGORITHM, '  \t');
    expect(() => new LayoutAlgorithmResolver().visit(root)).toThrow(
      `Unable to load default layout algorithm ${DEFAULT_ID} for unconfigured node Root Node r`,
    );
  });

  it('falls back on the default algorithm when it is registered', () => {
    const layered = algorithm(LAYERED_ID);
    register(layered);
    const root = hierarchicalRoot();
    new LayoutAlgorithmResolver().visit(root);
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(layered);
  });

  it('uses an overridden default algorithm id', () => {
    const box = algorithm(BOX_ID);
    register(box);
    class BoxDefault extends LayoutAlgorithmResolver {
      override getDefaultLayoutAlgorithmID(): string {
        return BOX_ID;
      }
    }
    const root = hierarchicalRoot();
    new BoxDefault().visit(root);
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(box);
  });

  it('reports an overridden default id in the message', () => {
    class MissingDefault extends LayoutAlgorithmResolver {
      override getDefaultLayoutAlgorithmID(): string {
        return UNKNOWN_ID;
      }
    }
    expect(() => new MissingDefault().visit(hierarchicalRoot())).toThrow(
      `Unable to load default layout algorithm ${UNKNOWN_ID} for unconfigured node Root Node r`,
    );
  });

  it('does nothing for a leaf node without configuration', () => {
    const leaf = ElkGraphUtil.createGraph();
    new LayoutAlgorithmResolver().visit(leaf);
    expect(leaf.hasProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(false);
  });

  it('skips nodes with NO_LAYOUT', () => {
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.NO_LAYOUT, true);
    root.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    new LayoutAlgorithmResolver().visit(root);
    expect(root.hasProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(false);
  });

  it('skips non-node elements', () => {
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    const port = ElkGraphUtil.createPort(root);
    new LayoutAlgorithmResolver().visit(port);
    expect(port.hasProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(false);
  });

  it('keeps an already resolved algorithm when the configured one is unknown', () => {
    const box = algorithm(BOX_ID);
    register(box);
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.RESOLVED_ALGORITHM, box);
    root.setProperty(CoreOptions.ALGORITHM, UNKNOWN_ID);
    new LayoutAlgorithmResolver().visit(root);
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(box);
  });

  it('resolves per node through applyVisitors', () => {
    const box = algorithm(BOX_ID);
    register(box);
    const root = hierarchicalRoot();
    root.setProperty(CoreOptions.ALGORITHM, BOX_SUFFIX);
    const child = root.getChildren().get(0);
    applyVisitors(root, new LayoutAlgorithmResolver());
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(box);
    expect(child.hasProperty(CoreOptions.RESOLVED_ALGORITHM)).toBe(false);
  });
});
