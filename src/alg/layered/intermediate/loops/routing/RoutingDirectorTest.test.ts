// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { ArrayListMultimap } from '../../../../../guava/ArrayListMultimap.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { identity } from '../../../../../java/util/HashStrategy.js';
import type { HashStrategy } from '../../../../../java/util/HashStrategy.js';
import { LGraph } from '../../../graph/LGraph.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { RoutingDirector } from './RoutingDirector.js';

/** The key protocol of Java's `ArrayListMultimap.create()` keyed by identity-hashed `PortSide`s under `-XX:hashCode=2`. */
const INSERTION_ORDER_SIDES: HashStrategy<PortSide> = { hash: () => 1, equals: (a, b) => a === b };

/** Java reads the private field `slPortsBySide` by reflection (`Field.set`); the TS writes it through a typed cast. */
interface PortsBySideField {
  slPortsBySide: ArrayListMultimap<PortSide, SelfLoopPort>;
}

/** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/RoutingDirectorTest.java */
function setPortsBySide(slLoop: SelfHyperLoop, portsBySide: ArrayListMultimap<PortSide, SelfLoopPort>): void {
  (slLoop as unknown as PortsBySideField).slPortsBySide = portsBySide;
}

/**
 * Tests whether {@link RoutingDirector} determines opposing two-side self-loop routes independent of multimap key
 * iteration order.
 */
describe('RoutingDirectorTest', () => {
  it('testOpposingTwoSideLoopUsesDeterministicSideOrder', () => {
    const graph = new LGraph();
    const node = SelfLoopTestGraphCreator.node(graph);

    // Create one unconnected port on each side in the default clockwise order. This makes the penalties for the two
    // possible east-west loop routes equal, so the chosen route depends only on side ordering.
    SelfLoopTestGraphCreator.ports(node, 1, 1, 1, 1);

    const eastPort = node.getPorts()[1]!;
    const westPort = node.getPorts()[3]!;
    SelfLoopTestGraphCreator.edge(eastPort, westPort);

    const slHolder = SelfLoopHolder.install(node);
    const slLoop = slHolder.getSLHyperLoops()[0]!;
    slLoop.computePortsPerSide();

    // Simulate an arbitrary key-set iteration order opposite to the deterministic clockwise order.
    const reversedSides = ArrayListMultimap.create<PortSide, SelfLoopPort>(
      INSERTION_ORDER_SIDES,
      identity<SelfLoopPort>(),
    );
    reversedSides.putAll(PortSide.WEST, slLoop.getSLPortsBySide(PortSide.WEST));
    reversedSides.putAll(PortSide.EAST, slLoop.getSLPortsBySide(PortSide.EAST));
    setPortsBySide(slLoop, reversedSides);

    new RoutingDirector().determineLoopRoutes(slHolder);

    expect(slLoop.getLeftmostPort()!.getLPort()).toBe(eastPort);
    expect(slLoop.getRightmostPort()!.getLPort()).toBe(westPort);
    expect(slLoop.getOccupiedPortSides().equals(EnumSet.of(PortSide.EAST, PortSide.SOUTH, PortSide.WEST))).toBe(true);
  });
});
