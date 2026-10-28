// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { Pair } from '../../../core/util/Pair.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Strings from '../../../guava/Strings.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { InteractiveReferencePoint } from '../options/InteractiveReferencePoint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { Layer } from './Layer.js';
import type { LEdge } from './LEdge.js';
import type { LGraph } from './LGraph.js';
import type { LLabel } from './LLabel.js';
import { LMargin } from './LMargin.js';
import { NodeType } from './LNodeNodeType.js';
import { LPadding } from './LPadding.js';
import { LPort } from './LPort.js';
import { LShape } from './LShape.js';

type PortPredicate = (port: LPort) => boolean;

/**
 * A node in a layered graph. The nested `NodeType` enum lives in `LNodeNodeType.ts` (M15).
 *
 * Java's `List` fields are arrays; `List.remove(Object)` is a guarded `splice`, `List.add(int, E)` a checked one.
 * `getPortSideView` keeps `ArrayList.subList`'s live, write-through view (see {@link subListView}).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LNode.java
 */
export class LNode extends LShape {
  /** the containing graph. */
  private graph: LGraph | null;
  /** the containing layer. */
  private layer: Layer | null = null;
  /** the node's node type. */
  private type: NodeType = NodeType.NORMAL;
  /** the ports of the node. */
  private readonly ports: LPort[] = [];
  /** this node's labels. */
  private readonly labels: LLabel[] = [];
  /** the nested graph, or `null`. */
  private nestedGraph: LGraph | null = null;
  /** the margin area around this node. */
  private readonly margin = new LMargin();
  /** the padding inside this node, usually reserved for port and label placement. */
  private readonly padding = new LPadding();
  /** Stores beginning and end indices of ports belonging to a side (Java `EnumMap`, keyed by constant). */
  private portSideIndices: Map<PortSide, Pair<number, number>> | null = null;
  /** Stores whether port sides have been cached. */
  private portSidesCached = false;

  /**
   * Creates a node.
   *
   * @param graph the graph for which the node is created
   */
  constructor(graph: LGraph | null) {
    super();
    this.graph = graph;
  }

  /** Returns the layer that owns this node. */
  getLayer(): Layer | null {
    return this.layer;
  }

  /**
   * Sets the owning layer. Java overloads `setLayer(Layer)` (append at the end) and `setLayer(int, Layer)` (insert at
   * the index); one implementation dispatches on the argument count (translation-rules §6.5). If the node was
   * previously in another layer, it is removed from that layer's list of nodes. Be careful not to use this method
   * while iterating through the nodes list of the old layer nor of the new layer.
   *
   * @throws IllegalArgumentException for the indexed form, if `newlayer` is not `null` and the index is not
   *           `>= 0` and `<= layer.getNodes().size()`
   */
  setLayer(thelayer: Layer | null): void;
  setLayer(index: number, newlayer: Layer | null): void;
  setLayer(...args: [Layer | null] | [number, Layer | null]): void {
    if (args.length === 1) {
      this.#setLayerAtEnd(args[0]);
    } else {
      this.#setLayerAtIndex(args[0], args[1]);
    }
  }

  #setLayerAtEnd(thelayer: Layer | null): void {
    if (this.layer !== null) {
      removeElement(this.layer.getNodes(), this);
    }

    this.layer = thelayer;

