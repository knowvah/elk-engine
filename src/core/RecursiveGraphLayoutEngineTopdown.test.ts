// SPDX-License-Identifier: EPL-2.0
/*
 * Branch tests of the topdown section of RecursiveGraphLayoutEngine (RecursiveGraphLayoutEngineTopdown.ts, M17), run
 * through the engine. Expected values are traced by hand from RecursiveGraphLayoutEngine.java `:224-404` with the
 * Core.melk defaults (padding 12, hierarchical node width 150, aspect ratio 1.414, scale cap 1, content alignment top
 * left). The stubs are in test/helpers/layout-provider-stubs.ts.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/RecursiveGraphLayoutEngine.java
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from './options/CoreOptions.js';
import type { ElkNode } from '../graph/ElkNode.js';
import { ElkGraphUtil } from '../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../java/util/EnumSet.js';
import { LayoutMetaDataService } from './data/LayoutMetaDataService.js';
import { KVector } from './math/KVector.js';
import { KVectorChain } from './math/KVectorChain.js';
import { ContentAlignment } from './options/ContentAlignment.js';
import { TopdownNodeTypes } from './options/TopdownNodeTypes.js';
import { TopdownSizeApproximator } from './options/TopdownSizeApproximator.js';
import { UnsupportedConfigurationException } from './UnsupportedConfigurationException.js';
import { BasicProgressMonitor } from './util/BasicProgressMonitor.js';
import {
  PLAIN,
  STUB_TASK,
  TOPDOWN,
  calledNodes,
  calls,
  graph,
  leaves,
  node,
  predictions,
  registerEngineStubs,
  resetStubs,
  run,
  scripts,
} from '../../test/helpers/layout-provider-stubs.js';

const PRECISION = 9;

beforeAll(() => {
  LayoutMetaDataService.getInstance();
  registerEngineStubs();
});

beforeEach(() => {
  resetStubs();
});

describe('topdown layout', () => {
  function topdownNode(n: ElkNode, type: TopdownNodeTypes | null, width: number, height: number): ElkNode {
    n.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    if (type !== null) {
      n.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, type);
    }
    n.setIdentifier('h');
    n.setDimensions(width, height);
    return n;
  }

  function positions(nodes: ElkNode[]): number[][] {
    return nodes.map((n) => [n.getX(), n.getY()]);
  }

  it('pre-computes child sizes for a root node, lays it out first and sizes it to its child area', () => {
    const root = topdownNode(graph(PLAIN), TopdownNodeTypes.ROOT_NODE, 500, 400);
    const h = node(root, PLAIN);
    h.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    leaves(h, 2);
    const p = node(root, TOPDOWN);
    p.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.PARALLEL_NODE);
    leaves(p, 1);
    const x = node(root, PLAIN);
    x.setProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR, TopdownSizeApproximator.COUNT_CHILDREN);
    leaves(x, 4);
    const big = node(root, PLAIN);
    big.setDimensions(400, 400);
    leaves(big, 1);
    const leaf = node(root);
    leaf.setDimensions(10, 10);
    let sizesAtRootLayout: number[][] = [];
    let aspectRatio = 0;
    scripts.set(root, (n) => {
      sizesAtRootLayout = [h, p, x, big, leaf].map((c) => [c.getWidth(), c.getHeight()]);
      aspectRatio = n.getProperty(CoreOptions.ASPECT_RATIO);
      p.setLocation(200, 0);
      x.setLocation(0, 300);
      big.setLocation(700, 0);
      leaf.setLocation(600, 500);
    });
    const monitor = new BasicProgressMonitor();

    run(root, monitor);

    expect(sizesAtRootLayout[0]![0]).toBe(174);
    expect(sizesAtRootLayout[0]![1]).toBeCloseTo(130.08203677510609, PRECISION);
    expect(sizesAtRootLayout[1]).toEqual([300, 200]);
    expect(sizesAtRootLayout[2]![0]).toBe(324);
    expect(sizesAtRootLayout[2]![1]).toBeCloseTo(236.16407355021218, PRECISION);
    expect(sizesAtRootLayout.slice(3)).toEqual([
      [400, 400],
      [10, 10],
    ]);
    expect(predictions).toEqual([p]);
    expect(aspectRatio).toBeCloseTo(476 / 376, PRECISION);
    expect(root.getWidth()).toBe(1124);
    expect(root.getHeight()).toBeCloseTo(560.1640735502122, PRECISION);
    expect(calledNodes()).toEqual([root, h, p, x, big]);
    expect(monitor.getSubMonitors().map((m) => m.getTaskName())).toEqual([
      'Topdown Layout',
      STUB_TASK(PLAIN),
      STUB_TASK(PLAIN),
      STUB_TASK(TOPDOWN),
      STUB_TASK(PLAIN),
      STUB_TASK(PLAIN),
    ]);
  });

  it('scales a hierarchical node down and shifts its children, edges, labels and junction points', () => {
    const h = topdownNode(graph(PLAIN), TopdownNodeTypes.HIERARCHICAL_NODE, 174, 124);
    const [h1, h2] = leaves(h, 2) as [ElkNode, ElkNode];
    const edge = ElkGraphUtil.createSimpleEdge(h1, h2);
    const label = ElkGraphUtil.createLabel(edge);
    scripts.set(h, () => {
      h2.setLocation(290, 190);
      const section = ElkGraphUtil.createEdgeSection(edge);
      section.setStartLocation(10, 5);
      section.setEndLocation(290, 195);
      ElkGraphUtil.createBendPoint(section, 150, 100);
      label.setLocation(100, 50);
      edge.setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(150, 100)));
    });
    const monitor = new BasicProgressMonitor().withLogging(true);

    run(h, monitor);

    const section = edge.getSections().get(0);
    const junction = edge.getProperty(CoreOptions.JUNCTION_POINTS).getFirst();
    expect(h.getProperty(CoreOptions.ASPECT_RATIO)).toBe(1.5);
    expect(h.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR)).toBe(0.5);
    expect(positions([h1, h2])).toEqual([
      [12, 12],
      [302, 202],
    ]);
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([
      22, 17, 302, 207,
    ]);
    expect([section.getBendPoints().get(0).getX(), section.getBendPoints().get(0).getY()]).toEqual([162, 112]);
    expect([label.getX(), label.getY(), junction.x, junction.y]).toEqual([112, 62, 162, 112]);
    expect(calledNodes()).toEqual([h]);
    expect(monitor.getSubMonitors()[0]!.getLogs()).toEqual([
      'Available Child Area: (150.0|100.0)',
      `Executed layout algorithm: ${PLAIN} on node h`,
      'Desired Child Area: (300.0|200.0)',
      'h -- Local Scale Factor (X|Y): (0.5|0.5)',
      'Shift: (12.0|12.0)',
    ]);
  });

  it.each([
    ['top left (default)', null, 90, [0, 0]],
    ['center', [ContentAlignment.H_CENTER, ContentAlignment.V_CENTER], 90, [75, 50]],
    ['right bottom', [ContentAlignment.H_RIGHT, ContentAlignment.V_BOTTOM], 90, [150, 100]],
    ['center, height already full', [ContentAlignment.H_CENTER, ContentAlignment.V_CENTER], 190, [75, 0]],
    ['right bottom, height already full', [ContentAlignment.H_RIGHT, ContentAlignment.V_BOTTOM], 190, [150, 0]],
  ] as const)('aligns the content: %s', (_name, alignment, h2y, shift) => {
    const h = topdownNode(graph(PLAIN), TopdownNodeTypes.HIERARCHICAL_NODE, 324, 224);
    if (alignment !== null) {
      h.setProperty(CoreOptions.CONTENT_ALIGNMENT, EnumSet.of(alignment[0], alignment[1]));
    }
    const [h1, h2] = leaves(h, 2) as [ElkNode, ElkNode];
    scripts.set(h, () => h2.setLocation(140, h2y));

    run(h);

    expect(h.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR)).toBe(1);
    expect(positions([h1, h2])).toEqual([
      [shift[0], shift[1]],
      [140 + shift[0], h2y + shift[1]],
    ]);
  });

  it('uses a child area the algorithm has set', () => {
    const h = topdownNode(graph(PLAIN), TopdownNodeTypes.HIERARCHICAL_NODE, 174, 124);
    const [h1] = leaves(h, 1) as [ElkNode];
    scripts.set(h, (n) => {
      n.setProperty(CoreOptions.CHILD_AREA_WIDTH, 600);
      n.setProperty(CoreOptions.CHILD_AREA_HEIGHT, 400);
    });

    run(h);

    expect(h.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR)).toBe(0.25);
    expect(positions([h1])).toEqual([[36, 36]]);
  });

  it('fails like a Java null unboxing when the algorithm sets only one child area dimension', () => {
    const h = topdownNode(graph(PLAIN), TopdownNodeTypes.HIERARCHICAL_NODE, 174, 124);
    leaves(h, 1);
    scripts.set(h, (n) => n.setProperty(CoreOptions.CHILD_AREA_WIDTH, 600));

    expect(() => run(h)).toThrow(TypeError);
  });

  it('rejects a hierarchical node smaller than its padding after laying it out', () => {
    const h = topdownNode(graph(PLAIN), TopdownNodeTypes.HIERARCHICAL_NODE, 10, 30);
    leaves(h, 1);

    expect(() => run(h)).toThrow(
      new UnsupportedConfigurationException(
        'The size defined by the parent parallel node is too small for the space provided by the paddings of the' +
          ' child hierarchical node. h',
      ),
    );
    expect(calledNodes()).toEqual([h]);
  });

  it('rejects a topdown node without a node type before laying it out', () => {
    const h = topdownNode(graph(PLAIN), null, 100, 100);
    leaves(h, 1);

    expect(() => run(h)).toThrow(
      new UnsupportedConfigurationException('h has not been assigned a top-down node type.'),
    );
    expect(calls).toEqual([]);
  });

  it('rejects a topdown layout provider on a hierarchical child', () => {
    const root = topdownNode(graph(PLAIN), TopdownNodeTypes.ROOT_NODE, 100, 100);
    const child = node(root, TOPDOWN);
    child.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    leaves(child, 1);

    expect(() => run(root)).toThrow(
      new UnsupportedConfigurationException('Topdown Layout Providers should only be used on parallel nodes.'),
    );
  });

  it('fails like a Java NullPointerException for a topdown provider child without a node type', () => {
    const root = topdownNode(graph(PLAIN), TopdownNodeTypes.ROOT_NODE, 100, 100);
    leaves(node(root, TOPDOWN), 1);

    expect(() => run(root)).toThrow(TypeError);
  });

  it('neither pre-computes child sizes nor resizes a parallel node', () => {
    const root = topdownNode(graph(PLAIN), TopdownNodeTypes.PARALLEL_NODE, 100, 80);
    const child = node(root, PLAIN);
    leaves(child, 1);
    let childSizeAtRootLayout: number[] = [];
    scripts.set(root, () => {
      childSizeAtRootLayout = [child.getWidth(), child.getHeight()];
    });

    run(root);

    expect(childSizeAtRootLayout).toEqual([0, 0]);
    expect([root.getWidth(), root.getHeight()]).toEqual([100, 80]);
    expect(calledNodes()).toEqual([root, child]);
  });
});
