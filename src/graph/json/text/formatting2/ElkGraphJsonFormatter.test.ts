// SPDX-License-Identifier: EPL-2.0
// ElkGraphJsonFormatter: the byte-exact replay of the recorded writer rows lives in
// src/graph/json/text/ElkGraphJsonText.serialize.test.ts; this file covers the dispatch and the layout rules by
// graph shape.
import { describe, expect, it } from 'vitest';
import '../../../impl/ElkGraphFactoryImpl.js';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';
import { ExceptionAcceptor } from '../../../../xtext/formatting2/ExceptionAcceptor.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphJsonFormatter } from './ElkGraphJsonFormatter.js';
import { writeFormatted } from './ElkGraphJsonWriter.js';

function graph(): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('g');
  return root;
}

const write = (root: ElkNode): string => writeFormatted(root, ExceptionAcceptor.THROWING);

describe('ElkGraphJsonFormatter layout', () => {
  it('writes a node without children, ports, labels or properties on one line', () => {
    expect(write(graph())).toBe('{ "id": "g" }');
  });

  it('breaks and indents a node with a child, the child compact', () => {
    const root = graph();
    ElkGraphUtil.createNode(root).setIdentifier('a');
    expect(write(root)).toBe('{\n\t"id": "g",\n\t"children": [\n\t\t{ "id": "a" }\n\t]\n}');
  });
});

describe('ElkGraphJsonFormatter.format dispatch', () => {
  const never = {
    format: (): never => {
      throw new Error('must not format');
    },
  };

  it('formats the first content of a resource', () => {
    const formatted: unknown[] = [];
    const first = {};
    new ElkGraphJsonFormatter().format({ getContents: () => [first, {}] }, {
      format: (o: unknown) => formatted.push(o),
    } as never);
    expect(formatted).toEqual([first]);
  });

  it('formats the contents of any other EObject through the base class default', () => {
    const formatted: unknown[] = [];
    const child = {};
    new ElkGraphJsonFormatter().format({ eContents: () => [child] }, {
      format: (o: unknown) => formatted.push(o),
    } as never);
    expect(formatted).toEqual([child]);
  });

  it('does nothing for an object that is neither a graph element, a resource nor an EObject', () => {
    expect(new ElkGraphJsonFormatter().format(42, never as never)).toBeUndefined();
  });
});
