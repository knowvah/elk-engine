// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { a, digraph, n, node, port } from '../../../../../test/helpers/dot-write-builders.js';
import { DotPackage, type DotEObject } from '../dot/DotPackage.js';
import type { Graph } from '../dot/Graph.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import { checkBounds } from './GraphvizDotConstraint.js';
import {
  diagnosticToString,
  getValueConversionExceptionDiagnostic,
  objPath,
  throwDiagnostic,
} from './GraphvizDotSerializationDiagnostic.js';

// Expected texts follow ISerializationDiagnostic.ToString (lines 104-128), EmfFormatter.objPath (209-237),
// TokenDiagnosticProvider.getValueConversionExceptionDiagnostic (78-90) and
// SequencerDiagnosticProvider.createBacktrackingFailedDiagnostic (70-104) of Xtext 2.36.

const L = DotPackage.Literals;

function firstGraph(): Graph {
  return digraph(n(node('a', port('p', 'n')), a('k', 'v')))
    .getGraphs()
    .get(0);
}

function firstStatement(): NodeStatement {
  return firstGraph().getStatements().get(0) as NodeStatement;
}

describe('objPath', () => {
  it('names each containment step, with the index of a list and the name feature in quotes', () => {
    const statement = firstStatement();
    expect(objPath(statement.getNode()!.getPort()!)).toBe(
      "GraphvizModel.graphs[0]->Graph'G'.statements[0]->NodeStatement.node->Node'a'.port->Port'p'",
    );
    expect(objPath(statement.getAttributes().get(0))).toBe(
      "GraphvizModel.graphs[0]->Graph'G'.statements[0]->NodeStatement.attributes[0]->Attribute'k'",
    );
  });

  it('is the class name alone for a root without a name feature', () => {
    expect(objPath(digraph())).toBe('GraphvizModel');
  });
});

describe('diagnosticToString', () => {
  const port = (): DotEObject => firstStatement().getNode()!.getPort()!;

  it('has no URI line for an object outside a resource and prints the feature with the package prefix', () => {
    const cause = new ValueConverterException("The value '1' is an invalid ID", null, null);
    const text = diagnosticToString(
      getValueConversionExceptionDiagnostic(port(), L.PORT__COMPASS_PT, 'ID', '1', cause),
    );
    expect(text).toBe(
      [
        "Error while converting value '1' for grammar rule 'ID' to string via ValueConverter.",
        "Caused By: org.eclipse.xtext.conversion.ValueConverterException: The value '1' is an invalid ID",
        "Semantic Object: GraphvizModel.graphs[0]->Graph'G'.statements[0]->NodeStatement.node->Node'a'.port->Port'p'",
        'EStructuralFeature: dot::Port.compass_pt',
      ].join('\n'),
    );
  });

  it('leaves out the cause when its message is null or equal to the message', () => {
    const silent = new ValueConverterException(null, null, null);
    const same = new ValueConverterException('same', null, null);
    const base = { semanticObject: port(), context: null, feature: null };
    expect(diagnosticToString({ ...base, message: 'm', exception: silent })).toBe(
      "m\nSemantic Object: GraphvizModel.graphs[0]->Graph'G'.statements[0]->NodeStatement.node->Node'a'.port->Port'p'",
    );
    expect(diagnosticToString({ ...base, message: 'same', exception: same }).split('\n')).toHaveLength(2);
  });

  it('prints the Java class name of a ClassCastException cause and the TS name of any other error', () => {
    const base = { message: 'm', semanticObject: digraph(), context: null, feature: null };
    expect(diagnosticToString({ ...base, exception: new ClassCastException('x') }).split('\n')[1]).toBe(
      'Caused By: java.lang.ClassCastException: x',
    );
    expect(diagnosticToString({ ...base, exception: new TypeError('y') }).split('\n')[1]).toBe(
      'Caused By: TypeError: y',
    );
  });

  it('leaves out an empty message', () => {
    expect(
      diagnosticToString({ message: '', exception: null, semanticObject: digraph(), context: null, feature: null }),
    ).toBe('Semantic Object: GraphvizModel');
  });
});

describe('throwDiagnostic', () => {
  it('throws a RuntimeException of the text with the exception as cause', () => {
    const cause = new ValueConverterException('bad', null, null);
    const diagnostic = { message: 'm', exception: cause, semanticObject: digraph(), context: null, feature: null };
    expect(() => throwDiagnostic(diagnostic)).toThrow(
      expect.objectContaining({ constructor: RuntimeException, message: diagnosticToString(diagnostic), cause }),
    );
  });
});

describe('checkBounds', () => {
  it('reports values over an upper bound, for a list and for a single value', () => {
    const graph = firstGraph();
    const constraint = {
      type: 'Graph',
      features: [
        { feature: L.GRAPH__NAME, lower: 0, upper: 0 },
        { feature: L.GRAPH__STATEMENTS, lower: 0, upper: 0 },
      ],
    };
    expect(() => checkBounds(graph, { rule: 'Graph' }, constraint)).toThrow(
      [
        'Could not serialize Graph:',
        'Graph.name is not allowed to have a value, but it does.',
        'Graph.statements violates the upper bound: It holds 1 values, but only 0 are allowed.',
        "Semantic Object: GraphvizModel.graphs[0]->Graph'G'",
        'Context: Graph returns Graph',
      ].join('\n'),
    );
  });

  it('does not count an optional value (an unset enum with a writable default) against the upper bound', () => {
    const constraint = { type: 'Graph', features: [{ feature: L.GRAPH__STRICT, lower: 0, upper: 0 }] };
    let raised: unknown = null;
    try {
      checkBounds(firstGraph(), { rule: 'Graph' }, constraint);
    } catch (error) {
      raised = error;
    }
    expect(raised).toBeNull();
  });
});
