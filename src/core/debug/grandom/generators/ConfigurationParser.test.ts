// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { Random } from '../../../../java/util/Random.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import { Configuration } from '../gRandom/Configuration.js';
import { ConstraintType } from '../gRandom/ConstraintType.js';
import { DoubleQuantity } from '../gRandom/DoubleQuantity.js';
import { Flow } from '../gRandom/Flow.js';
import { FlowType } from '../gRandom/FlowType.js';
import { Form } from '../gRandom/Form.js';
import { Nodes } from '../gRandom/Nodes.js';
import { Ports } from '../gRandom/Ports.js';
import { Side } from '../gRandom/Side.js';
import { ConfigurationParser } from './ConfigurationParser.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { GraphType } from './GraphType.js';

const SEED = 7n;

function exact(value: number): DoubleQuantity {
  const q = new DoubleQuantity();
  q.setQuant(value);
  return q;
}

function configWithFlows(flows: [FlowType, Side, DoubleQuantity][]): Configuration {
  const ports = new Ports();
  for (const [type, side, amount] of flows) {
    const flow = new Flow();
    flow.setFlowType(type);
    flow.setSide(side);
    flow.setAmount(amount);
    ports.getFlow().push(flow);
  }
  const nodes = new Nodes();
  nodes.setPorts(ports);
  const config = new Configuration();
  config.setNodes(nodes);
  return config;
}

const SIDE_PROPERTIES: Record<'incoming' | 'outgoing', [Side, IProperty<number>][]> = {
  incoming: [
    [Side.NORTH, GeneratorOptions.INCOMING_NORTH_SIDE],
    [Side.EAST, GeneratorOptions.INCOMING_EAST_SIDE],
    [Side.SOUTH, GeneratorOptions.INCOMING_SOUTH_SIDE],
    [Side.WEST, GeneratorOptions.INCOMING_WEST_SIDE],
  ],
  outgoing: [
    [Side.NORTH, GeneratorOptions.OUTGOING_NORTH_SIDE],
    [Side.EAST, GeneratorOptions.OUTGOING_EAST_SIDE],
    [Side.SOUTH, GeneratorOptions.OUTGOING_SOUTH_SIDE],
    [Side.WEST, GeneratorOptions.OUTGOING_WEST_SIDE],
  ],
};
const ALL_SIDE_PROPERTIES = [...SIDE_PROPERTIES.incoming, ...SIDE_PROPERTIES.outgoing].map(([, p]) => p);
const MARK = 99;

describe('ConfigurationParser.parse flows', () => {
  const cases: [FlowType, Side, IProperty<number>][] = [
    ...SIDE_PROPERTIES.incoming.map(([s, p]): [FlowType, Side, IProperty<number>] => [FlowType.INCOMING, s, p]),
    ...SIDE_PROPERTIES.outgoing.map(([s, p]): [FlowType, Side, IProperty<number>] => [FlowType.OUTGOING, s, p]),
  ];
  for (const [type, side, property] of cases) {
    it(`${type.getName()} ${side.getName()} sets only its own property`, () => {
      const options = ConfigurationParser.parse(configWithFlows([[type, side, exact(MARK)]]), new Random(SEED));
      for (const p of ALL_SIDE_PROPERTIES) {
        const expected = p === property ? MARK : p.getDefault();
        expect(options.getProperty(p)).toBe(expected);
      }
    });
  }

  it('draws from the Random only for non-exact flow amounts, in flow order', () => {
    const range = new DoubleQuantity();
    range.setMinMax(true);
    range.setMin(1);
    range.setMax(50);
    const config = configWithFlows([
      [FlowType.INCOMING, Side.NORTH, range],
      [FlowType.OUTGOING, Side.WEST, exact(3)],
      [FlowType.INCOMING, Side.EAST, range],
    ]);
    const options = ConfigurationParser.parse(config, new Random(SEED));
    const r = new Random(SEED);
    const first = Math.round(r.nextDouble() * 49 + 1);
    const second = Math.round(r.nextDouble() * 49 + 1);
    expect(options.getProperty(GeneratorOptions.INCOMING_NORTH_SIDE)).toBe(first);
    expect(options.getProperty(GeneratorOptions.OUTGOING_WEST_SIDE)).toBe(3);
    expect(options.getProperty(GeneratorOptions.INCOMING_EAST_SIDE)).toBe(second);
  });

  it('a flow without an amount is a NullPointerException (TypeError)', () => {
    const config = configWithFlows([[FlowType.INCOMING, Side.NORTH, exact(1)]]);
    config.getNodes()!.getPorts()!.getFlow()[0]!.setAmount(null);
    expect(() => ConfigurationParser.parse(config, new Random(SEED))).toThrow(TypeError);
  });

  it('a minMax quantity without bounds fails to unbox', () => {
    const q = new DoubleQuantity();
    q.setMinMax(true);
    expect(() =>
      ConfigurationParser.parse(configWithFlows([[FlowType.INCOMING, Side.EAST, q]]), new Random(SEED)),
    ).toThrow('Cannot unbox a null Double');
  });
});

describe('ConfigurationParser.parse constraints', () => {
  const cases: [ConstraintType, PortConstraints][] = [
    [ConstraintType.FREE, PortConstraints.FREE],
    [ConstraintType.ORDER, PortConstraints.FIXED_ORDER],
    [ConstraintType.POSITION, PortConstraints.FIXED_POS],
    [ConstraintType.SIDE, PortConstraints.FIXED_SIDE],
    [ConstraintType.RATIO, PortConstraints.FIXED_RATIO],
  ];
  for (const [type, expected] of cases) {
    it(`${type.getName()} maps to ${expected.name()}`, () => {
      const config = configWithFlows([]);
      config.getNodes()!.getPorts()!.setConstraint(type);
      const options = ConfigurationParser.parse(config, new Random(SEED));
      expect(options.getProperty(GeneratorOptions.PORT_CONSTRAINTS)).toBe(expected);
      expect(options.getProperty(GeneratorOptions.ENABLE_PORTS)).toBe(true);
    });
  }

  it('no ports block keeps UNDEFINED', () => {
    const options = ConfigurationParser.parse(new Configuration(), new Random(SEED));
    expect(options.getProperty(GeneratorOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.UNDEFINED);
  });
});

describe('ConfigurationParser.parse forms', () => {
  const cases: [Form, GraphType][] = [
    [Form.ACYCLIC, GraphType.ACYCLIC_NO_TRANSITIVE_EDGES],
    [Form.BICONNECTED, GraphType.BICONNECTED],
    [Form.BIPARTITE, GraphType.BIPARTITE],
    [Form.CUSTOM, GraphType.CUSTOM],
    [Form.TREES, GraphType.TREE],
    [Form.TRICONNECTED, GraphType.TRICONNECTED],
  ];
  for (const [form, expected] of cases) {
    it(`${form.getName()} maps to ${expected.name()}`, () => {
      const config = new Configuration();
      config.setForm(form);
      expect(ConfigurationParser.parse(config, new Random(SEED)).getProperty(GeneratorOptions.GRAPH_TYPE)).toBe(
        expected,
      );
    });
  }
});
