// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { assertionErrorOf } from '../../../../../../test/helpers/assertion-error-of.js';
import { SelfLoopTestGraphCreator as Creator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { withAssertions } from '../../../../../../test/helpers/with-assertions.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { NoSuchElementException } from '../../../../../java/util/NoSuchElementException.js';
import { LGraph } from '../../../graph/LGraph.js';
import type { LNode } from '../../../graph/LNode.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import { SelfLoopType } from '../SelfLoopType.js';
import { RoutingDirector } from './RoutingDirector.js';

/** Installs the holder of the node, determines the port sides of every loop and runs the director. */
function route(node: LNode): SelfLoopHolder {
  const slHolder = SelfLoopHolder.install(node);
  for (const slLoop of slHolder.getSLHyperLoops()) {
    slLoop.computePortsPerSide();
  }
  new RoutingDirector().determineLoopRoutes(slHolder);
  return slHolder;
}

function newNode(north: number, east: number, south: number, west: number): LNode {
  const node = Creator.node(new LGraph());
  Creator.ports(node, north, east, south, west);
  return node;
}

function sidesOf(slLoop: SelfHyperLoop): EnumSet<PortSide> {
  return slLoop.getOccupiedPortSides();
}

describe('RoutingDirector', () => {
  it('routes a one-sided loop between its lowest and highest port on that side', () => {
    const node = newNode(0, 3, 0, 0);
    const ports = node.getPorts();
    Creator.edge(ports[2]!, ports[0]!);
    Creator.edge(ports[0]!, ports[1]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getSelfLoopType()).toBe(SelfLoopType.ONE_SIDE);
    expect(loop.getLeftmostPort()!.getLPort()).toBe(ports[0]);
    expect(loop.getRightmostPort()!.getLPort()).toBe(ports[2]);
    expect(sidesOf(loop).equals(EnumSet.of(PortSide.EAST))).toBe(true);
    expect(loop.getSLPorts().map((slPort) => slPort.getLPort().id)).toEqual([0, 1, 2]);
  });

  it('routes a corner loop from the first to the second side in clockwise order', () => {
    const node = newNode(1, 1, 0, 0);
    Creator.edge(node.getPorts()[1]!, node.getPorts()[0]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getSelfLoopType()).toBe(SelfLoopType.TWO_SIDES_CORNER);
    expect(loop.getLeftmostPort()!.getLPort().getSide()).toBe(PortSide.NORTH);
    expect(loop.getRightmostPort()!.getLPort().getSide()).toBe(PortSide.EAST);
    expect(sidesOf(loop).equals(EnumSet.of(PortSide.NORTH, PortSide.EAST))).toBe(true);
  });

  it('routes a corner loop spanning the west-north corner from west to north', () => {
    const node = newNode(1, 0, 0, 1);
    Creator.edge(node.getPorts()[0]!, node.getPorts()[1]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getLeftmostPort()!.getLPort().getSide()).toBe(PortSide.WEST);
    expect(loop.getRightmostPort()!.getLPort().getSide()).toBe(PortSide.NORTH);
    expect(sidesOf(loop).equals(EnumSet.of(PortSide.WEST, PortSide.NORTH))).toBe(true);
  });

  it('chooses the opposing route with the lower penalty', () => {
    // Ports by ID: N0, E1, E2, S3, W4. The north-south loop passes either the two connected east ports or the
    // unconnected west port; the other loop connects the east ports.
    const node = newNode(1, 2, 1, 1);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[3]!);
    Creator.edge(ports[1]!, ports[2]!);
    const loops = route(node).getSLHyperLoops();
    const opposing = loops.find((slLoop) => slLoop.getSelfLoopType() === SelfLoopType.TWO_SIDES_OPPOSING)!;

    expect(opposing.getLeftmostPort()!.getLPort()).toBe(ports[3]);
    expect(opposing.getRightmostPort()!.getLPort()).toBe(ports[0]);
    expect(sidesOf(opposing).equals(EnumSet.of(PortSide.SOUTH, PortSide.WEST, PortSide.NORTH))).toBe(true);
  });

  it('routes a three-sided loop around the missing side', () => {
    // Missing WEST: from the north port clockwise to the south port.
    const node = newNode(1, 1, 1, 0);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[1]!);
    Creator.edge(ports[1]!, ports[2]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getSelfLoopType()).toBe(SelfLoopType.THREE_SIDES);
    expect(loop.getLeftmostPort()!.getLPort()).toBe(ports[0]);
    expect(loop.getRightmostPort()!.getLPort()).toBe(ports[2]);
    expect(sidesOf(loop).equals(EnumSet.of(PortSide.NORTH, PortSide.EAST, PortSide.SOUTH))).toBe(true);
  });

  it.each([
    [PortSide.NORTH, [0, 1, 1, 1], PortSide.EAST, PortSide.WEST],
    [PortSide.EAST, [1, 0, 1, 1], PortSide.SOUTH, PortSide.NORTH],
    [PortSide.SOUTH, [1, 1, 0, 1], PortSide.WEST, PortSide.EAST],
  ] as const)('routes a three-sided loop missing %s', (_missing, counts, leftmostSide, rightmostSide) => {
    const node = newNode(counts[0], counts[1], counts[2], counts[3]);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[1]!);
    Creator.edge(ports[1]!, ports[2]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getLeftmostPort()!.getLPort().getSide()).toBe(leftmostSide);
    expect(loop.getRightmostPort()!.getLPort().getSide()).toBe(rightmostSide);
  });

  it('splits a four-sided loop at the adjacent pair of ports with the highest penalty', () => {
    // Ports by ID: N0, E1, E2, E3, S4, W5; the loop uses N0, E1, S4, W5, the two unconnected ports lie between E1
    // and S4, so that gap is the one the loop must not span.
    const node = newNode(1, 3, 1, 1);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[1]!);
    Creator.edge(ports[1]!, ports[4]!);
    Creator.edge(ports[4]!, ports[5]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getSelfLoopType()).toBe(SelfLoopType.FOUR_SIDES);
    expect(loop.getLeftmostPort()!.getLPort()).toBe(ports[4]);
    expect(loop.getRightmostPort()!.getLPort()).toBe(ports[1]);
    expect(sidesOf(loop).size()).toBe(4);
  });

  it('keeps the loop that closes at the wrap-around when no gap has a higher penalty', () => {
    const node = newNode(1, 1, 1, 1);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[1]!);
    Creator.edge(ports[1]!, ports[2]!);
    Creator.edge(ports[2]!, ports[3]!);
    const loop = route(node).getSLHyperLoops()[0]!;

    expect(loop.getLeftmostPort()!.getLPort()).toBe(ports[0]);
    expect(loop.getRightmostPort()!.getLPort()).toBe(ports[3]);
  });

  it('throws a TypeError for a loop whose type was not determined', () => {
    const node = newNode(0, 2, 0, 0);
    Creator.edge(node.getPorts()[0]!, node.getPorts()[1]!);
    const slHolder = SelfLoopHolder.install(node);

    expect(() => new RoutingDirector().determineLoopRoutes(slHolder)).toThrow(
      new TypeError('The self loop type of a hyper loop must be determined before routing.'),
    );
  });

  it('numbers the node ports in list order', () => {
    const node = newNode(1, 1, 1, 1);
    Creator.edge(node.getPorts()[1]!, node.getPorts()[3]!);
    route(node);

    expect(node.getPorts().map((port) => port.id)).toEqual([0, 1, 2, 3]);
  });
});

