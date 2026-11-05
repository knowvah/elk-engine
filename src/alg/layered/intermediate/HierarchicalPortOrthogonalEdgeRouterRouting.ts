// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { RoutingDirection } from '../p5edges/orthogonal/direction/RoutingDirection.js';
import { OrthogonalRoutingGenerator } from '../p5edges/orthogonal/OrthogonalRoutingGenerator.js';

/** The debug prefix of the northern routing generator (`:548`). */
const NORTH_DEBUG_PREFIX = 'extnorth';
/** The debug prefix of the southern routing generator (`:571`). */
const SOUTH_DEBUG_PREFIX = 'extsouth';

/** The source and target layers of one side's routing (`Set<LNode>`s: `LinkedHashSet` is `Set`, insertion order). */
interface SideLayers {
  readonly source: Set<LNode>;
  readonly target: Set<LNode>;
}

/**
 * Routes nothern and southern hierarchical port edges and ajusts the graph's height and offsets accordingly.
 *
 * @param monitor the progress monitor we're using.
 * @param layeredGraph the layered graph.
 * @param northSouthDummies the collection of restored northern and southern port dummies.
 * @param northernExtPortEdgeRoutingHeight the field's current value, kept when no northern edge needs a slot.
 * @returns the new value of `northernExtPortEdgeRoutingHeight`.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:511
 */
export function routeEdges(
  monitor: IElkProgressMonitor,
  layeredGraph: LGraph,
  northSouthDummies: Iterable<LNode>,
  northernExtPortEdgeRoutingHeight: number,
): number {
  // Prepare south and target layers for northern and southern routing
  const north: SideLayers = { source: new Set<LNode>(), target: new Set<LNode>() };
  const south: SideLayers = { source: new Set<LNode>(), target: new Set<LNode>() };

  // Find some routing parameters
  const nodeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE);
  const edgeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);

  // Assemble the northern and southern hierarchical port dummies and the nodes they are connected to
  for (const hierarchicalPortDummy of northSouthDummies) {
    const portSide = hierarchicalPortDummy.getProperty(InternalProperties.EXT_PORT_SIDE);

    if (portSide === PortSide.NORTH) {
      collect(north, hierarchicalPortDummy);
    } else if (portSide === PortSide.SOUTH) {
      collect(south, hierarchicalPortDummy);
    }
  }

  const spacings: Spacings = { nodeSpacing, edgeSpacing };

  // Northern routing
  const height = routeNorthern(monitor, layeredGraph, north, spacings, northernExtPortEdgeRoutingHeight);

  // Southern routing
  routeSouthern(monitor, layeredGraph, south, spacings);

  return height;
}

/** The two spacings `routeEdges` reads (`:521-522`). */
interface Spacings {
  readonly nodeSpacing: number;
  readonly edgeSpacing: number;
}

/**
 * The "Northern routing" block of {@link routeEdges} (`:544-565`), split out for the NLOC limit.
 *
 * @returns the new value of `northernExtPortEdgeRoutingHeight`.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:545
 */
function routeNorthern(
  monitor: IElkProgressMonitor,
  layeredGraph: LGraph,
  north: SideLayers,
  { nodeSpacing, edgeSpacing }: Spacings,
  northernExtPortEdgeRoutingHeight: number,
): number {
  let height = northernExtPortEdgeRoutingHeight;

  if (north.source.size > 0) {
    // Route the edges using a south-to-north orthogonal edge router
    const routingGenerator = new OrthogonalRoutingGenerator(
      RoutingDirection.SOUTH_TO_NORTH,
      edgeSpacing,
      NORTH_DEBUG_PREFIX,
    );

    const slots = routingGenerator.routeEdges(
      monitor,
      layeredGraph,
      north.source,
      0,
      north.target,
      -nodeSpacing - layeredGraph.getOffset().y,
    );

    // If anything was routed, adjust the graph's offset and height
    if (slots > 0) {
      height = nodeSpacing + (slots - 1) * edgeSpacing;

      layeredGraph.getOffset().y += height;
      layeredGraph.getSize().y += height;
    }
  }

  return height;
}

/**
 * The "Southern routing" block of {@link routeEdges} (`:567-585`), split out for the NLOC limit.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:568
 */
function routeSouthern(
  monitor: IElkProgressMonitor,
  layeredGraph: LGraph,
  south: SideLayers,
  { nodeSpacing, edgeSpacing }: Spacings,
): void {
  if (south.source.size > 0) {
    // Route the edges using a north-to-south orthogonal edge router
    const routingGenerator = new OrthogonalRoutingGenerator(
      RoutingDirection.NORTH_TO_SOUTH,
      edgeSpacing,
      SOUTH_DEBUG_PREFIX,
    );

    const slots = routingGenerator.routeEdges(
      monitor,
      layeredGraph,
      south.source,
      0,
      south.target,
      layeredGraph.getSize().y + nodeSpacing - layeredGraph.getOffset().y,
    );

    // Adjust graph height.
    if (slots > 0) {
      layeredGraph.getSize().y += nodeSpacing + (slots - 1) * edgeSpacing;
    }
  }
}

/**
 * The body shared by the `NORTH` and `SOUTH` branches of the assembling loop (`:530-534`, `:536-540`): the dummy joins
 * the target layer and the nodes its incoming edges come from join the source layer.
 */
function collect(side: SideLayers, hierarchicalPortDummy: LNode): void {
  side.target.add(hierarchicalPortDummy);

  for (const edge of hierarchicalPortDummy.getIncomingEdges()) {
    side.source.add(edge.getSource()!.getNode()!);
  }
}
