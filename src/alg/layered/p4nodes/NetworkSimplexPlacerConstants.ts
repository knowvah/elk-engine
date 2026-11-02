// SPDX-License-Identifier: EPL-2.0
// The `private static final` constants of the Java `NetworkSimplexPlacer` (`:198-217`, `:1286-1291`), named once for
// the section files (no magic literals repeated across them).

/** Basis for the weight of edges. */
export const EDGE_WEIGHT_BASE = 4;
/** Smaller weight than default, since horizontal edges are more important. */
export const SMALL_EDGE_WEIGHT = 0.1;
/**
 * If this factor is smaller than one straight long edges are deemed more important than straight (node) paths (longer
 * than two) identified during `preferStraightEdges`.
 */
export const LONG_EDGE_VS_PATH_FACTOR = 2;

/** Large weight to be applied if nodes must not change in size. */
export const NODE_SIZE_WEIGHT_STATIC = 10000;
/** Small weight to be applied if nodes may change in size. */
export const NODE_SIZE_WEIGHT_FLEXIBLE = 1;

/** Epsilon for double equality testing. */
export const EPSILON = 0.00001;

/** Indicates that the node has not been visited yet. */
export const VISITED = -1;
/** Indicates that a node is not a `JUNCTION`. */
export const OTHER = 0;
/**
 * A junction has either an incoming degree larger than two, an outgoing degree larger than two, or both. Or it is a
 * leaf node, i.e. has exactly one incident edge.
 */
export const JUNCTION = 2;
