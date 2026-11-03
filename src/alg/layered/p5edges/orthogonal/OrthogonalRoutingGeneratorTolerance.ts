// SPDX-License-Identifier: EPL-2.0

/**
 * Differences below this tolerance value are treated as zero. This is `OrthogonalRoutingGenerator.TOLERANCE`
 * (`OrthogonalRoutingGenerator.java:66`) in a leaf module: the direction strategies read it, and the generator
 * reaches the strategies, so a value import of the generator from them would close a module cycle at the abstract
 * base class (the generator's static `TOLERANCE` re-exports this constant).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/OrthogonalRoutingGenerator.java
 */
export const ORTHOGONAL_ROUTING_TOLERANCE = 1e-3;
