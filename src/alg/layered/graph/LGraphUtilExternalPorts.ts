// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IPropertyHolder } from '../../../graph/properties/IPropertyHolder.js';
import { EdgeConstraint } from '../options/EdgeConstraint.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LGraph } from './LGraph.js';
import { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';
import { LPort } from './LPort.js';

/**
 * The "External Ports" section of `LGraphUtil` (`:737-1024`) as module functions behind the facade.
 *
 * `createExternalPortDummy` has nine Java parameters; they arrive as one {@link ExternalPortDummyArgs} object with the
 * Java names (5-parameter limit, graph-text T11 precedent). Its `switch (finalExternalPortSide)` arms are one function
 * each ({@link placeWestDummy} … {@link placeSouthDummy}) over the file-local {@link DummyPlacement} record, and the
 * order-information block is {@link orderInformation} with its two arms; the free-side and anchor blocks are
 * {@link freeExternalPortSide} and {@link retrieveAnchor}. `getExternalPortPosition`'s side switch is
 * {@link placeExternalPort} with one function per arm over {@link ExternalPortGeometry}. Statement order is unchanged.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/** The parameters of `LGraphUtil.createExternalPortDummy`, named as in Java. */
export interface ExternalPortDummyArgs {
  /** property holder for layout options that are set on the original port */
  readonly propertyHolder: IPropertyHolder;
  /** constraints for external ports. */
  readonly portConstraints: PortConstraints;
  /** the side of the external port. */
  readonly portSide: PortSide;
  /** the number of incoming minus the number of outgoing edges. */
  readonly netFlow: number;
  /** the size of the node the port belongs to. Only relevant if the port constraints are `FIXED_RATIO`. */
  readonly portNodeSize: KVector;
  /**
   * the current port position. Only relevant if the port constraints are `FIXED_ORDER`, `FIXED_RATIO` or
   * `FIXED_POSITION`.
   */
  readonly portPosition: KVector;
  /**
   * size of the port. Depending on the port's side, the created dummy will have the same width or height as the port,
   * with the other dimension set to zero.
   */
  readonly portSize: KVector;
  /** layout direction of the node that owns the port. Must not be `Direction.UNDEFINED`. */
  readonly layoutDirection: Direction;
  /** the layered graph */
  readonly layeredGraph: LGraph;
}

/** The locals one `switch (finalExternalPortSide)` arm of `createExternalPortDummy` reads and writes. */
interface DummyPlacement {
  readonly dummy: LNode;
  readonly dummyPort: LPort;
  readonly portSize: KVector;
  readonly portBorderOffset: number;
  readonly anchor: KVector;
  readonly explicitAnchor: boolean;
}

/**
 * Creates a dummy for an external port. The dummy will have just one port. The port is on the eastern side for
 * western external ports, on the western side for eastern external ports, on the southern side for northern external
 * ports, and on the northern side for southern external ports.
 *
 * The returned dummy node is decorated with some properties:
 * - Its node type is set to `NodeType.EXTERNAL_PORT`.
 * - Its `InternalProperties.ORIGIN` is set to the external port object.
 * - The `LayeredOptions.PORT_CONSTRAINTS` are set to `PortConstraints.FIXED_POS`.
 * - For western and eastern port dummies, the `LayeredOptions.LAYER_CONSTRAINT` is set to
 *   `LayerConstraint.FIRST_SEPARATE` and `LayerConstraint.LAST_SEPARATE`, respectively.
 * - For northern and southern port dummies, the `InternalProperties.IN_LAYER_CONSTRAINT` is set to
 *   `InLayerConstraint.TOP` and `InLayerConstraint.BOTTOM`, respectively.
 * - For eastern dummies, the `InternalProperties.EDGE_CONSTRAINT` is set to `EdgeConstraint.OUTGOING_ONLY`; for
 *   western dummies, it is set to `EdgeConstraint.INCOMING_ONLY`; for all other dummies, it is left unset.
 * - `LayeredOptions.EXT_PORT_SIDE` is set to the side of the external port represented.
 * - If the port constraints of the original port's node are set to `PortConstraints.FIXED_RATIO` or
 *   `PortConstraints.FIXED_POS`, the dummy node's `InternalProperties.PORT_RATIO_OR_POSITION` property is set to the
 *   port's original position, defined relative to the original node's origin. (as opposed to relative to the node's
 *   content area)
 * - The `LayeredOptions.EXT_PORT_SIZE` property is set to the size of the external port the the dummy represents,
 *   while the size of the dummy itself is set to `(0, 0)`.
 *
 * The layout direction of a graph has implications on the side external ports are placed at. If port constraints
 * imply fixed sides for ports, the `LayeredOptions.EXT_PORT_SIDE` property is set to whatever the external port's port
 * side is. If the port side needs to be determined, it depends on the port type (input port or output port;
 * determined by the number of incoming and outgoing edges) and on the layout direction as follows:
 *
 * |       | Input port | Output port |
 * | ----- | ---------- | ----------- |
 * | Right | WEST       | EAST        |
 * | Left  | EAST       | WEST        |
 * | Down  | NORTH      | SOUTH       |
 * | Up    | SOUTH      | NORTH       |
 *
 * @return a dummy node representing the external port.
 */
export function createExternalPortDummy(args: ExternalPortDummyArgs): LNode {
  const { propertyHolder, portConstraints, portSize, layoutDirection, layeredGraph } = args;
  let finalExternalPortSide = args.portSide;

  // Create the dummy with one port
  const dummy = new LNode(layeredGraph);
  dummy.setType(NodeType.EXTERNAL_PORT);
  dummy.setProperty(InternalProperties.EXT_PORT_SIZE, portSize);
  dummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  const portBorderOffset = propertyHolder.getProperty(LayeredOptions.PORT_BORDER_OFFSET);
  dummy.setProperty(LayeredOptions.PORT_BORDER_OFFSET, portBorderOffset);

  const dummyPort = new LPort();
  dummyPort.setNode(dummy);

  // If the port constraints are free, we need to determine where to put the dummy (and its port)
  if (!portConstraints.isSideFixed()) {
    finalExternalPortSide = freeExternalPortSide(args.netFlow, layoutDirection);
    propertyHolder.setProperty(LayeredOptions.PORT_SIDE, finalExternalPortSide);
  }

  // Retrieve the anchor point, possibly to be modified later
  const anchor = new KVector();
  const explicitAnchor = retrieveAnchor(propertyHolder, portSize, anchor);

  // With the port side at hand, set the necessary properties and place the dummy's port
  // at the dummy's center
  placeDummy(finalExternalPortSide, { dummy, dummyPort, portSize, portBorderOffset, anchor, explicitAnchor });

  // Finally apply the anchor by setting the dummy port position accordingly. Also, remember the anchor on the
  // dummy itself since the hierarchical port processors depend on that
  dummyPort.getPosition().set(anchor);
  dummy.setProperty(LayeredOptions.PORT_ANCHOR, anchor);

  if (portConstraints.isOrderFixed()) {
    // The order of ports is fixed in some way, so what we will have to do is to remember information about it
    dummy.setProperty(InternalProperties.PORT_RATIO_OR_POSITION, orderInformation(args, finalExternalPortSide));
  }

  // Set the port side of the dummy
  dummy.setProperty(InternalProperties.EXT_PORT_SIDE, finalExternalPortSide);

  return dummy;
}

/** The free-side block of {@link createExternalPortDummy}: the side of a port whose constraints fix no side. */
function freeExternalPortSide(netFlow: number, layoutDirection: Direction): PortSide {
  // we need some layout direction here, use RIGHT as default in case it is undefined
  // (Java: `assert layoutDirection != Direction.UNDEFINED`, omitted: no dev-assert helper, JVM without -ea)
  if (netFlow >= 0) {
    return PortSide.fromDirection(layoutDirection);
  } else {
    return PortSide.fromDirection(layoutDirection).opposed();
  }
}

/**
 * The anchor block of {@link createExternalPortDummy}: sets `anchor` from the explicit `PORT_ANCHOR` or the port
 * center, returning Java's `explicitAnchor`.
 */
function retrieveAnchor(propertyHolder: IPropertyHolder, portSize: KVector, anchor: KVector): boolean {
  if (propertyHolder.hasProperty(LayeredOptions.PORT_ANCHOR)) {
    anchor.set(propertyHolder.getProperty(LayeredOptions.PORT_ANCHOR));
    return true;
  } else {
    anchor.set(portSize.x / 2, portSize.y / 2);
    return false;
  }
}

/** The `switch (finalExternalPortSide)` of {@link createExternalPortDummy}. */
function placeDummy(side: PortSide, placement: DummyPlacement): void {
  switch (side) {
    case PortSide.WEST:
      placeWestDummy(placement);
      break;
    case PortSide.EAST:
      placeEastDummy(placement);
      break;
    case PortSide.NORTH:
      placeNorthDummy(placement);
      break;
    case PortSide.SOUTH:
      placeSouthDummy(placement);
      break;
    default:
    // Should never happen! (Java: `assert false : finalExternalPortSide`, omitted: JVM without -ea)
  }
}

/** The `case WEST` arm of {@link placeDummy}. */
function placeWestDummy(p: DummyPlacement): void {
  p.dummy.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST_SEPARATE);
  p.dummy.setProperty(InternalProperties.EDGE_CONSTRAINT, EdgeConstraint.OUTGOING_ONLY);
  p.dummy.getSize().y = p.portSize.y;
  if (p.portBorderOffset < 0) {
    p.dummy.getSize().x = -p.portBorderOffset;
  }
  p.dummyPort.setSide(PortSide.EAST);
  if (!p.explicitAnchor) {
    p.anchor.x = p.portSize.x;
  }

  // The port anchors think that there is a difference between the port's left and right border
  // coordinates, which makes sense if the port has a non-zero width. The port dummy, however,
  // will have a width of zero. Thus, the anchor must be relative to -portWidth. This fixes #546.
  p.anchor.x -= p.portSize.x;
}

