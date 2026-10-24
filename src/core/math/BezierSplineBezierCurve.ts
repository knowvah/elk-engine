// SPDX-License-Identifier: EPL-2.0
import type { KVector } from './KVector.js';

/**
 * Represents a part of the whole spline consisting of start and end point, and two control points
 * (Java nested class `BezierSpline.BezierCurve`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/BezierSpline.java
 */
export class BezierCurve {
  /** start point. */
  start: KVector;
  /** first control point. */
  fstControlPnt: KVector;
  /** snd control point. */
  sndControlPnt: KVector;
  /** end point. */
  end: KVector;

  constructor(startPnt: KVector, fstCtrPnt: KVector, sndCtrPnt: KVector, endPnt: KVector) {
    this.start = startPnt;
    this.fstControlPnt = fstCtrPnt;
    this.sndControlPnt = sndCtrPnt;
    this.end = endPnt;
  }

  /** Returns this segment of the bezier spline as a list of Points. */
  asVectorList(): KVector[] {
    return [this.start, this.fstControlPnt, this.sndControlPnt, this.end];
  }

  /** Returns this segment of the bezier spline as an array of Points. */
  asArray(): KVector[] {
    return [this.start, this.fstControlPnt, this.sndControlPnt, this.end];
  }
}