/** The private methods of the Java class around its two `assert false` arms; Java tests would use reflection. */
interface DirectorArms {
  determineThreeSideLoopRoutes(slLoop: SelfHyperLoop): void;
  computeMissingPortSide(slLoop: SelfHyperLoop): PortSide | null;
  assignLeftmostRightmostPorts(
    slLoop: SelfHyperLoop,
    leftmostSide: PortSide | null,
    rightmostSide: PortSide | null,
  ): void;
}

function arms(director: RoutingDirector): DirectorArms {
  return director as unknown as DirectorArms;
}

/**
 * A loop with ports on all four sides, its ports per side computed: no side is missing. The dispatch of
 * `determineLoopRoutes` never hands such a loop to the three-sided methods, so the tests below call them directly.
 */
function fourSidedLoop(): SelfHyperLoop {
  const node = newNode(1, 1, 1, 1);
  const ports = node.getPorts();
  Creator.edge(ports[0]!, ports[1]!);
  Creator.edge(ports[1]!, ports[2]!);
  Creator.edge(ports[2]!, ports[3]!);
  const slLoop = SelfLoopHolder.install(node).getSLHyperLoops()[0]!;
  slLoop.computePortsPerSide();
  return slLoop;
}

/**
 * The two `assert false` arms of `RoutingDirector.java` that no valid graph reaches (`:207`, `:227-228`; issue #115).
 * Every expected value is what the Java does after the `assert false` on a JVM without `-ea`; the second test of each
 * pair pins the `AssertionError` of a JVM under `-ea`.
 */
