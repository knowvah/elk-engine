// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../graph/ElkGraphElement.js';
import { ElkConnectableShapeImpl } from '../graph/impl/ElkConnectableShapeImpl.js';
import { ElkEdgeImpl } from '../graph/impl/ElkEdgeImpl.js';
import { ElkGraphElementImpl } from '../graph/impl/ElkGraphElementImpl.js';
import { ElkLabelImpl } from '../graph/impl/ElkLabelImpl.js';
import { ElkNodeImpl } from '../graph/impl/ElkNodeImpl.js';
import { ElkPortImpl } from '../graph/impl/ElkPortImpl.js';
import { ElkShapeImpl } from '../graph/impl/ElkShapeImpl.js';
import { Property } from '../graph/properties/Property.js';
import { ElkGraphUtil } from '../graph/util/ElkGraphUtil.js';
import { LayoutMetaDataService } from './data/LayoutMetaDataService.js';
import { LayoutConfigurator } from './LayoutConfigurator.js';
import { KVector } from './math/KVector.js';
import { KVectorChain } from './math/KVectorChain.js';
import { CoreOptions } from './options/CoreOptions.js';
import { ElkUtil } from './util/ElkUtil.js';

const NODE_NODE = CoreOptions.SPACING_NODE_NODE;
const EDGE_NODE = CoreOptions.SPACING_EDGE_NODE;

