// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LPort } from '../../graph/LPort.js';
import { NubSpline, type ControlPointList } from './NubSpline.js';
import { SplinesMath } from './SplinesMath.js';

/**
 * Fraction of the second/fourth control-point compared to the desired high. A bigger value will result in a "higher"
 * second/fourth control-point and a lower middle control-point.
 */
const FRACTION = 1.3;
/** To avoid magic number warning. */
const HALF = 0.5;

/**
 * Whether the second constructor argument is a list (`(dimension, List)`) rather than the first vector of
 * `(dimension, KVector...)`.
 */
function isListArg(second: ControlPointList | KVector | undefined): second is ControlPointList {
  return second !== undefined && !(second instanceof KVector);
}

/**
 * Updates the corner control point of `createCornerSelfLoop` for one port side: the Java `switch (…getSide())` of the
 * source (which runs first) and of the target (which runs second and may overwrite). The Java adds the two outer control
 * points in the order `firstCP + thirdCP` for the source and `thirdCP + firstCP` for the target; `cpSum` is that sum
 * (floating-point addition is commutative, so the bits agree). Extracted only to stay under the function-size limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:176
 */
function updateCorner(corner: KVector, side: PortSide, pos: KVector, height: number, cpSum: KVector): void {
  switch (side) {
    case PortSide.WEST:
      corner.x = 2 * (pos.x - height) - HALF * cpSum.x;
      break;
    case PortSide.EAST:
      corner.x = 2 * (pos.x + height) - HALF * cpSum.x;
      break;
    case PortSide.NORTH:
      corner.y = 2 * (pos.y - height) - HALF * cpSum.y;
      break;
    case PortSide.SOUTH:
      corner.y = 2 * (pos.y + height) - HALF * cpSum.y;
      break;
    default:
      break;
  }
}

/**
 * An extension of {@link NubSpline} for self-loops. Extends the parent class by methods for creation of self-loop
 * splines. Use the static create methods to obtain an instance to this class.
 *
 * The Java constructors `NubsSelfLoop(NubsSelfLoop)` and `NubsSelfLoop(int, KVector...)` are private; TypeScript cannot
 * make one overload private, so all four are public overloads. The factories pass the vectors as a list literal.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:26
 */
export class NubsSelfLoop extends NubSpline {
  /** The position of the first self-loop label. */
  private firstLabelPosition: KVector;

  // Constructors --------------------------------------------------------------------------------------------------

  /** A copy constructor. */
  constructor(nubs: NubsSelfLoop);
  /** Creates a new uniform and clamped NubsSelfLoop with the specified control points. Dimension must be > 0. */
  constructor(dimension: number, kVectors: ControlPointList);
  /** Creates a new uniform and clamped NubsSelfLoop with the specified control points. */
  constructor(dim: number, ...kVectors: KVector[]);
  /** Creates a new uniform NubsSelfLoop with the specified control points. Dimension must be > 0. */
  constructor(clamped: boolean, dimension: number, kVectors: ControlPointList);
  constructor(
    first: NubsSelfLoop | number | boolean,
    second?: number | ControlPointList | KVector,
    ...rest: (ControlPointList | KVector)[]
  ) {
    if (first instanceof NubsSelfLoop) {
      super(first);
    } else if (typeof first === 'boolean') {
      super(first, second as number, rest[0] as ControlPointList);
    } else if (isListArg(second as ControlPointList | KVector | undefined)) {
      super(true, first, second as ControlPointList);
    } else {
      super(true, first, ...(second === undefined ? [] : [second as KVector]), ...(rest as KVector[]));
    }
    this.firstLabelPosition = first instanceof NubsSelfLoop ? first.firstLabelPosition : new KVector();
  }

  // Accessors -----------------------------------------------------------------------------------------------------

  /**
   * Returns the first label's position. May be modified.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:88
   */
  getFirstLabelPosition(): KVector {
    return this.firstLabelPosition;
  }

  /**
   * Sets the label position.
   *
   * @param position The new position for the first label.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:97
   */
  setFirstLabelPosition(position: KVector): void {
    this.firstLabelPosition = position;
  }

  // Self Loop Builders --------------------------------------------------------------------------------------------

  /**
   * Generates a new NUBS representing a self loop at one of the straight sides of a node.
   *
   * @param source Source port this spline shall start at.
   * @param target Target port this spline shall end at.
   * @param length The estimated distance the spline shall go away from the side of the node.
   * @return A new NUBS representing the loop spline.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:127
   */
  static createSideSelfLoop(source: LPort, target: LPort, length: number): NubsSelfLoop {
    const direction = SplinesMath.portSideToDirection(source.getSide());
    const sourcePos = source.getPosition().clone().add(source.getAnchor());
    const targetPos = target.getPosition().clone().add(target.getAnchor());

    // calculate the three control points (next to source and target point)
    const firstCP = new KVector(sourcePos).add(KVector.fromAngle(direction).scale(length));
    const thirdCP = new KVector(targetPos).add(KVector.fromAngle(direction).scale(length));
    const mid = new KVector(firstCP).sub(thirdCP).scale(1.0 / 2.0);
    const secondCP = new KVector(thirdCP).add(mid).add(KVector.fromAngle(direction).scale(mid.length()));

    // calculate the spline
    const nubs = new NubsSelfLoop(NubSpline.DIM, [sourcePos, firstCP, secondCP, thirdCP, targetPos]);

    return nubs;
  }

