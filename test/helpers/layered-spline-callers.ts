// SPDX-License-Identifier: EPL-2.0
// What a `calls/<Class>` replay of test/golden/refs/java/layered-routing-steps.json needs for the four spline classes
// (issue #46): the caller table of each class (`<Class>.<method>` to the function `runCall` invokes) and, for the
// classes whose class test and `.sites` test built the same one, the `Factories` of the rows' prefix processors.
// Each table is the union of the tables its class's tests held; LayeredRoutingVectors.test.ts spreads the four.
// The `SplinesMath.isBetween` overloads are chosen per row by their callers and stay with them.
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { NubSpline } from '../../src/alg/layered/p5edges/splines/NubSpline.js';
import { NubsSelfLoop } from '../../src/alg/layered/p5edges/splines/NubsSelfLoop.js';
import { Rectangle } from '../../src/alg/layered/p5edges/splines/Rectangle.js';
import { SplinesMath } from '../../src/alg/layered/p5edges/splines/SplinesMath.js';
import { KVector } from '../../src/core/math/KVector.js';
import type { PortSide } from '../../src/core/options/PortSide.js';
import type { Factories } from './layered-phase-replay-ops.js';
import type { CallerTable } from './layered-routing-replay-ops.js';

// ------------------------------------------------------------------------------------------------------------
// caller tables

/** The static methods of `SplinesMath` the `calls` rows name, apart from the `isBetween` overloads. */
export const SPLINES_MATH_CALLERS: CallerTable = {
  'SplinesMath.intersect': SplinesMath.intersect as CallerTable[string],
  'SplinesMath.innerAngle': SplinesMath.innerAngle as CallerTable[string],
  'SplinesMath.lengthToOrthogonal': SplinesMath.lengthToOrthogonal,
  'SplinesMath.portSideToDirection': SplinesMath.portSideToDirection,
  'SplinesMath.distPortToNodeEdge': SplinesMath.distPortToNodeEdge,
  'SplinesMath.getMarginOnPortSide': SplinesMath.getMarginOnPortSide,
};

/** A void call returns its receiver (the T3 contract); a static method wins over an instance method of one name. */
export const RECTANGLE_CALLERS: CallerTable = {
  'Rectangle.union': (rectangle: Rectangle, other: Rectangle | KVector | LNode): Rectangle => {
    if (other instanceof Rectangle) {
      return Rectangle.union(rectangle, other);
    }
    if (other instanceof KVector) {
      rectangle.union(other);
    } else {
      rectangle.union(other);
    }
    return rectangle;
  },
  'Rectangle.getHeight': (rectangle: Rectangle) => rectangle.getHeight(),
  'Rectangle.getWidth': (rectangle: Rectangle) => rectangle.getWidth(),
  'Rectangle.enlarge': (rectangle: Rectangle, enlargement: number): Rectangle => {
    rectangle.enlarge(enlargement);
    return rectangle;
  },
  'Rectangle.getFromPortSide': (rectangle: Rectangle, side: PortSide): number => rectangle.getFromPortSide(side),
  'Rectangle.toNodeMargins': (rectangle: Rectangle, node: LNode) => rectangle.toNodeMargins(node),
} as CallerTable;

/** The Java `void toBezier()` returns its receiver (the harness summarises the receiver after the call). */
export const NUB_SPLINE_CALLERS: CallerTable = {
  'NubSpline.generateDerivedNUBS': NubSpline.generateDerivedNUBS,
  'NubSpline.generateInvertedNUBS': NubSpline.generateInvertedNUBS,
  'NubSpline.toBezier': (spline: NubSpline) => {
    spline.toBezier();
    return spline;
  },
  'NubSpline.getPointOnCurve': (spline: NubSpline, t: number, modify?: boolean) => spline.getPointOnCurve(t, modify),
  'NubSpline.getFirstVerticalPoint': NubSpline.getFirstVerticalPoint,
  'NubSpline.getLastVerticalPoint': NubSpline.getLastVerticalPoint,
  'NubSpline.getFirstHorizontalPoint': NubSpline.getFirstHorizontalPoint,
  'NubSpline.getLastHorizontalPoint': NubSpline.getLastHorizontalPoint,
  'NubSpline.generateNiceCurve': NubSpline.generateNiceCurve,
};

/** The five static self-loop factories of `NubsSelfLoop`. */
export const NUBS_SELF_LOOP_CALLERS: CallerTable = Object.fromEntries(
  (
    [
      'createSideSelfLoop',
      'createCornerSelfLoop',
      'createAcrossSelfLoop',
      'createThreeSideSelfLoop',
      'createFourSideSelfLoop',
    ] as const
  ).map((name) => [`NubsSelfLoop.${name}`, NubsSelfLoop[name] as CallerTable[string]]),
);

// ------------------------------------------------------------------------------------------------------------
// factories of the `calls` rows: prefix processors through the real enum, and no row runs a phase

/** The `Factories` of the `calls/Rectangle` rows. */
export const RECTANGLE_CALL_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/Rectangle row runs the phase ${phase}/${strategy}`);
  },
};

/** The `Factories` of the `calls/NubSpline` rows. */
export const NUB_SPLINE_CALL_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubSpline row runs the phase ${phase}/${strategy}`);
  },
};

/** The `Factories` of the `calls/NubsSelfLoop` rows. */
export const NUBS_SELF_LOOP_CALL_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubsSelfLoop row runs the phase ${phase}/${strategy}`);
  },
};
