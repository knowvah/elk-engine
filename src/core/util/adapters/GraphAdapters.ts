// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import type { ElkMargin } from '../../math/ElkMargin.js';
import type { ElkPadding } from '../../math/ElkPadding.js';
import type { KVector } from '../../math/KVector.js';
import type { LabelSide } from '../../options/LabelSide.js';
import type { PortSide } from '../../options/PortSide.js';

/**
 * A set of generic interfaces that provide access to graph structures. Some generic algorithms provided
 * by ELK work with these interfaces to be usable for any layout algorithm, regardless what kind of
 * specialized graph structure it uses internally.
 *
 * The Java nested interfaces are exported from this type-only namespace, so `import type
 * { GraphAdapters }` reaches `GraphAdapters.NodeAdapter` (C3). Java wildcards `<?>` are `unknown`;
 * `Comparator<?>` is a comparator accepting any element type.
 *
 * @author uru
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/GraphAdapters.java
 */
// eslint-disable-next-line @typescript-eslint/no-namespace -- type-only namespace mirrors the Java nested interfaces
export namespace GraphAdapters {
  /**
   * A generic adapter for graph elements that have a position and dimension. Can be used, for
   * instance, to implement node, port, and label adapters.
   *
   * When using these adapters keep in mind to explicitly use the set methods, e.g. for padding.
   * `node.getPosition().x = 3` most likely changes an intermediate object and is never applied to
   * the original graph's element.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface GraphElementAdapter<T> {
    /** @returns the size of the graph element, `x` is the width, `y` the height. */
    getSize(): KVector;

    /** @param size the new size to be set for the graph element. */
    setSize(size: KVector): void;

    /** @returns the current position of the graph element. */
    getPosition(): KVector;

    /** @param pos the new position of the graph element. */
    setPosition(pos: KVector): void;

    /**
     * @param prop the property to retrieve.
     * @returns the value of the requested property.
     */
    getProperty<P>(prop: IProperty<P>): P;

    /**
     * @param prop the property for whose existence to check.
     * @returns `true` if the property is configured, `false` otherwise.
     */
    hasProperty<P>(prop: IProperty<P>): boolean;

    /**
     * Returns the volatile ID for this element that can be used arbitrarily by layout algorithms.
     * No assumptions about the returned value must be made; a valid ID must first be set by
     * {@link GraphElementAdapter.setVolatileId}.
     *
     * @returns the ID.
     */
    getVolatileId(): number;

    /** @param volatileId the new ID. */
    setVolatileId(volatileId: number): void;
  }

  /**
   * Adapter for graph element, provides children of the graph.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface GraphAdapter<T> extends GraphElementAdapter<T> {
    /** @returns all child nodes of this graph wrapped in an {@link NodeAdapter}. */
    getNodes(): Iterable<NodeAdapter<unknown>>;
  }

  /**
   * Adapter for a node, provides labels, ports, and padding.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface NodeAdapter<T> extends GraphElementAdapter<T> {
    /** @returns the node's parent graph. Can be `null` if the node has no parent graph. */
    getGraph(): GraphAdapter<unknown> | null;

    /** @returns the labels of the node wrapped in adapters. */
    getLabels(): Iterable<LabelAdapter<unknown>>;

    /** @returns the ports of the node wrapped in adapter. */
    getPorts(): Iterable<PortAdapter<unknown>>;

    /** @returns a collection of the node's incoming edges wrapped in an adapter. */
    getIncomingEdges(): Iterable<EdgeAdapter<unknown>>;

    /** @returns a collection of the node's outgoing edges wrapped in an adapter. */
    getOutgoingEdges(): Iterable<EdgeAdapter<unknown>>;

    /**
     * Sort the port list, using the specified comparator if given and otherwise the default order
     * of the implementing graph adapter, for every node with `PortConstraints` at least
     * `FIXED_ORDER`. Covers the Java overloads `sortPortList()` and `sortPortList(Comparator<?>)`.
     *
     * @param comparator a comparator for the type of the implementing graph adapter, e.g. KPort.
     */
    sortPortList(comparator?: (a: never, b: never) => number): void;

    /**
     * Whether the node an is a compound node or not, i.e if it has child nodes. This might
     * influence certain layout decisions, such as where to place inside port labels so that they
     * don't overlap edges. A node that has inside self-loops activated is treated as a compound
     * node.
     *
     * @returns `true` if it is a compound node.
     */
    isCompoundNode(): boolean;

    /**
     * Returns the node's padding. The padding describe the area inside the node that is used by
     * ports, port labels, and node labels.
     *
     * @returns the node's padding.
     */
    getPadding(): ElkPadding;

    /** @param padding sets the new padding of this node. */
    setPadding(padding: ElkPadding): void;

    /**
     * Returns the node's margin. The margin is the space around the node that is to be reserved
     * for ports and labels.
     *
     * @returns the node's margin.
     */
    getMargin(): ElkMargin;

    /** @param margin the new margin to be set. */
    setMargin(margin: ElkMargin): void;
  }

  /**
   * Adapter for a port element, provides access to the port's side, margin, and labels.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface PortAdapter<T> extends GraphElementAdapter<T> {
    /** @returns the port's side. */
    getSide(): PortSide;

    /** @returns the port's labels wrapped in adapters. */
    getLabels(): Iterable<LabelAdapter<unknown>>;

    /**
     * Returns the port's margin. The margin is the space around the node that is to be reserved
     * for ports and labels.
     *
     * @returns the ports's margin.
     */
    getMargin(): ElkMargin;

    /** @param margin the new margin to be set. */
    setMargin(margin: ElkMargin): void;

    /** @returns a collection of the port's incoming edges wrapped in an adapter. */
    getIncomingEdges(): Iterable<EdgeAdapter<unknown>>;

    /** @returns a collection of the port's outgoing edges wrapped in an adapter. */
    getOutgoingEdges(): Iterable<EdgeAdapter<unknown>>;

    /**
     * Checks if the port has any incident edges the come from or go to descendants of its node. If
     * the node is not a compound node, the result is always `false`.
     *
     * @returns `true` if the port has any connections to descendants of its node or any incident
     *          edges that are inside self loops, `false` otherwise.
     */
    hasCompoundConnections(): boolean;
  }

  /**
   * Adapter for a label.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface LabelAdapter<T> extends GraphElementAdapter<T> {
    /** @returns the side of the label. */
    getSide(): LabelSide;

    /** @returns the label's text. */
    getText(): string;
  }

  /**
   * Adapter for an edge.
   *
   * @param <T> the type of the underlying graph element.
   */
  export interface EdgeAdapter<T> {
    /** @returns the edge's labels wrapped in an adapter. */
    getLabels(): Iterable<LabelAdapter<unknown>>;
  }
}
