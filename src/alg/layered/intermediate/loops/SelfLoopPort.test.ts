// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

describe('SelfLoopPort', () => {
  it('hadOnlySelfLoops is false when a regular edge is incident', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
    const lNode = lGraph.getLayerlessNodes()[1]!;
    SelfLoopTestGraphCreator.ports(lNode, 1, 0, 0, 0);
    const regular = lNode.getPorts()[0]!;
    const north = lNode.getPorts()[1]!;
    SelfLoopTestGraphCreator.edge(regular, north);
    const holder = SelfLoopHolder.install(lNode);
    expect(holder.getSLPortMap().get(regular)!.hadOnlySelfLoops()).toBe(false);
    expect(holder.getSLPortMap().get(north)!.hadOnlySelfLoops()).toBe(true);
  });

  it('setHidden is read back by isHidden', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();
    const holder = SelfLoopHolder.install(lGraph.getLayerlessNodes()[1]!);
    const slPort = [...holder.getSLPortMap().values()][0]!;
    slPort.setHidden(true);
    expect(slPort.isHidden()).toBe(true);
    slPort.setHidden(false);
    expect(slPort.isHidden()).toBe(false);
  });

  it('getSLNetFlow is incoming minus outgoing self loop edges', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();
    const holder = SelfLoopHolder.install(lGraph.getLayerlessNodes()[1]!);
    for (const slPort of holder.getSLPortMap().values()) {
      expect(slPort.getSLNetFlow()).toBe(slPort.getIncomingSLEdges().length - slPort.getOutgoingSLEdges().length);
    }
    const ports = [...holder.getSLPortMap().values()];
    // basicGraphWithSelfLoops joins pairs: the first port of a pair is the source, the second the target
    expect(ports[0]!.getSLNetFlow()).toBe(-1);
    expect(ports[1]!.getSLNetFlow()).toBe(1);
  });
});