/** The `case EAST` arm of {@link placeDummy}. */
function placeEastDummy(p: DummyPlacement): void {
  p.dummy.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST_SEPARATE);
  p.dummy.setProperty(InternalProperties.EDGE_CONSTRAINT, EdgeConstraint.INCOMING_ONLY);
  p.dummy.getSize().y = p.portSize.y;
  if (p.portBorderOffset < 0) {
    p.dummy.getSize().x = -p.portBorderOffset;
  }
  p.dummyPort.setSide(PortSide.WEST);
  if (!p.explicitAnchor) {
    p.anchor.x = 0;
  }
}

/** The `case NORTH` arm of {@link placeDummy}. */
function placeNorthDummy(p: DummyPlacement): void {
  p.dummy.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.TOP);
  p.dummy.getSize().x = p.portSize.x;
  if (p.portBorderOffset < 0) {
    p.dummy.getSize().y = -p.portBorderOffset;
  }
  p.dummyPort.setSide(PortSide.SOUTH);
  if (!p.explicitAnchor) {
    p.anchor.y = p.portSize.y;
  }

  // See comments in case WEST. This partly fixes #680.
  p.anchor.y -= p.portSize.y;
}

/** The `case SOUTH` arm of {@link placeDummy}. */
function placeSouthDummy(p: DummyPlacement): void {
  p.dummy.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.BOTTOM);
  p.dummy.getSize().x = p.portSize.x;
  if (p.portBorderOffset < 0) {
    p.dummy.getSize().y = -p.portBorderOffset;
  }
  p.dummyPort.setSide(PortSide.NORTH);
  if (!p.explicitAnchor) {
    p.anchor.y = 0;
  }
}

