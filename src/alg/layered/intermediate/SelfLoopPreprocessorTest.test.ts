// SPDX-License-Identifier: EPL-2.0
/*
 * Port of SelfLoopPreprocessorTest (mission 7g, T14): five JUnit runs that call `SelfLoopPreProcessor.process` directly on
 * a hand-built graph (no layout test framework), so they run without the self-loop pipeline arms. Tests whether the
 * processor correctly hides ports and self loop edges. Java literals and assertions are unchanged.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/SelfLoopPreprocessorTest.java
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { SelfLoopPreProcessor } from './SelfLoopPreProcessor.js';

/** The Java's private static class `TestGraph`. */
class TestGraph {
  readonly testGraph: LGraph;
  readonly selfLoopNode: LNode;
  readonly regularPorts = new Set<LPort>();
  readonly onlySelfLoopPorts = new Set<LPort>();
  readonly unconnectedPorts = new Set<LPort>();

  constructor(portConstraints: PortConstraints) {
    this.testGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();

    this.selfLoopNode = this.testGraph.getLayerlessNodes()[1]!;
    this.selfLoopNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, portConstraints);
    this.selfLoopNode.getSize().set(50, 50);

    this.addPorts();
    this.addEdges();
  }

  private addPorts(): void {
    SelfLoopTestGraphCreator.ports(this.selfLoopNode, 2, 2, 2, 1);

    // The ports need proper coordinates (the first will be placed at 10, the second at 40)
    let north = 10;
    let east = 10;
    let south = 10;
    let west = 10;
    for (const lPort of this.selfLoopNode.getPorts()) {
      switch (lPort.getSide()) {
        case PortSide.NORTH:
          lPort.getPosition().set(north, 0);
          north += 30;
          break;

        case PortSide.EAST:
          lPort.getPosition().set(this.selfLoopNode.getSize().x, east);
          east += 30;
          break;

        case PortSide.SOUTH:
          lPort.getPosition().set(south, this.selfLoopNode.getSize().y);
          south += 30;
          break;

        case PortSide.WEST:
          lPort.getPosition().set(0, west);
          west += 30;
          break;

        default:
          expect.fail();
      }
    }
  }

  private addEdges(): void {
    const ports = this.selfLoopNode.getPorts();

    SelfLoopTestGraphCreator.edge(ports[0]!, ports[1]!);
    SelfLoopTestGraphCreator.edge(ports[1]!, ports[2]!);
    SelfLoopTestGraphCreator.edge(ports[3]!, ports[4]!);
    SelfLoopTestGraphCreator.edge(ports[4]!, ports[5]!);

    this.regularPorts.add(ports[0]!);

    this.onlySelfLoopPorts.add(ports[1]!);
    this.onlySelfLoopPorts.add(ports[2]!);
    this.onlySelfLoopPorts.add(ports[3]!);
    this.onlySelfLoopPorts.add(ports[4]!);
    this.onlySelfLoopPorts.add(ports[5]!);

    this.unconnectedPorts.add(ports[6]!);
    this.unconnectedPorts.add(ports[7]!);
  }
}

function testHiddenEdges(testGraph: TestGraph): void {
  // Not a single self loop edge should be left
  for (const lEdge of testGraph.selfLoopNode.getConnectedEdges()) {
    expect(lEdge.isSelfLoop()).toBe(false);
  }

  // A regular edge should be left
  expect(testGraph.selfLoopNode.getConnectedEdges()[Symbol.iterator]().next().done).toBe(false);
}

describe('SelfLoopPreprocessorTest', () => {
  let slPreprocessor: SelfLoopPreProcessor;

  beforeEach(() => {
    slPreprocessor = new SelfLoopPreProcessor();
  });

  function testPortsHidden(portConstraints: PortConstraints): void {
    const testGraph = new TestGraph(portConstraints);
    slPreprocessor.process(testGraph.testGraph, new NullElkProgressMonitor());

    // Only the regular and unconnected ports should be left
    expect(testGraph.selfLoopNode.getPorts().length).toBe(
      testGraph.regularPorts.size + testGraph.unconnectedPorts.size,
    );

    const ports = testGraph.selfLoopNode.getPorts();
    expect([...testGraph.regularPorts].every((port) => ports.includes(port))).toBe(true);
    expect([...testGraph.unconnectedPorts].every((port) => ports.includes(port))).toBe(true);

    testHiddenEdges(testGraph);
  }

  function testPortsUntouched(portConstraints: PortConstraints): void {
    const testGraph = new TestGraph(portConstraints);
    slPreprocessor.process(testGraph.testGraph, new NullElkProgressMonitor());

    // All ports should be left
    expect(testGraph.selfLoopNode.getPorts().length).toBe(
      testGraph.regularPorts.size + testGraph.onlySelfLoopPorts.size + testGraph.unconnectedPorts.size,
    );

    testHiddenEdges(testGraph);
  }

  it('testFreePorts', () => {
    testPortsHidden(PortConstraints.FREE);
  });

  it('testFixedSide', () => {
    testPortsHidden(PortConstraints.FIXED_SIDE);
  });

  it('testFixedOrder', () => {
    testPortsUntouched(PortConstraints.FIXED_ORDER);
  });

  it('testFixedRatio', () => {
    testPortsUntouched(PortConstraints.FIXED_RATIO);
  });

  it('testFixedPos', () => {
    testPortsUntouched(PortConstraints.FIXED_POS);
  });
});
