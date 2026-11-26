// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { a, as, digraph, e, n, node, port, to } from '../../../../../test/helpers/dot-write-builders.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import { StringIndexOutOfBoundsException } from '../../../../java/lang/StringIndexOutOfBoundsException.js';
import { AttributeType } from '../dot/AttributeType.js';
import { EdgeOperator } from '../dot/EdgeOperator.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { DotImporter } from './DotImporter.js';
import { transformAttribute } from './DotImporterAttributes.js';
import { PROP_STATEMENT } from './DotImporterProperties.js';
import { DotTransformationData } from './DotTransformationData.js';

// The branches of DotImporter.java that no scenario of graphviz-dot-import.json reaches (the grammar cannot produce
// the model), on hand-built models. Expected behaviour read from the Java source (AD-13).

// The recorder's first step: the registry with CoreOptions only (G3), which also registers the ElkReflect clones
// (`getProperty(PADDING)` clones the default padding).
LayoutMetaDataService.getInstance();

type Data = DotTransformationData<GraphvizModel, ElkNode>;

function dataOf(model: GraphvizModel): Data {
  const data = new DotTransformationData<GraphvizModel, ElkNode>();
  data.setSourceGraph(model);
  return data;
}

function transformed(model: GraphvizModel): Data {
  const data = dataOf(model);
  new DotImporter().transform(data);
  return data;
}

const DIRECTED = EdgeOperator.DIRECTED;
/** A property holder whose `setProperty` fails with an error that is no `IllegalArgumentException`. */
class FailingHolder extends MapPropertyHolder {
  override setProperty(): this {
    throw new RangeError('setProperty failed');
  }
}

describe('DotImporter: branches no recorded scenario reaches', () => {
  it('creates a new port for every endpoint whose port has no name, and stores none (portId == null)', () => {
    const unnamed = (): ReturnType<typeof node> => node('a', port(null, null));
    const data = transformed(
      digraph(e(unnamed(), [], to(DIRECTED, node('b', null))), e(unnamed(), [], to(DIRECTED, node('b', null)))),
    );
    const a0 = data.getTargetGraphs()[0].getChildren().get(0);
    expect(a0.getPorts().size()).toBe(2);
    const sources = [...a0.getPorts()].map((p) => [...p.getOutgoingEdges()].length);
    expect(sources).toEqual([1, 1]);
  });

  it('reuses the port of a named endpoint (portId stored by node and name)', () => {
    const named = (): ReturnType<typeof node> => node('a', port('p', null));
    const data = transformed(
      digraph(e(named(), [], to(DIRECTED, node('b', null))), e(named(), [], to(DIRECTED, node('b', null)))),
    );
    const a0 = data.getTargetGraphs()[0].getChildren().get(0);
    expect(a0.getPorts().size()).toBe(1);
    expect([...a0.getPorts().get(0).getOutgoingEdges()].length).toBe(2);
  });

  it('throws StringIndexOutOfBoundsException for a value of one quote character (trimValue: substring(1, 0))', () => {
    const data = dataOf(digraph(n('a', a('label', '"'))));
    expect(() => new DotImporter().transform(data)).toThrow(StringIndexOutOfBoundsException);
    expect(() => new DotImporter().transform(dataOf(digraph(n('a', a('label', '"')))))).toThrow(
      'begin 1, end 0, length 1',
    );
    expect([...data.getMessages()]).toEqual([]);
  });

  it('trims a quoted value and reads a missing value as "true"', () => {
    const data = transformed(digraph(n('a', a('label', '"  x y  "')), n('b', a('label', null))));
    const children = data.getTargetGraphs()[0].getChildren();
    expect(children.get(0).getLabels().get(0).getText()).toBe('x y');
    expect(children.get(1).getLabels().get(0).getText()).toBe('true');
  });

  it('throws a NullPointerException (TypeError) for a graph margin without value, as Java does', () => {
    const data = dataOf(digraph(as(AttributeType.GRAPH, a('margin', null))));
    expect(() => new DotImporter().transform(data)).toThrow(TypeError);
  });

  it('lets an error that is no IllegalArgumentException escape transformAttribute, logging nothing', () => {
    const data = dataOf(digraph());
    expect(() => transformAttribute(new FailingHolder(), a('pack', 'true'), data)).toThrow('setProperty failed');
    expect([...data.getMessages()]).toEqual([]);
  });

  it('throws a NullPointerException (TypeError) without a source graph', () => {
    expect(() => new DotImporter().transform(new DotTransformationData<GraphvizModel, ElkNode>())).toThrow(TypeError);
  });
  it('transfers nothing to a node whose statement is neither a node statement nor a subgraph', () => {
    const model = digraph(n('a'));
    const data = transformed(model);
    const child = data.getTargetGraphs()[0].getChildren().get(0);
    child.setProperty(PROP_STATEMENT, a('x', 'y'));
    new DotImporter().transferLayout(data);
    const statements = [...model.getGraphs().get(0).getStatements()];
    expect(statements.map((s) => s.eClass().getName())).toEqual(['NodeStatement', 'Attribute']);
    expect([...(statements[0] as NodeStatement).getAttributes()]).toEqual([]);
  });
});
