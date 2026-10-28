// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { PortSide } from '../../../core/options/PortSide.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Strings from '../../../guava/Strings.js';
import * as JavaObjects from '../../../java/util/JavaObjects.js';
import type { LEdge } from './LEdge.js';
import { LMargin } from './LMargin.js';
import type { LLabel } from './LLabel.js';
import type { LNode } from './LNode.js';
import { LShape } from './LShape.js';

/**
 * A port in a layered graph. The position of the port is relative to the upper left corner of the containing node
 * and marks the port's upper left corner. The position where edges are attached is marked by the anchor and is
 * relative to the port's position. The incoming edges and outgoing edges are stored separately, but is is possible
 * to iterate over both types of edges using the concatenation of the corresponding lists.
 *
 * Port must be used even if the original graph does not reveal them. In this case each edge has dedicated source and
 * target ports, which are used to determine the points where the edge touches the source and target nodes.
 *
 * Java's `List` fields are arrays (`List.remove(Object)` is a guarded `splice`); Guava `Predicate`s are functions.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LPort.java
 */
export class LPort extends LShape {
  /** a predicate that checks for output ports, that is ports with outgoing edges. */
  static readonly OUTPUT_PREDICATE = (port: LPort): boolean => port.outgoingEdges.length !== 0;
  /** a predicate that checks for input ports, that is ports with incoming edges. */
  static readonly INPUT_PREDICATE = (port: LPort): boolean => port.incomingEdges.length !== 0;
  /** a predicate that checks for north-side ports. */
  static readonly NORTH_PREDICATE = (port: LPort): boolean => port.side === PortSide.NORTH;
  /** a predicate that checks for east-side ports. */
  static readonly EAST_PREDICATE = (port: LPort): boolean => port.side === PortSide.EAST;
  /** a predicate that checks for south-side ports. */
  static readonly SOUTH_PREDICATE = (port: LPort): boolean => port.side === PortSide.SOUTH;
  /** a predicate that checks for west-side ports. */
  static readonly WEST_PREDICATE = (port: LPort): boolean => port.side === PortSide.WEST;

  /** the owning node. */
  private owner: LNode | null = null;
  /** the port side. */
  private side: PortSide = PortSide.UNDEFINED;
  /** the anchor point position. */
  private readonly anchor = new KVector();
  /** whether the anchor point position was fixed by the user or not. */
  private explicitlySuppliedPortAnchor = false;
  /** the margin area around this port. */
  private readonly margin = new LMargin();
  /** this port's labels. */
  private readonly labels: LLabel[] = [];

  /** the edges going into the port. */
  private readonly incomingEdges: LEdge[] = [];
  /** the edges going out of the port. */
  private readonly outgoingEdges: LEdge[] = [];
  /** All connected edges in a combined iterable. */
  private readonly connectedEdges: Iterable<LEdge> = new CombineIter<LEdge>(this.incomingEdges, this.outgoingEdges);

  /**
   * Whether the original port has edges that connect it to nodes outside of this subgraph. This influences the
   * amount of space we will have to reserve for labels in the `LabelAndNodeSizeProcessor`.
   */
  private connectedToExternalNodes = true;

  /** Returns the node that owns this port. */
  getNode(): LNode | null {
    return this.owner;
  }

  /**
   * Sets the owning node and adds itself to the node's list of ports. If the port was previously in another node, it
   * is removed from that node's list of ports. Be careful not to use this method while iterating through the ports
   * list of the old node nor of the new node.
   *
   * @param node the owner to set
   */
  setNode(node: LNode | null): void {
    if (this.owner !== null) {
      removeElement(this.owner.getPorts(), this);
    }

    this.owner = node;

    if (this.owner !== null) {
      this.owner.getPorts().push(this);
    }
  }

  /** Returns the node side on which the port is drawn. */
  getSide(): PortSide {
    return this.side;
  }

