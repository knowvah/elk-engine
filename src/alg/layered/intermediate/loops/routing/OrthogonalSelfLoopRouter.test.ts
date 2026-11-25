// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { assertionErrorOf } from '../../../../../../test/helpers/assertion-error-of.js';
import { SelfLoopTestGraphCreator as Creator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { withAssertions } from '../../../../../../test/helpers/with-assertions.js';
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { LGraph } from '../../../graph/LGraph.js';
import { LLabel } from '../../../graph/LLabel.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfHyperLoopLabels } from '../SelfHyperLoopLabels.js';
import type { SelfLoopEdge } from '../SelfLoopEdge.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { OrthogonalSelfLoopRouter } from './OrthogonalSelfLoopRouter.js';
import { computeBaselinePosition } from './OrthogonalSelfLoopRouterSlotPositions.js';

/**
 * The `default` arms of `OrthogonalSelfLoopRouter.java` that only `assert false` (`:180`, `:304-305`, `:367`,
 * `:441-442`; issue #115). No valid graph reaches them, so each test hands a private method a side outside the four.
 * Every expected value is the Java statement after the `assert false`, as a JVM without `-ea` runs it, and the second
 * test of each pair pins the `AssertionError` of a JVM under `-ea`.
 */

/** The private methods of the Java class that hold the arms; Java tests would reach them by reflection. */
interface RouterArms {
  placeLabels(
    slLoop: SelfHyperLoop,
    slLabels: SelfHyperLoopLabels,
    routingSlotPositions: number[][],
    edgeLabelDistance: number,
  ): void;
  addOuterBendPoint(
    slEdge: SelfLoopEdge,
    slPort: SelfLoopPort,
    routingSlotPositions: number[][],
    bendPoints: KVectorChain,
  ): void;
  getBaseVector(portSide: PortSide, routingSlot: number, routingSlotPositions: number[][]): KVector | null;
}

/** The position of the one routing slot of the `UNDEFINED` row below. */
const UNDEFINED_SLOT_POSITION = 7;
/**
 * Routing slot positions by port side ordinal whose `UNDEFINED` row has an entry: the Java reads
 * `routingSlotPositions[side.ordinal()][slot]` before its `switch` (`:145`, `:429`), and with an empty row a JVM throws
 * `ArrayIndexOutOfBoundsException` there instead of reaching the arm.
 */
const rows = (): number[][] => [[UNDEFINED_SLOT_POSITION], [], [], [], []];

const EDGE_LABEL_DISTANCE = 2;
const NODE_SELF_LOOP_DISTANCE = 5;
const LABEL_X = 3;
const LABEL_Y = 4;

function arms(router: OrthogonalSelfLoopRouter = new OrthogonalSelfLoopRouter()): RouterArms {
  return router as unknown as RouterArms;
}

/** A holder with one loop between two east ports; with `labelled`, its edge has a label. */
function eastLoopHolder(labelled = false): SelfLoopHolder {
  const lNode = Creator.node(new LGraph());
  Creator.ports(lNode, 0, 2, 0, 0);
  const lEdge = Creator.edge(lNode.getPorts()[0]!, lNode.getPorts()[1]!);
  if (labelled) {
    lEdge.getLabels().push(new LLabel('x'));
  }
  return SelfLoopHolder.install(lNode);
}

/** The loop of `eastLoopHolder` with labels whose side is outside the four, at a known position. */
function loopWithUndefinedLabelSide(): { slLoop: SelfHyperLoop; slLabels: SelfHyperLoopLabels } {
  const slLoop = eastLoopHolder(true).getSLHyperLoops()[0]!;
  const slLabels = slLoop.getSLLabels()!;
  slLabels.setSide(PortSide.UNDEFINED);
  slLabels.getPosition().set(LABEL_X, LABEL_Y);
  return { slLoop, slLabels };
}

/** The edge of `eastLoopHolder` and its source port, whose side is set outside the four. */
function edgeWithUndefinedSourceSide(): { slEdge: SelfLoopEdge; slPort: SelfLoopPort } {
  const slEdge = [...eastLoopHolder().getSLHyperLoops()[0]!.getSLEdges()][0]!;
  const slPort = slEdge.getSLSource();
  slPort.getLPort().setSide(PortSide.UNDEFINED);
  return { slEdge, slPort };
}

describe('OrthogonalSelfLoopRouter: the default arm of placeLabels (Java :180)', () => {
  it('leaves the label position as it is, as a JVM without -ea falls out of the switch', () => {
    const { slLoop, slLabels } = loopWithUndefinedLabelSide();

    withAssertions(false, () => arms().placeLabels(slLoop, slLabels, rows(), EDGE_LABEL_DISTANCE));

    expect(slLabels.getPosition().x).toBe(LABEL_X);
    expect(slLabels.getPosition().y).toBe(LABEL_Y);
  });

  it('throws the AssertionError of a JVM under -ea, the label position untouched', () => {
    const { slLoop, slLabels } = loopWithUndefinedLabelSide();

    const error = assertionErrorOf(() => arms().placeLabels(slLoop, slLabels, rows(), EDGE_LABEL_DISTANCE));

    expect(error.message).toBe('');
    expect(slLabels.getPosition().x).toBe(LABEL_X);
    expect(slLabels.getPosition().y).toBe(LABEL_Y);
  });

  it('fails on a label side that was never set before the switch, as the Java NullPointerException (:145)', () => {
    const { slLoop, slLabels } = loopWithUndefinedLabelSide();
    slLabels.setSide(null);

    expect(() =>
      withAssertions(false, () => arms().placeLabels(slLoop, slLabels, rows(), EDGE_LABEL_DISTANCE)),
    ).toThrow(TypeError);
  });
});

describe('OrthogonalSelfLoopRouter: the default arm of computeBaselinePosition (Java :304-305)', () => {
  it('returns -1, as a JVM without -ea does', () => {
    const slHolder = eastLoopHolder();

    expect(
      withAssertions(false, () => computeBaselinePosition(slHolder, PortSide.UNDEFINED, NODE_SELF_LOOP_DISTANCE)),
    ).toBe(-1);
  });

  it('throws the AssertionError of a JVM under -ea', () => {
    const slHolder = eastLoopHolder();

    expect(
      assertionErrorOf(() => computeBaselinePosition(slHolder, PortSide.UNDEFINED, NODE_SELF_LOOP_DISTANCE)).message,
    ).toBe('');
  });
});

describe('OrthogonalSelfLoopRouter: the default arm of getBaseVector (Java :441-442)', () => {
  it('returns null, as a JVM without -ea does', () => {
    expect(withAssertions(false, () => arms().getBaseVector(PortSide.UNDEFINED, 0, rows()))).toBeNull();
  });

  it('throws the AssertionError of a JVM under -ea', () => {
    expect(assertionErrorOf(() => arms().getBaseVector(PortSide.UNDEFINED, 0, rows())).message).toBe('');
  });
});

describe('OrthogonalSelfLoopRouter: the default arm of addOuterBendPoint (Java :367)', () => {
  it('appends the null of getBaseVector, as a JVM without -ea adds the result after the switch (:370)', () => {
    const { slEdge, slPort } = edgeWithUndefinedSourceSide();
    const bendPoints = new KVectorChain();

    withAssertions(false, () => arms().addOuterBendPoint(slEdge, slPort, rows(), bendPoints));

    expect(bendPoints.size()).toBe(1);
    expect(bendPoints.getFirst()).toBeNull();
  });

  it('appends a base vector unchanged: the arm adds no anchor coordinate', () => {
    const { slEdge, slPort } = edgeWithUndefinedSourceSide();
    slPort.getLPort().getPosition().set(11, 13);
    const router = new OrthogonalSelfLoopRouter();
    const base = new KVector(1, 2);
    vi.spyOn(arms(router), 'getBaseVector').mockReturnValue(base);
    const bendPoints = new KVectorChain();

    withAssertions(false, () => arms(router).addOuterBendPoint(slEdge, slPort, rows(), bendPoints));

    expect(bendPoints.size()).toBe(1);
    expect(bendPoints.getFirst()).toBe(base);
    expect([base.x, base.y]).toEqual([1, 2]);
  });

  it('throws the AssertionError of a JVM under -ea in the arm itself and adds nothing', () => {
    const { slEdge, slPort } = edgeWithUndefinedSourceSide();
    const router = new OrthogonalSelfLoopRouter();
    vi.spyOn(arms(router), 'getBaseVector').mockReturnValue(new KVector(1, 2));
    const bendPoints = new KVectorChain();

    const error = assertionErrorOf(() => arms(router).addOuterBendPoint(slEdge, slPort, rows(), bendPoints));

    expect(error.message).toBe('');
    expect(bendPoints.size()).toBe(0);
  });

  it('throws the AssertionError of getBaseVector first under -ea and adds nothing', () => {
    const { slEdge, slPort } = edgeWithUndefinedSourceSide();
    const bendPoints = new KVectorChain();

    const error = assertionErrorOf(() => arms().addOuterBendPoint(slEdge, slPort, rows(), bendPoints));

    expect(error.message).toBe('');
    expect(bendPoints.size()).toBe(0);
  });
});