/** The `informationAboutIt` computation inside `if (portConstraints.isOrderFixed())` of `createExternalPortDummy`. */
function orderInformation(args: ExternalPortDummyArgs, finalExternalPortSide: PortSide): number {
  // If only the order is fixed _and_ the port has an explicit index set on it, remember that
  if (
    args.portConstraints === PortConstraints.FIXED_ORDER &&
    args.propertyHolder.hasProperty(LayeredOptions.PORT_INDEX)
  ) {
    return indexInformation(args.propertyHolder.getProperty(LayeredOptions.PORT_INDEX), finalExternalPortSide);
  } else {
    // Otherwise, we will just go with the position itself
    return positionInformation(args, finalExternalPortSide);
  }
}

/** The port-index arm of {@link orderInformation}. */
function indexInformation(portIndex: number, finalExternalPortSide: PortSide): number {
  let informationAboutIt = 0;

  // We will have to be careful: on the SOUTH and WEST sides, the index is in reverse to what we would
  // later expect in the code, so we'll use the index * -1 there
  switch (finalExternalPortSide) {
    case PortSide.NORTH:
    case PortSide.EAST:
      informationAboutIt = portIndex;
      break;

    case PortSide.SOUTH:
    case PortSide.WEST:
      informationAboutIt = -1 * portIndex;
      break;
  }

  return informationAboutIt;
}

/** The position arm of {@link orderInformation}. */
function positionInformation(args: ExternalPortDummyArgs, finalExternalPortSide: PortSide): number {
  let informationAboutIt = 0;

  switch (finalExternalPortSide) {
    case PortSide.WEST:
    case PortSide.EAST:
      informationAboutIt = args.portPosition.y;
      if (args.portConstraints.isRatioFixed()) {
        informationAboutIt /= args.portNodeSize.y;
      }

      break;

    case PortSide.NORTH:
    case PortSide.SOUTH:
      informationAboutIt = args.portPosition.x;
      if (args.portConstraints.isRatioFixed()) {
        informationAboutIt /= args.portNodeSize.x;
      }

      break;
  }

  return informationAboutIt;
}

