// SPDX-License-Identifier: EPL-2.0
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import * as Strings from '../../../guava/Strings.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import * as JavaObjects from '../../../java/util/JavaObjects.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { LGraph } from './LGraph.js';
import { LGraphElement } from './LGraphElement.js';
import { provideCollectorPort } from './LGraphUtilPorts.js';
import type { LLabel } from './LLabel.js';
import { LNode } from './LNode.js';
import type { LPort } from './LPort.js';

/**
 * An edge in a layered graph. Edges may only be connected to ports of a node, which represent the point where the
 * edge touches the node.
 *
 * `reverse` calls `LGraphUtil.provideCollectorPort` through its section module (sections never import the facade).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LEdge.java
 */
export class LEdge extends LGraphElement {
  /** the bend points. */
  private bendPoints = new KVectorChain();
  /** the source port. */
  private source: LPort | null = null;
  /** the target port. */
  private target: LPort | null = null;
  /** labels assigned to this edge. */
  private readonly labels: LLabel[] = [];

  /**
   * Reverses the edge, including its bend points. Negates the `REVERSED` property. (an edge that was marked as being
   * reversed is then unmarked, and the other way around) This does not change any properties on the connected ports.
   * End labels are reversed as well (`HEAD` labels become `TAIL` labels and vice versa).
   *
   * @param layeredGraph the layered graph
   * @param adaptPorts If true and a connected port is a collector port (a port used to merge edges), the
   *          corresponding opposite port is used instead of the original one.
   */
  reverse(layeredGraph: LGraph, adaptPorts: boolean): void {
    const oldSource = this.getSource()!;
    const oldTarget = this.getTarget()!;

    this.setSource(null);
    this.setTarget(null);
    if (adaptPorts && oldTarget.getProperty(InternalProperties.INPUT_COLLECT)) {
      this.setSource(provideCollectorPort(layeredGraph, oldTarget.getNode()!, PortType.OUTPUT, PortSide.EAST));
    } else {
      this.setSource(oldTarget);
    }
    if (adaptPorts && oldSource.getProperty(InternalProperties.OUTPUT_COLLECT)) {
      this.setTarget(provideCollectorPort(layeredGraph, oldSource.getNode()!, PortType.INPUT, PortSide.WEST));
    } else {
      this.setTarget(oldSource);
    }

    // Switch end labels
    for (const label of this.labels) {
      const labelPlacement = label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT);

      if (labelPlacement === EdgeLabelPlacement.TAIL) {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
      } else if (labelPlacement === EdgeLabelPlacement.HEAD) {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
      }
    }

    const reversed = this.getProperty(InternalProperties.REVERSED);
    this.setProperty(InternalProperties.REVERSED, !reversed);