  /**
   * Generates a new NUBS representing a self loop at the corner of a node.
   *
   * @param source The source port this spline shall start at.
   * @param target The target port this spline shall end at.
   * @param sourceHeight The estimated distance the spline shall go away from the source side.
   * @param targetHeight The estimated distance the spline shall go away from the target side.
   * @return A new NubSpline representing the loop spline.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:158
   */
  static createCornerSelfLoop(source: LPort, target: LPort, sourceHeight: number, targetHeight: number): NubsSelfLoop {
    // Radian direction of source and target.
    const sourceDir = SplinesMath.portSideToDirection(source.getSide());
    const targetDir = SplinesMath.portSideToDirection(target.getSide());

    // Position of source and target (port).
    const sourcePos = source.getPosition().clone().add(source.getAnchor());
    const targetPos = target.getPosition().clone().add(target.getAnchor());

    // first and last CP are simply located in a specified distance (sourceHeight/targetHeight)
    // and a specified direction (sourceDirection/targetDirection) from source/target.
    const firstCP = sourcePos.clone().add(KVector.fromAngle(sourceDir).scale(FRACTION * sourceHeight));
    const thirdCP = targetPos.clone().add(KVector.fromAngle(targetDir).scale(FRACTION * targetHeight));

    // second CP is located at a defined scale of the vector from corner to cpCorner
    const corner = new KVector(0.0, 0.0);
    const cpSum = firstCP.clone().add(thirdCP);

    updateCorner(corner, source.getSide(), sourcePos, sourceHeight, cpSum);
    updateCorner(corner, target.getSide(), targetPos, targetHeight, cpSum);

    const secondCP = new KVector(corner.x, corner.y);

    // Calculate the spline
    return new NubsSelfLoop(NubSpline.DIM, [sourcePos, firstCP, secondCP, thirdCP, targetPos]);
  }

  /**
   * Generates a new NUBS representing a self loop going from one node side to the opposite side. Basic bend points on
   * the way are already computed.
   *
   * @param source the source port.
   * @param target the target port.
   * @param sourceBendPoint first bend point from source to target.
   * @param cornerBendPoints bend points between the first and the last.
   * @param targetBendPoint last bend point from source to target.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:233
   */
  static createAcrossSelfLoop(
    source: LPort,
    target: LPort,
    sourceBendPoint: KVector,
    cornerBendPoints: readonly KVector[],
    targetBendPoint: KVector,
  ): NubsSelfLoop {
    const sourcePos = source.getPosition().clone().add(source.getAnchor());
    const targetPos = target.getPosition().clone().add(target.getAnchor());

    // Java `assert cornerBendPoints.size() == 2;` (:239) omitted (R6): assertions are not enabled in production.
    const thirdCP = cornerBendPoints[0];
    const fourthCP = cornerBendPoints[1];

    // calculate middle (between second and third) control point
    const middleCP = fourthCP.clone().add(thirdCP).scale(HALF);

    // calculate the spline
    return new NubsSelfLoop(NubSpline.DIM, [
      sourcePos,
      sourceBendPoint,
      thirdCP,
      middleCP,
      fourthCP,
      targetBendPoint,
      targetPos,
    ]);
  }

  /**
   * Generates a new NUBS representing a self loop that spans three sides. Basic bend points on the way are already
   * computed.
   *
   * @param source the source port.
   * @param target the target port.
   * @param sourceBendPoint first bend point from source to target.
   * @param cornerBendPoints bend points between the first and the last.
   * @param targetBendPoint last bend point from source to target.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:266
   */
  static createThreeSideSelfLoop(
    source: LPort,
    target: LPort,
    sourceBendPoint: KVector,
    cornerBendPoints: readonly KVector[],
    targetBendPoint: KVector,
  ): NubsSelfLoop {
    const sourcePos = source.getPosition().clone().add(source.getAnchor());
    const targetPos = target.getPosition().clone().add(target.getAnchor());

    // Java `assert cornerBendPoints.size() == 3;` (:273) omitted (R6).
    const thirdCP = cornerBendPoints[0];
    const fourthCP = cornerBendPoints[1];
    const fifthCP = cornerBendPoints[2];

    // calculate the spline
    return new NubsSelfLoop(NubSpline.DIM, [
      sourcePos,
      sourceBendPoint,
      thirdCP,
      fourthCP,
      fifthCP,
      targetBendPoint,
      targetPos,
    ]);
  }

  /**
   * Generates a new NUBS representing a self loop that spans four sides (the Java Javadoc says three). Basic bend
   * points on the way are already computed.
   *
   * @param source the source port.
   * @param target the target port.
   * @param sourceBendPoint first bend point from source to target.
   * @param cornerBendPoints bend points between the first and the last.
   * @param targetBendPoint last bend point from source to target.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubsSelfLoop.java:298
   */
  static createFourSideSelfLoop(
    source: LPort,
    target: LPort,
    sourceBendPoint: KVector,
    cornerBendPoints: readonly KVector[],
    targetBendPoint: KVector,
  ): NubsSelfLoop {
    const sourcePos = source.getPosition().clone().add(source.getAnchor());
    const targetPos = target.getPosition().clone().add(target.getAnchor());

    // Java `assert cornerBendPoints.size() == 4;` (:305) omitted (R6).
    const thirdCP = cornerBendPoints[0];
    const fourthCP = cornerBendPoints[1];
    const fifthCP = cornerBendPoints[2];
    const sixthCP = cornerBendPoints[3];

    // calculate the spline
    return new NubsSelfLoop(NubSpline.DIM, [
      sourcePos,
      sourceBendPoint,
      thirdCP,
      fourthCP,
      fifthCP,
      sixthCP,
      targetBendPoint,
      targetPos,
    ]);
  }
}
