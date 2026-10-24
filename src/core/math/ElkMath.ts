// SPDX-License-Identifier: EPL-2.0
import {
  averaged,
  averagef,
  averagei,
  averagel,
  boundd,
  boundf,
  boundi,
  boundl,
  clipVector,
  maxd,
  maxf,
  maxi,
  maxl,
  mind,
  minf,
  mini,
  minl,
  signum,
} from './ElkMathAggregates.js';
import {
  approximateBezierSegment,
  approximateBezierSpline,
  distanceFromBezierSegment,
  getPointOnBezierSegment,
} from './ElkMathBezier.js';
import { FACT_TABLE, binomiald, binomiall, factd, factl, powd, powf } from './ElkMathCombinatorics.js';
import { contains, distance, intersects, intersects2, shortestDistance } from './ElkMathGeometry.js';

/**
 * Facade of ElkMath, a collection of static math helpers. The members live in section modules
 * (`ElkMathCombinatorics`, `ElkMathAggregates`); sections never import this file.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export {
  FACT_TABLE,
  averaged,
  averagef,
  averagei,
  averagel,
  binomiald,
  binomiall,
  boundd,
  boundf,
  boundi,
  boundl,
  clipVector,
  factd,
  factl,
  maxd,
  maxf,
  maxi,
  maxl,
  mind,
  minf,
  mini,
  minl,
  powd,
  powf,
  signum,
  approximateBezierSegment,
  approximateBezierSpline,
  contains,
  distance,
  distanceFromBezierSegment,
  getPointOnBezierSegment,
  intersects,
  intersects2,
  shortestDistance,
};

/**
 * The public statics of Java's `ElkMath` ported so far.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export const ElkMath = {
  averaged,
  averagef,
  averagei,
  averagel,
  binomiald,
  binomiall,
  boundd,
  boundf,
  boundi,
  boundl,
  clipVector,
  factd,
  factl,
  maxd,
  maxf,
  maxi,
  maxl,
  mind,
  minf,
  mini,
  minl,
  powd,
  powf,
  signum,
  approximateBezierSegment,
  approximateBezierSpline,
  contains,
  distance,
  distanceFromBezierSegment,
  getPointOnBezierSegment,
  intersects,
  intersects2,
  shortestDistance,
} as const;