/**
 * Calculates the position of the external port's top left corner from the position of the given dummy node that
 * represents the port. The position is relative to the graph node's top left corner.
 *
 * @param graph the graph for which ports shall be placed
 * @param portDummy the dummy node representing the external port.
 * @param portWidth the external port's width.
 * @param portHeight the external port's height.
 * @return the external port's position.
 */
export function getExternalPortPosition(
  graph: LGraph,
  portDummy: LNode,
  portWidth: number,
  portHeight: number,
): KVector {
  const portPosition = new KVector(portDummy.getPosition());
  portPosition.x += portDummy.getSize().x / 2.0;
  portPosition.y += portDummy.getSize().y / 2.0;

  // The exact coordinates depend on the port's side... (often enough, these calculations will
  // give the same results as the port coordinates already computed, but depending on the kind of
  // connected components processing, the computed coordinates might be wrong now)
  placeExternalPort(graph, portDummy, portPosition, portWidth, portHeight);

  return portPosition;
}

/** The locals of {@link getExternalPortPosition} that its side arms read and write. */
interface ExternalPortGeometry {
  readonly portPosition: KVector;
  readonly portDummy: LNode;
  readonly portWidth: number;
  readonly portHeight: number;
  readonly portOffset: number;
  /** Java reads `graph.getSize()`, `getPadding()` and `getOffset()` into locals; the arms call the getters. */
  readonly graph: LGraph;
}

/**
 * The rest of {@link getExternalPortPosition} after the dummy center: the `PORT_BORDER_OFFSET` read (a
 * side-effect-free getter, read here instead of before the center adjustment) and the `switch` on the dummy's
 * external port side, one function per arm.
 */
function placeExternalPort(
  graph: LGraph,
  portDummy: LNode,
  portPosition: KVector,
  portWidth: number,
  portHeight: number,
): void {
  const portOffset = portDummy.getProperty(LayeredOptions.PORT_BORDER_OFFSET);
  const g: ExternalPortGeometry = { portPosition, portDummy, portWidth, portHeight, portOffset, graph };

  switch (portDummy.getProperty(InternalProperties.EXT_PORT_SIDE)) {
    case PortSide.NORTH:
      placeNorthPort(g);
      break;
    case PortSide.EAST:
      placeEastPort(g);
      break;
    case PortSide.SOUTH:
      placeSouthPort(g);
      break;
    case PortSide.WEST:
      placeWestPort(g);
      break;
  }
}

/** The `case NORTH` arm of {@link placeExternalPort}. */
function placeNorthPort(g: ExternalPortGeometry): void {
  const padding = g.graph.getPadding();
  const graphOffset = g.graph.getOffset();
  g.portPosition.x += padding.left + graphOffset.x - g.portWidth / 2.0;
  g.portPosition.y = -g.portHeight - g.portOffset;
  g.portDummy.getPosition().y = -(padding.top + g.portOffset + graphOffset.y);
}

/** The `case EAST` arm of {@link placeExternalPort}. */
function placeEastPort(g: ExternalPortGeometry): void {
  const graphSize = g.graph.getSize();
  const padding = g.graph.getPadding();
  const graphOffset = g.graph.getOffset();
  g.portPosition.x = graphSize.x + padding.left + padding.right + g.portOffset;
  g.portPosition.y += padding.top + graphOffset.y - g.portHeight / 2.0;
  g.portDummy.getPosition().x = graphSize.x + padding.right + g.portOffset - graphOffset.x;
}

/** The `case SOUTH` arm of {@link placeExternalPort}. */
function placeSouthPort(g: ExternalPortGeometry): void {
  const graphSize = g.graph.getSize();
  const padding = g.graph.getPadding();
  const graphOffset = g.graph.getOffset();
  g.portPosition.x += padding.left + graphOffset.x - g.portWidth / 2.0;
  g.portPosition.y = graphSize.y + padding.top + padding.bottom + g.portOffset;
  g.portDummy.getPosition().y = graphSize.y + padding.bottom + g.portOffset - graphOffset.y;
}

/** The `case WEST` arm of {@link placeExternalPort}. */
function placeWestPort(g: ExternalPortGeometry): void {
  const padding = g.graph.getPadding();
  const graphOffset = g.graph.getOffset();
  g.portPosition.x = -g.portWidth - g.portOffset;
  g.portPosition.y += padding.top + graphOffset.y - g.portHeight / 2.0;
  g.portDummy.getPosition().x = -(padding.left + g.portOffset + graphOffset.x);
}