describe('RoutingDirector: no side is missing (Java computeMissingPortSide, :227-228)', () => {
  it('returns null, as a JVM without -ea does', () => {
    const slLoop = fourSidedLoop();

    expect(withAssertions(false, () => arms(new RoutingDirector()).computeMissingPortSide(slLoop))).toBeNull();
  });

  it('throws the AssertionError of a JVM under -ea', () => {
    const slLoop = fourSidedLoop();

    expect(assertionErrorOf(() => arms(new RoutingDirector()).computeMissingPortSide(slLoop)).message).toBe('');
  });

  it('is a TypeError at the switch of determineThreeSideLoopRoutes, before any arm, as the Java NPE (:185)', () => {
    const slLoop = fourSidedLoop();
    const director = new RoutingDirector();
    const assign = vi.spyOn(arms(director), 'assignLeftmostRightmostPorts');

    expect(() => withAssertions(false, () => arms(director).determineThreeSideLoopRoutes(slLoop))).toThrow(TypeError);

    expect(assign).not.toHaveBeenCalled();
    expect(slLoop.getLeftmostPort()).toBeNull();
    expect(slLoop.getRightmostPort()).toBeNull();
  });

  it('is the AssertionError of computeMissingPortSide under -ea, before the switch', () => {
    const slLoop = fourSidedLoop();
    const director = new RoutingDirector();
    const assign = vi.spyOn(arms(director), 'assignLeftmostRightmostPorts');

    expect(assertionErrorOf(() => arms(director).determineThreeSideLoopRoutes(slLoop)).message).toBe('');
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('RoutingDirector: the default arm of determineThreeSideLoopRoutes (Java :207)', () => {
  /** A director whose `computeMissingPortSide` returns the one non-null side outside the four arms. */
  function directorMissingUndefined(): { director: RoutingDirector; assign: ReturnType<typeof vi.spyOn> } {
    const director = new RoutingDirector();
    vi.spyOn(arms(director), 'computeMissingPortSide').mockReturnValue(PortSide.UNDEFINED);
    return { director, assign: vi.spyOn(arms(director), 'assignLeftmostRightmostPorts') };
  }

  it('goes on with both sides null, as a JVM without -ea does: no port is on a null side (:210, :288)', () => {
    const slLoop = fourSidedLoop();
    const { director, assign } = directorMissingUndefined();

    expect(() => withAssertions(false, () => arms(director).determineThreeSideLoopRoutes(slLoop))).toThrow(
      new NoSuchElementException('No value present'),
    );

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(slLoop, null, null);
    expect(slLoop.getLeftmostPort()).toBeNull();
    expect(slLoop.getRightmostPort()).toBeNull();
  });

  it('throws the AssertionError of a JVM under -ea and assigns nothing', () => {
    const slLoop = fourSidedLoop();
    const { director, assign } = directorMissingUndefined();

    expect(assertionErrorOf(() => arms(director).determineThreeSideLoopRoutes(slLoop)).message).toBe('');
    expect(assign).not.toHaveBeenCalled();
  });
});
