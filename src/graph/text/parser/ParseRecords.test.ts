// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IValueConverterService } from '../../../xtext/conversion/IValueConverterService.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../xtext/conversion/ValueConverterWithValueException.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkNode } from '../../ElkNode.js';
import { parse } from './ElkGraphParser.js';
import type { ParseResult } from './ParseRecords.js';

const SERVICES = new ElkGraphValueConverterService();

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

function root(text: string): ElkNode {
  const result = run(text);
  expect(result.diagnostics).toEqual([]);
  return result.root as ElkNode;
}

function geometry(n: ElkNode): number[] {
  return [n.getX(), n.getY(), n.getWidth(), n.getHeight()];
}

describe('ElkGraphParser: value conversion policy', () => {
  const stub = (toValue: IValueConverterService['toValue']): IValueConverterService => ({
    toValue,
    toString: () => '',
  });
  const withStub = (text: string, fn: IValueConverterService['toValue']): ParseResult => parse(text, stub(fn));

  it('reports a conversion failure with the node line and keeps parsing', () => {
    const result = withStub('\n\nnode a', (value, rule) => {
      if (rule === 'ID') throw new ValueConverterException('bad id', null, null);
      return value;
    });
    expect(result.diagnostics).toEqual([{ kind: 'conversion', message: 'bad id', line: 3 }]);
    expect([...(result.root as ElkNode).getChildren()]).toHaveLength(1);
  });

  it('applies the value of a ValueConverterWithValueException and still reports it', () => {
    const result = withStub('node a', () => {
      throw new ValueConverterWithValueException('recovered', null, 'fixed', null);
    });
    expect([...(result.root as ElkNode).getChildren()][0]?.getIdentifier()).toBe('fixed');
    expect(result.diagnostics.map((d) => d.message)).toEqual(['recovered']);
  });

  it('wraps foreign exceptions: the cause message, the class name, and the NullPointerException text', () => {
    const throwing = (error: unknown) => (text: string) =>
      withStub(text, () => {
        throw error;
      });
    expect(throwing(new RangeError('boom'))('node a').diagnostics[0]?.message).toBe('boom');
    expect(throwing(new RangeError(''))('node a').diagnostics[0]?.message).toBe('RangeError');
    expect(throwing('str')('node a').diagnostics[0]?.message).toBe('str');
    expect(throwing(new TypeError('x'))('node a').diagnostics[0]?.message).toBe('x');
  });

  it('falls back to the class name of the converter exception when there is no message', () => {
    const result = withStub('node a', () => {
      throw new ValueConverterException(null, null, null);
    });
    expect(result.diagnostics[0]?.message).toBe('ValueConverterException');
  });

  it('rejects a null Number for a primitive feature', () => {
    const result = withStub('layout [ position: 1, 2 ]', (value, rule) => (rule === 'Number' ? null : value));
    expect(result.diagnostics.map((d) => d.message)).toEqual([
      'ValueConverter returned null for primitive feature x',
      'ValueConverter returned null for primitive feature y',
    ]);
  });

  it('rejects a null Number with a value for a primitive feature', () => {
    const result = withStub('layout [ size: 1, 2 ]', (_value, rule) => {
      if (rule === 'Number') throw new ValueConverterWithValueException('m', null, null, null);
      return _value;
    });
    expect(result.diagnostics.map((d) => d.message)).toEqual([
      'ValueConverter returned null for primitive feature width',
      'ValueConverter returned null for primitive feature height',
    ]);
  });

  it('emulates the recovery for a missing number only where the grammar can continue', () => {
    const missingX = run('layout [ position: , 2 ]');
    expect(missingX.diagnostics).toEqual([
      { kind: 'conversion', message: 'Cannot convert empty string to a double value.', line: 1 },
    ]);
    expect((missingX.root as ElkNode).getY()).toBe(2);
    expect(run('layout [ position: 1, size: 3, 4 ]').diagnostics.map((d) => d.kind)).toEqual(['conversion']);
    expect(run('layout [ position: node ]').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
  });

  it('reports a conversion error on the line where the empty number would stand', () => {
    const result = run('node a\nnode b\nedge a -> b { layout [ bends: 1,\n ] }');
    expect(result.diagnostics).toEqual([
      { kind: 'conversion', message: 'Cannot convert empty string to a double value.', line: 3 },
    ]);
  });
});

describe('ElkGraphParser: positions and reference nodes', () => {
  const text = [
    '// header',
    '',
    'graph g',
    'a.b: 1',
    'node n1 {',
    '  port p',
    '  label "x"',
    '}',
    'edge n1 . p -> n1 {',
    '  layout [ ]',
    '}',
    '',
  ].join('\n');
  const result = run(text);
  const top = result.root as ElkNode;
  const n1 = [...top.getChildren()][0] as ElkNode;
  const edge = [...top.getContainedEdges()][0] as ElkEdge;

  it('answers objectStartLine with the first non-hidden token of the production', () => {
    const p = result.positions;
    expect(p.objectStartLine(top)).toBe(3);
    expect(p.objectStartLine(n1)).toBe(5);
    expect(p.objectStartLine([...n1.getPorts()][0] as EObject)).toBe(6);
    expect(p.objectStartLine([...n1.getLabels()][0] as EObject)).toBe(7);
    expect(p.objectStartLine(edge)).toBe(9);
    expect(p.objectStartLine([...top.getProperties().entryList()][0] as EObject)).toBe(4);
  });

  it('places an empty single section at the end of the previous token and an empty root on line 1', () => {
    const section = [...edge.getSections()][0] as EObject;
    expect(result.positions.objectStartLine(section)).toBe(10);
    expect(run('').positions.objectStartLine(run('').root as EObject)).toBeNull();
    const empty = run('// c\n\n');
    expect(empty.positions.objectStartLine(empty.root as EObject)).toBe(1);
  });

  it('answers featureStartLines per assigned value in source order', () => {
    const p = result.positions;
    expect(p.featureStartLines(top, 'identifier')).toEqual([3]);
    expect(p.featureStartLines(top, 'children')).toEqual([5]);
    expect(p.featureStartLines(top, 'containedEdges')).toEqual([9]);
    expect(p.featureStartLines(edge, 'sources')).toEqual([9]);
    expect(p.featureStartLines(edge, 'targets')).toEqual([9]);
    expect(p.featureStartLines(edge, 'sections')).toEqual([10]);
    expect(p.featureStartLines(top, 'nothing')).toEqual([]);
  });

  it('answers containingSlot with the feature and the index', () => {
    const slot = result.positions.containingSlot([...top.getChildren()][0] as EObject);
    expect([slot.feature.getName(), slot.index]).toEqual(['children', 0]);
    const entrySlot = result.positions.containingSlot([...top.getProperties().entryList()][0] as EObject);
    expect([entrySlot.feature.getName(), entrySlot.index]).toEqual(['properties', 0]);
    expect(slot.feature).toBe(result.positions.containingSlot(n1).feature);
    expect(() => result.positions.containingSlot(top)).toThrow('was not contained');
  });

  it('records references in source order with the token text of the cross reference node', () => {
    const refs = result.nodeModel.getCrossReferenceNodes(edge) ?? [];
    expect(refs.map((r) => [r.getText(), r.getStartLine(), r.feature, r.index, r.ruleName])).toEqual([
      ['n1 . p', 9, 'sources', 0, 'QualifiedId'],
      ['n1', 9, 'targets', 0, 'QualifiedId'],
    ]);
    expect(refs.every((r) => r.getSemanticElement() === edge)).toBe(true);
    expect(result.references).toHaveLength(2);
  });

  it('returns an empty list for a parsed object without references and null for a foreign object', () => {
    expect(result.nodeModel.getCrossReferenceNodes(n1)).toEqual([]);
    expect(result.nodeModel.getCrossReferenceNodes(run('node a').root as EObject)).toBeNull();
    expect(result.positions.objectStartLine(run('node a').root as EObject)).toBeNull();
  });

  it('records single-valued section references with index -1 in source order', () => {
    const r = run('edge a -> b { layout [ outgoing: q.r incoming: /*c*/ p ] }');
    expect(r.references.map((x) => [x.text, x.feature, x.index])).toEqual([
      ['a', 'sources', 0],
      ['b', 'targets', 0],
      ['q.r', 'outgoingShape', -1],
      ['p', 'incomingShape', -1],
    ]);
  });
});
