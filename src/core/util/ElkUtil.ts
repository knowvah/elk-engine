// SPDX-License-Identifier: EPL-2.0
import { calcPortOffset, calcPortSide } from './ElkUtilPorts.js';
import {
  DEFAULT_MIN_HEIGHT,
  DEFAULT_MIN_WIDTH,
  applyConfiguredNodeScaling,
  computeChildAreaDimensions,
  effectiveMinSizeConstraintFor,
  resizeNode,
} from './ElkUtilSizing.js';
import { determineJunctionPoints } from './ElkUtilJunctions.js';
import { computeInsidePart, getLabelsBounds } from './ElkUtilLabels.js';
import {
  absolutePosition,
  applyVectorChain,
  createVectorChain,
  toAbsolute,
  toRelative,
  translate,
} from './ElkUtilCoordinates.js';
import { configureDefaultsRecursively, configureWithDefaultValues } from './ElkUtilDefaults.js';
import {
  applyVisitors,
  applyVisitorsWithValidation,
  createIdentifier,
  debugFolderPath,
  printElementPath,
} from './ElkUtilVisitors.js';

// The sections of Java's `ElkUtil` live in `ElkUtil*.ts` modules (M10), composed into `ElkUtil` below. To add a
// section module: import its functions here, add them to the `ElkUtil` object in Java order, and add a named
// re-export. `printElementPath` lives in `ElkUtilVisitors.ts` (no import cycle with `applyVisitorsWithValidation`).
export { DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT } from './ElkUtilSizing.js';
export { calcPortSide, calcPortOffset } from './ElkUtilPorts.js';
export {
  resizeNode,
  effectiveMinSizeConstraintFor,
  applyConfiguredNodeScaling,
  computeChildAreaDimensions,
} from './ElkUtilSizing.js';
export { determineJunctionPoints } from './ElkUtilJunctions.js';
export { getLabelsBounds, computeInsidePart } from './ElkUtilLabels.js';
export {
  translate,
  absolutePosition,
  toAbsolute,
  toRelative,
  createVectorChain,
  applyVectorChain,
} from './ElkUtilCoordinates.js';
export { configureDefaultsRecursively, configureWithDefaultValues } from './ElkUtilDefaults.js';
export {
  applyVisitors,
  applyVisitorsWithValidation,
  printElementPath,
  debugFolderPath,
  createIdentifier,
} from './ElkUtilVisitors.js';

/**
 * The public statics of Java's `ElkUtil`, in Java order; complete except the `elkjs-exclude` blocks (M2):
 * `toSafePathName` is not ported and `debugFolderPath` returns `null`. The Java overloads of `translate`,
 * `resizeNode`, `determineJunctionPoints`, `computeInsidePart` and `configureWithDefaultValues` are merged into
 * one function each, dispatching on the argument types.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export const ElkUtil = {
  DEFAULT_MIN_WIDTH,
  DEFAULT_MIN_HEIGHT,
  calcPortSide,
  calcPortOffset,
  resizeNode,
  effectiveMinSizeConstraintFor,
  applyConfiguredNodeScaling,
  computeChildAreaDimensions,
  determineJunctionPoints,
  getLabelsBounds,
  computeInsidePart,
  translate,
  absolutePosition,
  toAbsolute,
  toRelative,
  createVectorChain,
  applyVectorChain,
  configureDefaultsRecursively,
  configureWithDefaultValues,
  applyVisitors,
  applyVisitorsWithValidation,
  printElementPath,
  debugFolderPath,
  createIdentifier,
} as const;
