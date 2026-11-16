// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { expectSameElements } from '../../../../../test/helpers/junit-asserts.js';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

describe('SelfLoopHolder', () => {
  it('needsSelfLoopProcessing is false for a node without self loops and for a non-normal node', () => {
    const plain = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
    expect(SelfLoopHolder.needsSelfLoopProcessing(plain.getLayerlessNodes()[1]!)).toBe(false);

    const looped = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();
    const lNode = looped.getLayerlessNodes()[1]!;
    expect(SelfLoopHolder.needsSelfLoopProcessing(lNode)).toBe(true);
    lNode.setType(NodeType.LONG_EDGE);
    expect(SelfLoopHolder.needsSelfLoopProcessing(lNode)).toBe(false);
  });

  it('install sets the property and exposes the node, ports and hyper loops', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();
    const lNode = lGraph.getLayerlessNodes()[1]!;
    const holder = SelfLoopHolder.install(lNode);
    expect(holder.getLNode()).toBe(lNode);
    expect(lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER)).toBe(holder);
    // the port map is in the order the loops reach their ports: source then target of each loop
    const mapped = [...holder.getSLPortMap().keys()];
    expectSameElements(mapped, lNode.getPorts());
    const loops = holder.getSLHyperLoops();
    expect(loops).toHaveLength(4);
    for (const [i, loop] of loops.entries()) {
      expectSameElements(
        loop.getSLPorts().map((p) => p.getLPort()),
        [lNode.getPorts()[2 * i]!, lNode.getPorts()[2 * i + 1]!],
      );
    }
  });

  it('merges loops that share a port into one hyper loop, in breadth-first order', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
    const lNode = lGraph.getLayerlessNodes()[1]!;
    SelfLoopTestGraphCreator.ports(lNode, 2, 1, 0, 0);
    const [, a, b, c] = lNode.getPorts() as [never, never, never, never, never];
    const ab = SelfLoopTestGraphCreator.edge(a, b);
    const cb = SelfLoopTestGraphCreator.edge(c, b);
    const holder = SelfLoopHolder.install(lNode);
    expect(holder.getSLHyperLoops()).toHaveLength(1);
    const loop = holder.getSLHyperLoops()[0]!;
    expectSameElements(
      [...loop.getSLEdges()].map((e) => e.getLEdge()),
      [ab, cb],
    );
    expectSameElements(
      loop.getSLPorts().map((p) => p.getLPort()),
      [a, b, c],
    );
  });

  it('keeps the hidden flag and the routing slot counts', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();
    const holder = SelfLoopHolder.install(lGraph.getLayerlessNodes()[1]!);
    expect(holder.arePortsHidden()).toBe(false);
    holder.setPortsHidden(true);
    expect(holder.arePortsHidden()).toBe(true);
    const counts = holder.getRoutingSlotCount();
    expect(counts).toHaveLength(PortSide.values().length);
    expect(counts.every((n) => n === 0)).toBe(true);
    expect(holder.getSLPortMap()).toBe(holder.getSLPortMap());
  });
});