    this.bendPoints = KVectorChain.reverse(this.bendPoints);
  }

  /** Returns the source port. */
  getSource(): LPort | null {
    return this.source;
  }

  /**
   * Sets the source port of this edge and adds itself to the port's list of edges. If the edge previously had another
   * source, it is removed from the original port's list of edges. Be careful not to use this method while iterating
   * through the edges list of the old port nor of the new port.
   *
   * @param source the source port to set
   */
  setSource(source: LPort | null): void {
    if (this.source !== null) {
      removeElement(this.source.getOutgoingEdges(), this);
    }

    this.source = source;

    if (this.source !== null) {
      this.source.getOutgoingEdges().push(this);
    }
  }

  /** Returns the target port. */
  getTarget(): LPort | null {
    return this.target;
  }

  /**
   * Sets the target port of this edge and adds itself to the port's list of edges. If the edge previously had another
   * target, it is removed from the original port's list of edges. Be careful not to use this method while iterating
   * through the edges list of the old port nor of the new port.
   *
   * @param target the target port to set
   */
  setTarget(target: LPort | null): void {
    if (this.target !== null) {
      removeElement(this.target.getIncomingEdges(), this);
    }

    this.target = target;

    if (this.target !== null) {
      this.target.getIncomingEdges().push(this);
    }
  }

  /**
   * The same as {@link setTarget} with the exception that the index the edge is inserted at in the target port's list
   * of incoming edges can be specified.
   *
   * _If you need to think about whether you want to use this or {@link setTarget}, chances are you want the latter._
   *
   * @param targetPort the target port to set
   * @param index the index to insert the edge at in the port's list of edges.
   * @throws IndexOutOfBoundsException if `target != null` and the index is invalid.
   */
  setTargetAndInsertAtIndex(targetPort: LPort | null, index: number): void {
    if (this.target !== null) {
      removeElement(this.target.getIncomingEdges(), this);
    }

    this.target = targetPort;

    if (this.target !== null) {
      // The insertion index below is the only difference to setTarget(LPort)
      insertElement(this.target.getIncomingEdges(), index, this);
    }
  }

  /**
   * Determines if this edge is a self-loop or not. An edge is considered a self-loop if both, source and target port
   * are defined and belong to the same non-null node.
   */
  isSelfLoop(): boolean {
    if (this.source === null || this.target === null) {
      return false;
    }

    return this.source.getNode() !== null && this.source.getNode() === this.target.getNode();
  }

  /**
   * Determines if this edge is an in-layer edge, that is source and target node are in the same layer.
   *
   * @see isSelfLoop
   */
  isInLayerEdge(): boolean {
    return !this.isSelfLoop() && this.source!.getNode()!.getLayer() === this.target!.getNode()!.getLayer();
  }

  /**
   * Returns the list of bend points, with coordinates relative to the `LayeredGraph`'s origin. The list is initially
   * empty.
   */
  getBendPoints(): KVectorChain {
    return this.bendPoints;
  }

  /** Returns the list of edge labels. */
  getLabels(): LLabel[] {
    return this.labels;
  }

  /**
   * Returns the opposite end: the target for the source and vice versa. Java overloads `getOther(LPort)` and
   * `getOther(LNode)`; one implementation dispatches on `instanceof LNode` (translation-rules §6.5).
   *
   * @throws IllegalArgumentException if the argument is neither end of this edge.
   */
  getOther(port: LPort): LPort | null;
  getOther(node: LNode): LNode | null;
  getOther(end: LPort | LNode): LPort | LNode | null {
    return end instanceof LNode ? this.#getOtherNode(end) : this.#getOtherPort(end);
  }

  #getOtherPort(port: LPort): LPort | null {
    if (port === this.source) {
      return this.target;
    } else if (port === this.target) {
      return this.source;
    } else {
      throw new IllegalArgumentException("'port' must be either the source port or target port of the edge.");
    }
  }

  #getOtherNode(node: LNode): LNode | null {
    if (node === this.source!.getNode()) {
      return this.target!.getNode();
    } else if (node === this.target!.getNode()) {
      return this.source!.getNode();
    } else {
      throw new IllegalArgumentException("'node' must either be the source node or target node of the edge.");
    }
  }

  override getDesignation(): string | null {
    if (this.labels.length !== 0 && !Strings.isNullOrEmpty((this.labels[0] as LLabel).getText())) {
      return (this.labels[0] as LLabel).getText();
    }
    return super.getDesignation();
  }

  toString(): string {
    let result = 'e_';
    const designation = this.getDesignation();
    if (designation !== null) {
      result += designation;
    }
    if (this.source !== null && this.target !== null) {
      result += ` ${JavaObjects.toString(this.source.getDesignation())}`;
      result += `[${JavaObjects.toString(this.source.getNode())}]`;
      result += ` -> ${JavaObjects.toString(this.target.getDesignation())}`;
      result += `[${JavaObjects.toString(this.target.getNode())}]`;
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

/** Java `List.add(int, E)`: throws `IndexOutOfBoundsException` unless `0 <= index <= size`. */
function insertElement<T>(list: T[], index: number, element: T): void {
  if (index < 0 || index > list.length) {
    throw new IndexOutOfBoundsException(`Index: ${index}, Size: ${list.length}`);
  }
  list.splice(index, 0, element);
}