  /**
   * Sets the node side on which the port is drawn. If the port anchor was not already supplied it is set to the
   * default for the corresponding direction. The default position is in the middle of the port in the direction
   * specified by the side to set.
   *
   * @param theside the side to set
   */
  setSide(theside: PortSide): void {
    // Java throws NullPointerException; a TypeError stands in (AD-16b)
    if (theside === null || theside === undefined) {
      throw new TypeError('theside');
    }
    this.side = theside;
    if (!this.isExplicitlySuppliedPortAnchor()) {
      this.#defaultAnchor();
    }
  }

  /** The switch of {@link setSide}. */
  #defaultAnchor(): void {
    switch (this.side) {
      case PortSide.NORTH:
        // adapt the anchor so edges are attached top center
        this.getAnchor().x = this.getSize().x / 2;
        this.getAnchor().y = 0;
        break;
      case PortSide.EAST:
        // adapt the anchor so edges are attached center right
        this.getAnchor().x = this.getSize().x;
        this.getAnchor().y = this.getSize().y / 2;
        break;
      case PortSide.SOUTH:
        // adapt the anchor so edges are attached bottom center
        this.getAnchor().x = this.getSize().x / 2;
        this.getAnchor().y = this.getSize().y;
        break;
      case PortSide.WEST:
        // adapt the anchor so edges are attached center left
        this.getAnchor().x = 0;
        this.getAnchor().y = this.getSize().y / 2;
        break;
    }
  }

  /**
   * Returns the anchor position of the port. This is the point where edges should be attached, relative to the
   * port's position. Is automatically changed whenever `setSide` is called.
   */
  getAnchor(): KVector {
    return this.anchor;
  }

  /**
   * Checks if the anchor position is explicitly set. The algorithm should always check this property before changing
   * the port anchor.
   */
  isExplicitlySuppliedPortAnchor(): boolean {
    return this.explicitlySuppliedPortAnchor;
  }

  /**
   * Determines whether the port's anchor is to be considered explicitly supplied and should not be changed.
   *
   * @param fixed `true` if the anchor is explicitly supplied, `false` if it is eligible to be modified.
   */
  setExplicitlySuppliedPortAnchor(fixed: boolean): void {
    this.explicitlySuppliedPortAnchor = fixed;
  }

  /**
   * Returns the absolute anchor position of the port. This is the point where edges should be attached, relative to
   * the containing graph. This method creates a new vector, so modifying the result will not affect this port in any
   * way.
   */
  getAbsoluteAnchor(): KVector {
    return KVector.sum(this.getNode()!.getPosition(), this.getPosition(), this.anchor);
  }

  /** Returns the margin around this port. The margin is typically used to reserve space for the port's labels. */
  getMargin(): LMargin {
    return this.margin;
  }

  /** Returns this port's labels. */
  getLabels(): LLabel[] {
    return this.labels;
  }

  /** Returns the name of the port. The name is derived from the text of the first label, if any. */
  getName(): string | null {
    if (this.labels.length !== 0) {
      return (this.labels[0] as LLabel).getText();
    }
    return null;
  }

  /** Returns this port's degree, that is, the number of edges connected to it. */
  getDegree(): number {
    return this.incomingEdges.length + this.outgoingEdges.length;
  }

  /** Returns the number of incoming edges minus the number of outgoing edges. This is the net flow of the port. */
  getNetFlow(): number {
    return this.incomingEdges.length - this.outgoingEdges.length;
  }

  /** Returns the list of edges going into this port. */
  getIncomingEdges(): LEdge[] {
    return this.incomingEdges;
  }

  /** Returns the list of edges going out of this port. */
  getOutgoingEdges(): LEdge[] {
    return this.outgoingEdges;
  }

  /** Returns an iterable over all connected edges, both incoming and outgoing. */
  getConnectedEdges(): Iterable<LEdge> {
    return this.connectedEdges;
  }

  /** Returns whether the original port has connections to nodes outside of this subgraph. */
  isConnectedToExternalNodes(): boolean {
    return this.connectedToExternalNodes;
  }

  /** Sets whether the original port has connections to nodes outside of this subgraph. */
  setConnectedToExternalNodes(conn: boolean): void {
    this.connectedToExternalNodes = conn;
  }

  /**
   * Returns an iterable over all the port's predecessor ports. Predecessor ports are source ports of incoming edges
   * of this port. Java's iterator also offers `remove()` (removing the edge from the incoming list); no ELK caller
   * uses it, and a JS iterator has no such operation.
   */
  getPredecessorPorts(): Iterable<LPort> {
    const incomingEdges = this.incomingEdges;
    return {
      *[Symbol.iterator](): Iterator<LPort> {
        for (const edge of incomingEdges) {
          yield edge.getSource()!;
        }
      },
    };
  }

  /**
   * Returns an iterable over all the port's successor ports. Successor ports are target ports of outgoing edges of
   * this port. See {@link getPredecessorPorts} on `remove()`.
   */
  getSuccessorPorts(): Iterable<LPort> {
    const outgoingEdges = this.outgoingEdges;
    return {
      *[Symbol.iterator](): Iterator<LPort> {
        for (const edge of outgoingEdges) {
          yield edge.getTarget()!;
        }
      },
    };
  }

  /** Returns an iterable over all connected ports, both predecessors and successors. */
  getConnectedPorts(): Iterable<LPort> {
    return Iterables.concat(this.getPredecessorPorts(), this.getSuccessorPorts());
  }

  /**
   * Returns the index of the port in the containing node's list of ports. Note that this method has linear running
   * time in the number of ports, so use it with caution.
   *
   * @return the index of this port, or -1 if the port has no owner
   */
  getIndex(): number {
    if (this.owner === null) {
      return -1;
    } else {
      return this.owner.getPorts().indexOf(this);
    }
  }

  override getDesignation(): string | null {
    if (this.labels.length !== 0 && !Strings.isNullOrEmpty((this.labels[0] as LLabel).getText())) {
      return (this.labels[0] as LLabel).getText();
    }
    const id = super.getDesignation();
    if (id !== null) {
      return id;
    }
    return String(this.getIndex());
  }

  toString(): string {
    let result = `p_${JavaObjects.toString(this.getDesignation())}`;
    if (this.owner !== null) {
      result += `[${this.owner.toString()}]`;
    }
    const firstIncoming = this.incomingEdges[0];
    if (this.incomingEdges.length === 1 && this.outgoingEdges.length === 0 && firstIncoming!.getSource() !== this) {
      const source = firstIncoming!.getSource()!;
      result += ` << ${JavaObjects.toString(source.getDesignation())}`;
      result += `[${JavaObjects.toString(source.owner)}]`;
    }
    const firstOutgoing = this.outgoingEdges[0];
    if (this.incomingEdges.length === 0 && this.outgoingEdges.length === 1 && firstOutgoing!.getTarget() !== this) {
      const target = firstOutgoing!.getTarget()!;
      result += ` >> ${JavaObjects.toString(target.getDesignation())}`;
      result += `[${JavaObjects.toString(target.owner)}]`;
    }
    return result;
  }
}

/** Java `List.remove(Object)`: removes the first occurrence, if any. */
function removeElement<T>(list: T[], element: T): void {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * Combines two Iterables. We use this instead of `Iterables.concat` because it is faster.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LPort.java (nested `CombineIter`)
 */
class CombineIter<T> implements Iterable<T> {
  private readonly firstIterable: Iterable<T>;
  private readonly secondIterable: Iterable<T>;

  constructor(firstIterable: Iterable<T>, secondIterable: Iterable<T>) {
    this.firstIterable = firstIterable;
    this.secondIterable = secondIterable;
  }

  *[Symbol.iterator](): Iterator<T> {
    yield* this.firstIterable;
    yield* this.secondIterable;
  }
}