describe('LayoutConfigurator', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('configure returns the same holder per element and per class, getProperties null when absent', () => {
    const root = ElkGraphUtil.createGraph();
    const lc = new LayoutConfigurator();
    expect(lc.getProperties(root)).toBeNull();
    expect(lc.getProperties(ElkNodeImpl)).toBeNull();
    const byElement = lc.configure(root);
    const byClass = lc.configure(ElkNodeImpl);
    expect(lc.configure(root)).toBe(byElement);
    expect(lc.configure(ElkNodeImpl)).toBe(byClass);
    expect(lc.getProperties(root)).toBe(byElement);
    expect(lc.getProperties(ElkNodeImpl)).toBe(byClass);
    expect(byElement).not.toBe(byClass);
  });

  it('the ElkNode value beats ElkShape and ElkGraphElement; the element value beats all', () => {
    const root = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(root);
    const n2 = ElkGraphUtil.createNode(root);
    const lc = new LayoutConfigurator();
    lc.configure(ElkGraphElementImpl).setProperty(NODE_NODE, 1);
    lc.configure(ElkShapeImpl).setProperty(NODE_NODE, 2);
    lc.configure(ElkConnectableShapeImpl).setProperty(NODE_NODE, 3);
    lc.configure(ElkNodeImpl).setProperty(NODE_NODE, 4);
    lc.configure(n1).setProperty(NODE_NODE, 5);
    ElkUtil.applyVisitors(root, lc);
    expect(n2.getProperty(NODE_NODE)).toBe(4);
    expect(n1.getProperty(NODE_NODE)).toBe(5);
  });

  it('a label gets ElkGraphElement, ElkShape and ElkLabel options but not ElkConnectableShape or ElkNode ones', () => {
    const root = ElkGraphUtil.createGraph();
    const label = ElkGraphUtil.createLabel(root);
    const lc = new LayoutConfigurator();
    lc.configure(ElkGraphElementImpl).setProperty(EDGE_NODE, 7);
    lc.configure(ElkConnectableShapeImpl).setProperty(NODE_NODE, 8);
    lc.configure(ElkNodeImpl).setProperty(NODE_NODE, 9);
    lc.visit(label);
    expect(label.hasProperty(EDGE_NODE)).toBe(true);
    expect(label.getProperty(EDGE_NODE)).toBe(7);
    expect(label.hasProperty(NODE_NODE)).toBe(false);
    lc.configure(ElkLabelImpl).setProperty(NODE_NODE, 10);
    lc.visit(label);
    expect(label.getProperty(NODE_NODE)).toBe(10);
  });

  it('a port gets ElkConnectableShape and ElkPort options but not ElkNode or ElkEdge ones', () => {
    const root = ElkGraphUtil.createGraph();
    const port = ElkGraphUtil.createPort(root);
    const lc = new LayoutConfigurator();
    lc.configure(ElkConnectableShapeImpl).setProperty(EDGE_NODE, 3);
    lc.configure(ElkPortImpl).setProperty(NODE_NODE, 4);
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 5);
    lc.configure(ElkEdgeImpl).setProperty(CoreOptions.SPACING_LABEL_LABEL, 6);
    lc.visit(port);
    expect(port.getProperty(EDGE_NODE)).toBe(3);
    expect(port.getProperty(NODE_NODE)).toBe(4);
    expect(port.hasProperty(CoreOptions.SPACING_COMPONENT_COMPONENT)).toBe(false);
    expect(port.hasProperty(CoreOptions.SPACING_LABEL_LABEL)).toBe(false);
  });

  it('an edge gets ElkGraphElement and ElkEdge options only', () => {
    const root = ElkGraphUtil.createGraph();
    const edge = ElkGraphUtil.createEdge(root);
    const lc = new LayoutConfigurator();
    lc.configure(ElkGraphElementImpl).setProperty(EDGE_NODE, 1);
    lc.configure(ElkShapeImpl).setProperty(NODE_NODE, 2);
    lc.configure(ElkEdgeImpl).setProperty(CoreOptions.SPACING_LABEL_LABEL, 3);
    lc.visit(edge);
    expect(edge.getProperty(EDGE_NODE)).toBe(1);
    expect(edge.getProperty(CoreOptions.SPACING_LABEL_LABEL)).toBe(3);
    expect(edge.hasProperty(NODE_NODE)).toBe(false);
  });

  it('clearLayout clears the element before applying; default is false and the setter chains', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(NODE_NODE, 13);
    root.setProperty(EDGE_NODE, 14);
    const lc = new LayoutConfigurator();
    expect(lc.isClearLayout()).toBe(false);
    lc.configure(ElkNodeImpl).setProperty(NODE_NODE, 42);
    lc.visit(root);
    expect(root.getProperty(EDGE_NODE)).toBe(14);
    expect(lc.setClearLayout(true)).toBe(lc);
    expect(lc.isClearLayout()).toBe(true);
    lc.visit(root);
    expect(root.hasProperty(EDGE_NODE)).toBe(false);
    expect(root.getProperty(NODE_NODE)).toBe(42);
  });

  it('all filters must accept, and addFilter chains', () => {
    const root = ElkGraphUtil.createGraph();
    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(NODE_NODE, 1).setProperty(EDGE_NODE, 2);
    const seen: string[] = [];
    expect(
      lc.addFilter({
        accept: (_e: ElkGraphElement, p): boolean => {
          seen.push(p.getId());
          return p.getId() !== EDGE_NODE.getId();
        },
      }),
    ).toBe(lc);
    lc.addFilter({ accept: (): boolean => true });
    lc.visit(root);
    expect(root.getProperty(NODE_NODE)).toBe(1);
    expect(root.hasProperty(EDGE_NODE)).toBe(false);
    expect([...seen].sort()).toEqual([EDGE_NODE.getId(), NODE_NODE.getId()].sort());
  });

  it('NO_OVERWRITE_HOLDER accepts only properties the holder does not have', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(NODE_NODE, 1);
    expect(LayoutConfigurator.NO_OVERWRITE_HOLDER.accept(root, NODE_NODE)).toBe(false);
    expect(LayoutConfigurator.NO_OVERWRITE_HOLDER.accept(root, EDGE_NODE)).toBe(true);
    expect(LayoutConfigurator.NO_OVERWRITE.accept(root, NODE_NODE)).toBe(false);
    expect(LayoutConfigurator.NO_OVERWRITE.accept(root, EDGE_NODE)).toBe(true);
  });

  it('Cloneable values are cloned onto the element', () => {
    const root = ElkGraphUtil.createGraph();
    const lc = new LayoutConfigurator();
    const position = new KVector(3, 4);
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.POSITION, position);
    lc.visit(root);
    const applied = root.getProperty(CoreOptions.POSITION);
    expect(applied).not.toBe(position);
    expect([applied.x, applied.y]).toEqual([3, 4]);
  });

  it('a value whose clone is unregistered is applied as is', () => {
    class Opaque {}
    const opaque = new Opaque();
    const prop = new Property<Opaque>('test.opaque');
    const root = ElkGraphUtil.createGraph();
    const lc = new LayoutConfigurator();
    lc.configure(root).setProperty(prop, opaque);
    lc.visit(root);
    expect(root.getProperty(prop)).toBe(opaque);
  });

  it('a chain value is cloned too when it is cloneable', () => {
    const chain = new KVectorChain();
    chain.add(new KVector(1, 2));
    const root = ElkGraphUtil.createGraph();
    const lc = new LayoutConfigurator();
    lc.configure(root).setProperty(CoreOptions.BEND_POINTS, chain);
    lc.visit(root);
    const applied = root.getProperty(CoreOptions.BEND_POINTS);
    expect(applied).not.toBe(chain);
    expect(applied.size()).toBe(1);
  });

  it('overrideWith copies holders, clearLayout and filters, replacing the own filters', () => {
    const root = ElkGraphUtil.createGraph();
    const a = new LayoutConfigurator();
    a.configure(ElkNodeImpl).setProperty(NODE_NODE, 1).setProperty(EDGE_NODE, 2);
    a.configure(root).setProperty(CoreOptions.SPACING_LABEL_LABEL, 3);
    a.addFilter({ accept: (): boolean => false });
    const b = new LayoutConfigurator();
    b.configure(ElkNodeImpl).setProperty(NODE_NODE, 10);
    b.configure(root).setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 4);
    b.setClearLayout(true);
    expect(a.overrideWith(b)).toBe(a);
    expect(a.isClearLayout()).toBe(true);
    a.visit(root);
    expect(root.getProperty(NODE_NODE)).toBe(10);
    expect(root.getProperty(EDGE_NODE)).toBe(2);
    expect(root.getProperty(CoreOptions.SPACING_LABEL_LABEL)).toBe(3);
    expect(root.getProperty(CoreOptions.SPACING_COMPONENT_COMPONENT)).toBe(4);
    // a's filter that rejected everything was replaced by b's empty list
  });

  it('overrideWith creates holders for keys this configurator does not have yet', () => {
    const root = ElkGraphUtil.createGraph();
    const a = new LayoutConfigurator();
    const b = new LayoutConfigurator();
    b.configure(ElkNodeImpl).setProperty(NODE_NODE, 7);
    b.configure(root).setProperty(EDGE_NODE, 8);
    a.overrideWith(b);
    expect(a.getProperties(ElkNodeImpl)?.getProperty(NODE_NODE)).toBe(7);
    expect(a.getProperties(root)?.getProperty(EDGE_NODE)).toBe(8);
    expect(a.getProperties(ElkNodeImpl)).not.toBe(b.getProperties(ElkNodeImpl));
  });
});

