// SPDX-License-Identifier: EPL-2.0
import { LinkedList } from '../../java/util/LinkedList.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { BezierCurve } from './BezierSplineBezierCurve.js';
import { approximateBezierSegment } from './ElkMathBezier.js';
import type { KVector } from './KVector.js';

/**
 * Represents a piecewise bezier spline. This means a collection of bezier curves adding up to a
 * smooth spline.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/BezierSpline.java
 */
export class BezierSpline {
  /**
   * internal storage for all pieces, use LinkedList, as there usually is added an arbitrary number of
   * piecewise curves to the end.
   */
  readonly #curves: LinkedList<BezierCurve> = new LinkedList<BezierCurve>();

  /**
   * Adds a new piece of bezierCurve to the whole spline, or a new curve given by its start point,
   * control points and end point.
   */
  addCurve(curve: BezierCurve): void;
  addCurve(startPnt: KVector, fstCtrPnt: KVector, sndCtrPnt: KVector, endPnt: KVector): void;
  addCurve(...args: [BezierCurve] | [KVector, KVector, KVector, KVector]): void {
    if (args.length === 1) {
      this.#curves.add(args[0]);
    } else {
      this.#curves.add(new BezierCurve(args[0], args[1], args[2], args[3]));
    }
  }

  /**
   * Add a whole piecewise spline to this spline.
   *
   * @param spline spline being added
   * @param beginning if true, the new spline is added at the beginning, otherwise at the end
   */
  addSpline(spline: BezierSpline, beginning: boolean): void {
    if (!beginning) {
      this.#curves.addAll(spline.getCurves());
    } else {
      this.#curves.addAllAt(0, spline.getCurves());
    }
  }

  /** Returns the first point of the first piece of the spline. */
  getStartPoint(): KVector {
    return this.#curves.getFirst().start;
  }

  /** Returns the last point of the last piece of the spline. */
  getEndPoint(): KVector {
    return this.#curves.getLast().end;
  }

  /** Returns the inner points of this piecewise bezier spline. */
  getInnerPoints(): KVector[] {
    if (this.#curves.isEmpty()) {
      return [];
    }

    const size = this.#curves.size() * 3 - 1;
    const points: KVector[] = new Array<KVector>(size);

    let i = 0;
    const curveIter = this.#curves.listIterator();
    while (curveIter.hasNext()) {
      const cu = curveIter.next();
      points[i++] = cu.fstControlPnt;
      points[i++] = cu.sndControlPnt;
      if (curveIter.hasNext()) {
        points[i++] = cu.end;
      }
    }

    return points;
  }

  /**
   * Returns just the base points, including start and end point. Those are the points REALLY lying on
   * the curve.
   */
  getBasePoints(): KVector[] {
    const size = this.#curves.size() + 1;
    const ret: KVector[] = new Array<KVector>(size);

    ret[0] = this.#curves.getFirst().start;
    let i = 1;
    for (const curve of this.#curves.toArray()) {
      ret[i++] = curve.end;
    }

    return ret;
  }

  /**
   * Returns a sequence of points, representing this spline as an approximated polyline.
   *
   * @param accuracy number of points per curve
   */
  getPolylineApprx(accuracy: number): KVector[] {
    // there are #accuracy points per curve, plus the additional start point
    const apprx: KVector[] = new Array<KVector>(this.#curves.size() * accuracy + 1);

    // add initial point
    apprx[0] = this.#curves.getFirst().start;

    let i = 1;
    // add all further points
    for (const curve of this.#curves.toArray()) {
      const pts = approximateBezierSegment(accuracy, ...curve.asArray());
      for (const p of pts) {
        // clone in case of latter changes
        apprx[i++] = p.clone();
      }
    }
    return apprx;
  }

  /** Returns piecewise curves. */
  getCurves(): LinkedList<BezierCurve> {
    return this.#curves;
  }

  toString(): string {
    const s = new StringBuilder();
    for (const cu of this.#curves.toArray()) {
      s.append(
        `${cu.start.toString()} -> ${cu.fstControlPnt.toString()} -> ${cu.sndControlPnt.toString()} -> ${cu.end.toString()}\n`,
      );
    }
    return s.toString();
  }
}
