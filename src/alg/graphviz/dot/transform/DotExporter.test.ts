// SPDX-License-Identifier: EPL-2.0
// Unit tests of DotExporter for what no row of graphviz-dot-export.json reaches: the `createAttribute` overloads
// (the `float` one has no caller in the bundle; its values come from the JVM `floatToString` vectors), the
// NullPointerExceptions the Java's typed catches let through, and a cross-hierarchy edge leaving the source graph.
// The replay of every recorded row is DotExporter.replay.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { AttributeType } from '../dot/AttributeType.js';
import { DotFactory } from '../dot/DotFactory.js';
import { DotPackage } from '../dot/DotPackage.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Statement } from '../dot/Statement.js';
import { Attributes } from './Attributes.js';
import { DotExporter } from './DotExporter.js';
import { DotTransformationData } from './DotTransformationData.js';

const JDK_REF_URL = new URL('../../../../../test/golden/refs/java/graphviz-dot-jdk.json', import.meta.url);
const TO_STRING_FAMILY = 'floatToString';
const HEX_RADIX = 16;
const NAME = 'n';

interface ToStringRow {
  readonly id: string;
  readonly family: string;
  readonly bits: string;
  readonly text: string;
}

const FLOAT_ROWS = (JSON.parse(readFileSync(JDK_REF_URL, 'utf8')) as { rows: ToStringRow[] }).rows.filter(
  (r) => r.family === TO_STRING_FAMILY,
);
const scratch = new DataView(new ArrayBuffer(4));

function floatFromBits(bits: string): number {
  scratch.setUint32(0, Number.parseInt(bits, HEX_RADIX));
  return scratch.getFloat32(0);
}

/** `"\"" + value + "\""` of the `int` overload: `Integer.toString` (Java source semantics). */
const INT_CASES: readonly (readonly [number, string])[] = [
  [0, '"0"'],
  [-7, '"-7"'],
  [2147483647, '"2147483647"'],
  [-2147483648, '"-2147483648"'],
];
/** `"\"" + value + "\""` of the `double` overload: `Double.toString` (Javadoc: scientific below 1e-3 and from 1e7). */
const DOUBLE_CASES: readonly (readonly [number, string])[] = [
  [0, '"0.0"'],
  [0.5, '"0.5"'],
  [-1, '"-1.0"'],
  [1e-5, '"1.0E-5"'],
  [1e7, '"1.0E7"'],
  [Number.NaN, '"NaN"'],
];

type Data = DotTransformationData<ElkNode, GraphvizModel>;

function transformed(root: ElkNode, configure: (data: Data) => void = () => undefined): Data {
  LayoutMetaDataService.getInstance();
  const data = new DotTransformationData<ElkNode, GraphvizModel>();
  data.setSourceGraph(root);
  configure(data);
  new DotExporter().transform(data);
  return data;
}

/** A laid-out model with one `graph` or node statement whose single attribute has no value. */
function modelWithValuelessAttribute(name: string, onGraph: boolean): GraphvizModel {
  const model = DotFactory.eINSTANCE.createGraphvizModel();
  const graph = DotFactory.eINSTANCE.createGraph();
  model.getGraphs().add(graph);
  const attribute = DotExporter.createAttribute(name, null);
  if (onGraph) {
    const statement = DotFactory.eINSTANCE.createAttributeStatement();
    statement.setType(AttributeType.GRAPH);
    statement.getAttributes().add(attribute);
    graph.getStatements().add(statement);
  } else {
    const statement = DotFactory.eINSTANCE.createNodeStatement();
    const node = DotFactory.eINSTANCE.createNode();
    node.setName('node1');
    statement.setNode(node);
    statement.getAttributes().add(attribute);
    graph.getStatements().add(statement);
  }
  return model;
}

function edgeStatements(statements: Iterable<Statement>): number {
  return [...statements].filter((s) => DotPackage.Literals.EDGE_STATEMENT.isInstance(s)).length;
}

describe('DotExporter.createAttribute overloads', () => {
  it('createAttribute keeps the value as given, null included', () => {
    const attribute = DotExporter.createAttribute(Attributes.LHEAD, null);
    expect([attribute.getName(), attribute.getValue()]).toEqual(['lhead', null]);
    expect(DotExporter.createAttribute(Attributes.SHAPE, 'box').getValue()).toBe('box');
  });

  it('createAttributeInt quotes Integer.toString', () => {
    expect(INT_CASES.map(([v]) => DotExporter.createAttributeInt(Attributes.PACK, v).getValue())).toEqual(
      INT_CASES.map(([, text]) => text),
    );
  });

  it('createAttributeDouble quotes Double.toString', () => {
    expect(DOUBLE_CASES.map(([v]) => DotExporter.createAttributeDouble(Attributes.WIDTH, v).getValue())).toEqual(
      DOUBLE_CASES.map(([, text]) => text),
    );
  });

  it('createAttributeFloat quotes Float.toString for every JVM floatToString vector', () => {
    expect(FLOAT_ROWS.length).toBeGreaterThan(0);
    for (const row of FLOAT_ROWS) {
      const attribute = DotExporter.createAttributeFloat(Attributes.SEP, floatFromBits(row.bits));
      expect([attribute.getName(), attribute.getValue()], row.id).toEqual(['sep', `"${row.text}"`]);
    }
  });

  it('exposes the Java constants, DPI as the float 72.0f', () => {
    expect([DotExporter.DEF_SPACING_SMALL, DotExporter.DEF_SPACING_LARGE, DotExporter.DEF_SPACING_XLARGE]).toEqual([
      20, 40, 60,
    ]);
    expect(DotExporter.DPI).toBe(72);
  });
});

describe('DotExporter: paths no recorded row reaches', () => {
  it('skips an edge to a node outside the source graph even in hierarchy mode (isInsideGraph is false)', () => {
    const root = ElkGraphUtil.createGraph();
    const sub = ElkGraphUtil.createNode(root);
    const inner = ElkGraphUtil.createNode(sub);
    const outside = ElkGraphUtil.createNode(root);
    const inner2 = ElkGraphUtil.createNode(sub);
    ElkGraphUtil.createSimpleEdge(inner, outside);
    ElkGraphUtil.createSimpleEdge(inner, inner2);
    const data = transformed(sub, (d) => d.setProperty(DotExporter.HIERARCHY, true));
    const statements = (data.getTargetGraphs()[0] as GraphvizModel).getGraphs().get(0).getStatements();
    expect(edgeStatements(statements)).toBe(1);
  });

  it('lets the NullPointerException of a valueless bb through the caught parse exceptions', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root).setIdentifier(NAME);
    const data = transformed(root);
    data.getTargetGraphs()[0] = modelWithValuelessAttribute(Attributes.BOUNDINGBOX, true);
    expect(() => new DotExporter().transferLayout(data)).toThrow(TypeError);
  });

  it('lets the NullPointerException of a valueless node width through the caught parse exceptions', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root).setIdentifier(NAME);
    const data = transformed(root);
    data.getTargetGraphs()[0] = modelWithValuelessAttribute(Attributes.WIDTH, false);
    expect(() => new DotExporter().transferLayout(data)).toThrow(TypeError);
  });
});