    if (this.layer !== null) {
      this.layer.getNodes().push(this);
    }
  }

  #setLayerAtIndex(index: number, newlayer: Layer | null): void {
    if (newlayer !== null && (index < 0 || index > newlayer.getNodes().length)) {
      throw new IllegalArgumentException('index must be >= 0 and <= layer node count');
    }

    if (this.layer !== null) {
      removeElement(this.layer.getNodes(), this);
    }

    this.layer = newlayer;

    if (newlayer !== null) {
      newlayer.getNodes().splice(index, 0, this);
    }
  }

  /** Returns the graph that contains this node. */
  getGraph(): LGraph | null {
    if (this.graph === null && this.layer !== null) {
      return this.layer.getGraph();
    }
    return this.graph;
  }

  /**
   * Set the containing graph. This method must not be used when the layer has already been assigned. The graphs'
   * lists of nodes are _not_ automatically updated. Java's `assert layer == null` is omitted (no dev-assert helper;
   * the JVM runs without `-ea`).
   *
   * @param newGraph the new containing graph
   */
  setGraph(newGraph: LGraph | null): void {
    this.graph = newGraph;
  }

  /** Returns the node's node type. Parts of the algorithm will treat nodes of different types differently. */
  getType(): NodeType {
    return this.type;
  }

  /**
   * Sets this node's node type.
   *
   * @param type the node's new node type.
   */
  setType(type: NodeType): void {
    this.type = type;
  }

  /**
   * Java overloads `getPorts()`, `getPorts(PortType)`, `getPorts(PortSide)` and `getPorts(PortType, PortSide)`; one
   * implementation dispatches on the argument count and `instanceof` (translation-rules §6.5).
   *
   * `getPorts()` returns the list of ports of this node. Note that all edges are connected to specific ports, even if
   * the original diagram does not have any ports. Before the crossing minimization phase has passed, the port order in
   * this list is arbitrary. After crossing minimization the order of ports corresponds to the clockwise order in which
   * they are drawn, starting with the north side: north ports from left to right, east ports from top to bottom,
   * south ports from right to left, west port from bottom to top.
   *
   * The other forms return an iterable for all ports of the given type, side, or type and side.
   */
  getPorts(): LPort[];
  getPorts(portType: PortType): Iterable<LPort>;
  getPorts(side: PortSide): Iterable<LPort>;
  getPorts(portType: PortType, side: PortSide): Iterable<LPort>;
  getPorts(...args: [] | [PortType | PortSide] | [PortType, PortSide]): Iterable<LPort> {
    if (args.length === 0) {
      return this.ports;
    } else if (args.length === 2) {
      return this.#getPortsOfTypeAndSide(args[0], args[1]);
    } else if (args[0] instanceof PortType) {
      return this.#getPortsOfType(args[0]);
    } else {
      return this.#getPortsOfSide(args[0]);
    }
  }

  #getPortsOfType(portType: PortType): Iterable<LPort> {
    switch (portType) {
      case PortType.INPUT:
        return Iterables.filter(this.ports, LPort.INPUT_PREDICATE);
      case PortType.OUTPUT:
        return Iterables.filter(this.ports, LPort.OUTPUT_PREDICATE);
      default:
        return [];
    }
  }

  #getPortsOfSide(side: PortSide): Iterable<LPort> {
    switch (side) {
      case PortSide.NORTH:
        return Iterables.filter(this.ports, LPort.NORTH_PREDICATE);
      case PortSide.EAST:
        return Iterables.filter(this.ports, LPort.EAST_PREDICATE);
      case PortSide.SOUTH:
        return Iterables.filter(this.ports, LPort.SOUTH_PREDICATE);
      case PortSide.WEST:
        return Iterables.filter(this.ports, LPort.WEST_PREDICATE);
      default:
        return [];
    }
  }

  /**
   * Returns a sublist view for all ports of given side. WARNING: Use this only after port sides are fixed! This is
   * currently the case after running the `PortListSorter`. Non-structural changes to this list are reflected in the
   * original list. A structural modification is any operation that adds or deletes one or more elements; merely
   * setting the value of an element is not a structural modification. Sublist indices can be cached using
   * {@link cachePortSides}.
   *
   * @param side a port side
   */
  getPortSideView(side: PortSide): LPort[] {
    if (!this.portSidesCached) {
      // If not explicitly cached, this will be repeated each time. However, this has the same complexity as
      // filtering by side.
      this.#findPortIndices();
    }
    const indices = this.portSideIndices!.get(side);
    if (indices === undefined) {
      return [];
    } else {
      // We must create a new sublist each time, because the order of the ports on one side can change.
      return subListView(this.ports, indices.getFirst()!, indices.getSecond()!);
    }
  }

  #getPortsOfTypeAndSide(portType: PortType, side: PortSide): Iterable<LPort> {
    const typePredicate = typePredicateOf(portType);
    const sidePredicate = sidePredicateOf(side);

    if (typePredicate !== null && sidePredicate !== null) {
      return Iterables.filter(this.ports, (port) => typePredicate(port) && sidePredicate(port));
    } else {
      return [];
    }
  }

  /** Returns an iterable for all incoming edges. */
  getIncomingEdges(): Iterable<LEdge> {
    const iterables: Iterable<LEdge>[] = [];
    for (const port of this.ports) {
      iterables.push(port.getIncomingEdges());
    }

    return Iterables.concatAll(iterables);
  }

  /** Returns an iterable for all outgoing edges. */
  getOutgoingEdges(): Iterable<LEdge> {
    const iterables: Iterable<LEdge>[] = [];
    for (const port of this.ports) {
      iterables.push(port.getOutgoingEdges());
    }

    return Iterables.concatAll(iterables);
  }

  /** Returns an iterable for all connected edges, both incoming and outgoing. */
  getConnectedEdges(): Iterable<LEdge> {
    const iterables: Iterable<LEdge>[] = [];
    for (const port of this.ports) {
      iterables.push(port.getConnectedEdges());
    }

    return Iterables.concatAll(iterables);
  }

  /** Returns this node's labels. */
  getLabels(): LLabel[] {
    return this.labels;
  }

  /** Returns a graph that is nested in this node, if any. */
  getNestedGraph(): LGraph | null {
    return this.nestedGraph;
  }

  /** Sets the nested graph. */
  setNestedGraph(nestedGraph: LGraph | null): void {
    this.nestedGraph = nestedGraph;
  }

  /**
   * Returns the node's margin. The margin is the space around the node that is to be reserved for ports and labels.
   * The margin is not automatically updated. Rather, the margin has to be calculated once the port and label
   * positions are fixed. Usually this is right before the node placement starts.
   */
  getMargin(): LMargin {
    return this.margin;
  }

  /**
   * Returns the node's padding. The padding describes the area inside the node that is used by ports, port labels,
   * and node labels. The padding is not automatically updated. Rather, the paddings have to be calculated once the
   * port and label positions are fixed. Usually this is right before node placement starts.
   */
  getPadding(): LPadding {
    return this.padding;
  }

  /**
   * Returns the index of the node in the containing layer's list of nodes. Note that this method has linear running
   * time in the number of nodes, so use it with caution.
   *
   * @return the index of this node, or -1 if the node has no layer
   */
  getIndex(): number {
    if (this.layer === null) {
      return -1;
    } else {
      return this.layer.getNodes().indexOf(this);
    }
  }

  /**
   * Converts the position of this node from coordinates relative to the parent node's border to coordinates relative
   * to that node's content area. The content area is the parent node border minus padding minus offset.
   *
   * @param horizontal if `true`, the x coordinate will be translated.
   * @param vertical if `true`, the y coordinate will be translated.
   */
  borderToContentAreaCoordinates(horizontal: boolean, vertical: boolean): void {
    const thegraph = this.getGraph()!;

    const graphPadding = thegraph.getPadding();
    const offset = thegraph.getOffset();
    const pos = this.getPosition();

    if (horizontal) {
      pos.x = pos.x - graphPadding.left - offset.x;
    }

    if (vertical) {
      pos.y = pos.y - graphPadding.top - offset.y;
    }
  }

  /**
   * Returns the position of this node's interactive reference point. This position depends on the graph's
   * `INTERACTIVE_REFERENCE_POINT` property. It determines on which basis node positions are compared with each other
   * in interactive layout phases.
   */
  getInteractiveReferencePoint(): KVector | null {
    switch (this.getGraph()!.getProperty(LayeredOptions.INTERACTIVE_REFERENCE_POINT)) {
      case InteractiveReferencePoint.CENTER: {
        const nodePos = this.getPosition();
        const nodeSize = this.getSize();

        return new KVector(nodePos.x + nodeSize.x / 2.0, nodePos.y + nodeSize.y / 2.0);
      }

      case InteractiveReferencePoint.TOP_LEFT:
        return new KVector(this.getPosition());

      default:
        // This shouldn't happen.
        return null;
    }
  }

  /**
   * After port sides are fixed (after running the `PortListSorter`) the index region of ports for each side will stay
   * constant. These are cached from the port list sorter using this method and a sublist view created.
   */
  cachePortSides(): void {
    this.portSidesCached = true;
    this.#findPortIndices();
  }

  #findPortIndices(): void {
    this.portSideIndices = new Map<PortSide, Pair<number, number>>();
    let firstIndexForCurrentSide = 0;
    let currentSide = PortSide.NORTH;
    let currentIndex = 0;
    for (; currentIndex < this.ports.length; currentIndex++) {
      const port = this.ports[currentIndex] as LPort;
      if (port.getSide() !== currentSide) {
        if (firstIndexForCurrentSide !== currentIndex) {
          this.portSideIndices.set(currentSide, Pair.of(firstIndexForCurrentSide, currentIndex));
        }
        currentSide = port.getSide();
        firstIndexForCurrentSide = currentIndex;
      }
    }
    this.portSideIndices.set(currentSide, Pair.of(firstIndexForCurrentSide, currentIndex));
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

  /** Checks if the labels represented by the given this label dummy are to be placed inline. */
  isInlineEdgeLabel(): boolean {
    return (
      this.getType() === NodeType.LABEL &&
      this.getProperty(InternalProperties.REPRESENTED_LABELS).every((label) =>
        label.getProperty(LayeredOptions.EDGE_LABELS_INLINE),
      )
    );
  }

  toString(): string {
    let result = 'n';
    if (this.type !== NodeType.NORMAL) {
      result += `(${this.type.toString().toLowerCase()})`;
    }
    result += `_${String(this.getDesignation())}`;
    return result;
  }
}

