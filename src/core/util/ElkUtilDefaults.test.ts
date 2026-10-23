// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { EdgeLabelPlacement } from '../options/EdgeLabelPlacement.js';
import { NodeLabelPlacement } from '../options/NodeLabelPlacement.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { ElkUtil } from './ElkUtil.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('ElkUtil.configureWithDefaultValues(node)', () => {
  // ElkUtil.java:1019-1038: fixed size constraints and 0x0 -> 20 * 2 * 2 = 80 per side
  it('gives a fixed-size 0x0 node 80x80, an identifier label and inside-center label placement', () => {
    const node = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
    node.setIdentifier('n');
    ElkUtil.configureWithDefaultValues(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([80, 80]);
    expect(
      node
        .getLabels()
        .toArray()
        .map((l) => l.getText()),
    ).toEqual(['n']);
    expect(node.getProperty(CoreOptions.NODE_LABELS_PLACEMENT).equals(NodeLabelPlacement.insideCenter())).toBe(true);
  });

  it('keeps the size of a node that already has one', () => {
    const node = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    node.setDimensions(30, 0);
    ElkUtil.configureWithDefaultValues(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([30, 0]);
  });

  it('keeps the size of a node whose size constraints are not fixed', () => {
    const node = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
    ElkUtil.configureWithDefaultValues(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([0, 0]);
  });

  it('creates no label without identifier and none when a label exists', () => {
    const anonymous = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    ElkUtil.configureWithDefaultValues(anonymous);
    expect(anonymous.getLabels().size()).toBe(0);

    const labelled = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    labelled.setIdentifier('id');
    ElkGraphUtil.createLabelWithText('own', labelled);
    ElkUtil.configureWithDefaultValues(labelled);
    expect(
      labelled
        .getLabels()
        .toArray()
        .map((l) => l.getText()),
    ).toEqual(['own']);
  });

  it('treats an empty identifier as none', () => {
    const node = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    node.setIdentifier('');
    ElkUtil.configureWithDefaultValues(node);
    expect(node.getLabels().size()).toBe(0);
  });

  it('leaves non-fixed node label placement unchanged', () => {
    const node = ElkGraphUtil.createNode(ElkGraphUtil.createGraph());
    const outside = NodeLabelPlacement.outsideTopCenter();
    node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, outside);
    ElkUtil.configureWithDefaultValues(node);
    expect(node.getProperty(CoreOptions.NODE_LABELS_PLACEMENT).equals(outside)).toBe(true);
  });
});

describe('ElkUtil.configureWithDefaultValues(port) and (edge)', () => {
  // ElkUtil.java:1050-1056: 20 / 2 / 2 = 5
  it('gives a 0x0 port 5x5 and an identifier label', () => {
    const port = ElkGraphUtil.createPort(ElkGraphUtil.createNode(ElkGraphUtil.createGraph()));
    port.setIdentifier('p');
    ElkUtil.configureWithDefaultValues(port);
    expect([port.getWidth(), port.getHeight()]).toEqual([5, 5]);
    expect(port.getLabels().get(0).getText()).toBe('p');
  });

  it('keeps the size of a port that has one', () => {
    const port = ElkGraphUtil.createPort(ElkGraphUtil.createNode(ElkGraphUtil.createGraph()));
    port.setDimensions(3, 0);
    ElkUtil.configureWithDefaultValues(port);
    expect([port.getWidth(), port.getHeight()]).toEqual([3, 0]);
  });

  it('sets center edge label placement only when none is set', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const plain = ElkGraphUtil.createSimpleEdge(a, a);
    ElkUtil.configureWithDefaultValues(plain);
    expect(plain.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT)).toBe(EdgeLabelPlacement.CENTER);

    const headed = ElkGraphUtil.createSimpleEdge(a, a);
    headed.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
    ElkUtil.configureWithDefaultValues(headed);
    expect(headed.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT)).toBe(EdgeLabelPlacement.HEAD);
  });
});

describe('ElkUtil.configureDefaultsRecursively', () => {
  it('configures every node, port and edge below the root but not the root itself', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('root');
    const a = ElkGraphUtil.createNode(root);
    a.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
    const inner = ElkGraphUtil.createNode(a);
    inner.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
    const port = ElkGraphUtil.createPort(inner);
    const edge = ElkGraphUtil.createSimpleEdge(a, a);

    ElkUtil.configureDefaultsRecursively(root);

    expect([a.getWidth(), a.getHeight()]).toEqual([80, 80]);
    expect([inner.getWidth(), inner.getHeight()]).toEqual([80, 80]);
    expect([port.getWidth(), port.getHeight()]).toEqual([5, 5]);
    expect(edge.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT)).toBe(EdgeLabelPlacement.CENTER);
    expect([root.getWidth(), root.getHeight()]).toEqual([0, 0]);
    expect(root.getLabels().size()).toBe(0);
  });
});