describe('LayoutConfigurator.OPTION_TARGET_FILTER', () => {
  const filter = LayoutConfigurator.OPTION_TARGET_FILTER;
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('accepts everything for an unknown option', () => {
    const root = ElkGraphUtil.createGraph();
    expect(filter.accept(root, new Property<number>('no.such.option'))).toBe(true);
  });

  it('checks NODES for a leaf node and NODES or PARENTS for a hierarchical node', () => {
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    // ALGORITHM targets PARENTS only
    expect(filter.accept(child, CoreOptions.ALGORITHM)).toBe(false);
    expect(filter.accept(root, CoreOptions.ALGORITHM)).toBe(true);
    // POSITION targets NODES, PORTS, LABELS
    expect(filter.accept(child, CoreOptions.POSITION)).toBe(true);
    expect(filter.accept(root, CoreOptions.POSITION)).toBe(true);
  });

  it('checks EDGES for an edge, PORTS for a port and LABELS for a label', () => {
    const root = ElkGraphUtil.createGraph();
    const edge = ElkGraphUtil.createEdge(root);
    const port = ElkGraphUtil.createPort(root);
    const label = ElkGraphUtil.createLabel(root);
    // BEND_POINTS targets EDGES only
    expect(filter.accept(edge, CoreOptions.BEND_POINTS)).toBe(true);
    expect(filter.accept(port, CoreOptions.BEND_POINTS)).toBe(false);
    expect(filter.accept(label, CoreOptions.BEND_POINTS)).toBe(false);
    expect(filter.accept(root, CoreOptions.BEND_POINTS)).toBe(false);
    // POSITION targets NODES, PORTS, LABELS
    expect(filter.accept(edge, CoreOptions.POSITION)).toBe(false);
    expect(filter.accept(port, CoreOptions.POSITION)).toBe(true);
    expect(filter.accept(label, CoreOptions.POSITION)).toBe(true);
    // SOFTWRAPPING_FUZZINESS targets LABELS only
    expect(filter.accept(label, CoreOptions.SOFTWRAPPING_FUZZINESS)).toBe(true);
    expect(filter.accept(port, CoreOptions.SOFTWRAPPING_FUZZINESS)).toBe(false);
  });
});