/** The type predicate of `getPorts(PortType, PortSide)`, or `null` for a type without one. */
function typePredicateOf(portType: PortType): PortPredicate | null {
  switch (portType) {
    case PortType.INPUT:
      return LPort.INPUT_PREDICATE;
    case PortType.OUTPUT:
      return LPort.OUTPUT_PREDICATE;
    default:
      return null;
  }
}

/** The side predicate of `getPorts(PortType, PortSide)`, or `null` for a side without one. */
function sidePredicateOf(side: PortSide): PortPredicate | null {
  switch (side) {
    case PortSide.NORTH:
      return LPort.NORTH_PREDICATE;
    case PortSide.EAST:
      return LPort.EAST_PREDICATE;
    case PortSide.SOUTH:
      return LPort.SOUTH_PREDICATE;
    case PortSide.WEST:
      return LPort.WEST_PREDICATE;
    default:
      return null;
  }
}

/** Java `List.remove(Object)`: removes the first occurrence, if any. */
function removeElement<T>(list: T[], element: T): void {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/** The integer index a property key names (negative included, as Java `get(int)` sees it), or `null`. */
function arrayIndex(key: string | symbol): number | null {
  return typeof key === 'string' && /^-?(?:0|[1-9]\d*)$/.test(key) ? Number(key) : null;
}

/** Java `Objects.checkIndex` as `SubList.get/set` apply it (JDK 21 message, oracle row `site/lnode/portSideView`). */
function checkIndex(i: number, n: number): void {
  if (i < 0 || i >= n) throw new IndexOutOfBoundsException(`Index ${i} out of bounds for length ${n}`);
}

/**
 * Java `ArrayList.subList(from, to)` as an array: reads see the backing list and element writes go through to it (7c's
 * `GreedyPortDistributor.switchPorts` reorders ports through it). An index outside the view throws
 * `IndexOutOfBoundsException` as `SubList.get/set` do; a structural change throws `UnsupportedOperationException`.
 */
function subListView<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const size = toIndex - fromIndex;
  return new Proxy<T[]>([], {
    get(target, key, receiver): unknown {
      if (key === 'length') {
        return size;
      }
      const index = arrayIndex(key);
      if (index !== null) {
        checkIndex(index, size);
        return list[fromIndex + index];
      }
      return Reflect.get(target, key, receiver);
    },
    has(target, key): boolean {
      const index = arrayIndex(key);
      return index === null ? Reflect.has(target, key) : index >= 0 && index < size;
    },
    set(_target, key, value: T): boolean {
      const index = arrayIndex(key);
      if (index === null) {
        throw new UnsupportedOperationException('structural modification of a port side view');
      }
      checkIndex(index, size);
      list[fromIndex + index] = value;
      return true;
    },
  });
}
