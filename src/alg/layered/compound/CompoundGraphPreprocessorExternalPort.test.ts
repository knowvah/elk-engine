// SPDX-License-Identifier: EPL-2.0
// The structure of `CompoundGraphPreprocessor.ExternalPort` (Java `:1005-1046`): the constructor adds the original edge
// to a list of its own and stores the other five arguments as given. Every value asserted is an argument passed in.
import { describe, expect, it } from 'vitest';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { PortType } from '../options/PortType.js';
import { ExternalPort, type ExternalPortArgs } from './CompoundGraphPreprocessorExternalPort.js';

function argsOf(portType: PortType, exported: boolean): ExternalPortArgs {
  return {
    origEdge: new LEdge(),
    newEdge: new LEdge(),
    dummyNode: new LNode(new LGraph()),
    dummyPort: new LPort(),
    portType,
    exported,
  };
}

describe('CompoundGraphPreprocessor.ExternalPort', () => {
  it('stores the constructor arguments, the original edge as the only element of origEdges', () => {
    const args = argsOf(PortType.INPUT, false);
    const port = new ExternalPort(args);
    expect(port.origEdges).toHaveLength(1);
    expect(port.origEdges[0]).toBe(args.origEdge);
    expect(port.newEdge).toBe(args.newEdge);
    expect(port.dummyNode).toBe(args.dummyNode);
    expect(port.dummyPort).toBe(args.dummyPort);
    expect(port.type).toBe(PortType.INPUT);
    expect(port.exported).toBe(false);
  });

  it('gives every instance its own origEdges list', () => {
    const first = new ExternalPort(argsOf(PortType.OUTPUT, true));
    const second = new ExternalPort(argsOf(PortType.OUTPUT, true));
    first.origEdges.push(second.origEdges[0]!);
    expect(second.origEdges).toHaveLength(1);
    expect(first.origEdges).toHaveLength(2);
    expect(first.type).toBe(PortType.OUTPUT);
    expect(first.exported).toBe(true);
  });
});
