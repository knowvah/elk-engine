// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { MessageArgs } from '../../../../xtext/validation/MessageArguments.js';
import { Configuration } from './Configuration.js';
import { ConstraintType } from './ConstraintType.js';
import { DoubleQuantity } from './DoubleQuantity.js';
import { Edges } from './Edges.js';
import { Flow } from './Flow.js';
import { FlowType } from './FlowType.js';
import { Form } from './Form.js';
import { Formats } from './Formats.js';
import { GRandomPackage } from './GRandomPackage.js';
import { Hierarchy } from './Hierarchy.js';
import { Nodes } from './Nodes.js';
import { Ports } from './Ports.js';
import { RandGraph } from './RandGraph.js';
import { Side } from './Side.js';
import { Size } from './Size.js';

describe('defaults', () => {
  it('Configuration', () => {
    const c = new Configuration();
    expect([c.getSamples(), c.getForm(), c.getNodes(), c.getEdges()]).toEqual([0, Form.TREES, null, null]);
    expect([c.isMW(), c.isMD(), c.isPF()]).toEqual([false, false, false]);
    expect([c.getMaxWidth(), c.getMaxDegree(), c.getSeed(), c.getFilename()]).toEqual([null, null, null, null]);
    expect([c.getFraction(), c.getHierarchy(), c.getFormat()]).toEqual([null, null, Formats.ELKT]);
  });

  it('DoubleQuantity', () => {
    const q = new DoubleQuantity();
    expect([q.getQuant(), q.getMin(), q.getMax(), q.getMean(), q.getStddv()]).toEqual([null, null, null, null, null]);
    expect([q.isMinMax(), q.isGaussian()]).toEqual([false, false]);
  });

  it('Edges, Nodes, Size, Ports, Flow, Hierarchy, RandGraph', () => {
    const e = new Edges();
    expect([e.isDensity(), e.isTotal(), e.isRelative(), e.isOutbound(), e.isLabels(), e.isSelfLoops()]).toEqual(
      Array<boolean>(6).fill(false),
    );
    expect(e.getNEdges()).toBeNull();
    const n = new Nodes();
    expect([n.getNNodes(), n.getPorts(), n.getSize(), n.isLabels(), n.isRemoveIsolated()]).toEqual([
      null,
      null,
      null,
      false,
      false,
    ]);
    expect([new Size().getHeight(), new Size().getWidth()]).toEqual([null, null]);
    const p = new Ports();
    expect([p.isLabels(), p.getReUse(), p.getSize(), p.getConstraint(), p.getFlow()]).toEqual([
      false,
      null,
      null,
      ConstraintType.FREE,
      [],
    ]);
    const f = new Flow();
    expect([f.getFlowType(), f.getSide(), f.getAmount()]).toEqual([FlowType.INCOMING, Side.NORTH, null]);
    const h = new Hierarchy();
    expect([h.getLevels(), h.getEdges(), h.getNumHierarchNodes(), h.getCrossHierarchRel()]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(new RandGraph().getConfigs()).toEqual([]);
  });
});

describe('setters', () => {
  it('Configuration round-trips every feature', () => {
    const c = new Configuration();
    const [nodes, edges, fraction, hierarchy] = [new Nodes(), new Edges(), new DoubleQuantity(), new Hierarchy()];
    c.setSamples(3);
    c.setForm(Form.ACYCLIC);
    c.setNodes(nodes);
    c.setEdges(edges);
    c.setMW(true);
    c.setMaxWidth(4);
    c.setMD(true);
    c.setMaxDegree(5);
    c.setPF(true);
    c.setFraction(fraction);
    c.setHierarchy(hierarchy);
    c.setSeed(0);
    c.setFormat(Formats.ELKG);
    c.setFilename('f');
    expect([c.getSamples(), c.getForm(), c.getNodes(), c.getEdges()]).toEqual([3, Form.ACYCLIC, nodes, edges]);
    expect([c.isMW(), c.getMaxWidth(), c.isMD(), c.getMaxDegree(), c.isPF()]).toEqual([true, 4, true, 5, true]);
    expect([c.getFraction(), c.getHierarchy(), c.getSeed(), c.getFormat(), c.getFilename()]).toEqual([
      fraction,
      hierarchy,
      0,
      Formats.ELKG,
      'f',
    ]);
  });

  it('other classes round-trip', () => {
    const q = new DoubleQuantity();
    q.setQuant(1.5);
    q.setMin(1);
    q.setMinMax(true);
    q.setMax(2);
    q.setMean(3);
    q.setGaussian(true);
    q.setStddv(0.5);
    expect([q.getQuant(), q.getMin(), q.isMinMax(), q.getMax(), q.getMean(), q.isGaussian(), q.getStddv()]).toEqual([
      1.5,
      1,
      true,
      2,
      3,
      true,
      0.5,
    ]);
    const e = new Edges();
    e.setDensity(true);
    e.setTotal(true);
    e.setRelative(true);
    e.setOutbound(true);
    e.setNEdges(q);
    e.setLabels(true);
    e.setSelfLoops(true);
    expect([
      e.isDensity(),
      e.isTotal(),
      e.isRelative(),
      e.isOutbound(),
      e.getNEdges(),
      e.isLabels(),
      e.isSelfLoops(),
    ]).toEqual([true, true, true, true, q, true, true]);
    const size = new Size();
    size.setHeight(q);
    size.setWidth(q);
    const p = new Ports();
    p.setLabels(true);
    p.setReUse(q);
    p.setSize(size);
    p.setConstraint(ConstraintType.RATIO);
    const flow = new Flow();
    flow.setFlowType(FlowType.OUTGOING);
    flow.setSide(Side.WEST);
    flow.setAmount(q);
    p.getFlow().push(flow);
    expect([p.isLabels(), p.getReUse(), p.getSize(), p.getConstraint(), p.getFlow()]).toEqual([
      true,
      q,
      size,
      ConstraintType.RATIO,
      [flow],
    ]);
    expect([size.getHeight(), size.getWidth(), flow.getFlowType(), flow.getSide(), flow.getAmount()]).toEqual([
      q,
      q,
      FlowType.OUTGOING,
      Side.WEST,
      q,
    ]);
    const n = new Nodes();
    n.setNNodes(q);
    n.setPorts(p);
    n.setLabels(true);
    n.setSize(size);
    n.setRemoveIsolated(true);
    expect([n.getNNodes(), n.getPorts(), n.isLabels(), n.getSize(), n.isRemoveIsolated()]).toEqual([
      q,
      p,
      true,
      size,
      true,
    ]);
    const h = new Hierarchy();
    h.setLevels(q);
    h.setEdges(q);
    h.setNumHierarchNodes(q);
    h.setCrossHierarchRel(q);
    expect([h.getLevels(), h.getEdges(), h.getNumHierarchNodes(), h.getCrossHierarchRel()]).toEqual([q, q, q, q]);
    const g = new RandGraph();
    const c = new Configuration();
    g.getConfigs().push(c);
    expect(g.getConfigs()).toEqual([c]);
  });
});

describe('GRandomPackage.Literals', () => {
  it('names the three validator features', () => {
    const { CONFIGURATION__MW, CONFIGURATION__MD, CONFIGURATION__PF } = GRandomPackage.Literals;
    expect([CONFIGURATION__MW, CONFIGURATION__MD, CONFIGURATION__PF].map((f) => f.getName())).toEqual([
      'mW',
      'mD',
      'pF',
    ]);
  });

  it('are valid MessageArgs (feature-only form of error(message, feature))', () => {
    const args: MessageArgs = [GRandomPackage.Literals.CONFIGURATION__MD];
    expect(args).toHaveLength(1);
  });
});
