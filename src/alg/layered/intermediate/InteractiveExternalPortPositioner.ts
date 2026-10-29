// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** An arbitrarily chosen spacing value to separate external port dummies from other nodes. */
const ARBITRARY_SPACING = 10;

/** `Class.toString()` of the Java class, as the Java exception message embeds it (`this.getClass()`). */
const JAVA_CLASS_STRING = 'class org.eclipse.elk.alg.layered.intermediate.InteractiveExternalPortPositioner';

/**
 * Interactive layout, for instance using `InteractiveCycleBreaker` or `InteractiveLayerer` relies on previously
 * specified positions to determine a layout of the graph. For dummy nodes such as external port dummies no positions
 * can be specified up front. This processor performs this task and assigns reasonable positions to dummy nodes. For
 * example, westward external ports are positioned left of all other nodes of the graph.
 *
 * Precondition: a layered graph. Postcondition: external ports possess reasonable positions for interactive layering.
 * Slots: before phase 1.
 *
 * Guava `Optional<Double>` (and `transform`) becomes `number | null` with an explicit write. The Java `minX`...`maxY`
 * instance fields persist across `process` calls and are kept as fields. The `assert` in `findNorthSouthPortXCoordinate`
 * is omitted (translation-rules 6.8).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/InteractiveExternalPortPositioner.java
 */
export class InteractiveExternalPortPositioner implements ILayoutProcessor<LGraph> {
  private minX = Number.POSITIVE_INFINITY;
  private maxX = Number.NEGATIVE_INFINITY;
  private minY = Number.POSITIVE_INFINITY;
  private maxY = Number.NEGATIVE_INFINITY;

  process(layeredGraph: LGraph, _progressMonitor: IElkProgressMonitor): void {
    // if the graph does not contain any external ports ...
    if (!layeredGraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      // ... nothing we can do about it
      return;
    }

    // find the minimum and maximum x coordinates of the graph
    for (const node of layeredGraph.getLayerlessNodes()) {
      if (node.getType() === NodeType.NORMAL) {
        const margins = node.getProperty(LayeredOptions.MARGINS);
        this.minX = Math.min(this.minX, node.getPosition().x - margins.left);
        this.maxX = Math.max(this.maxX, node.getPosition().x + node.getSize().x + margins.right);
        this.minY = Math.min(this.minY, node.getPosition().y - margins.top);
        this.maxY = Math.max(this.maxY, node.getPosition().y + node.getSize().y + margins.bottom);
      }
    }

    // assign reasonable coordinates to external port dummies
    for (const node of layeredGraph.getLayerlessNodes()) {
      if (node.getType() !== NodeType.NORMAL) {
        if (node.getType() === NodeType.EXTERNAL_PORT) {
          this.positionExternalPortDummy(node);
        } else {
          throw new IllegalArgumentException(
            `The node type ${node.getType().toString()} is not supported by the ${JAVA_CLASS_STRING}`,
          );
        }
      }
    }
  }

  /** The Java's `case EXTERNAL_PORT:` arm of the position switch. */
  private positionExternalPortDummy(node: LNode): void {
    const lc = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
    if (lc === LayerConstraint.FIRST_SEPARATE) {
      // it's a WEST port
      node.getPosition().x = this.minX - ARBITRARY_SPACING;
      const y = this.findYCoordinate(node, (e) => e.getTarget()!.getNode()!);
      if (y !== null) {
        node.getPosition().y = y;
      }
      return;
    }

    if (lc === LayerConstraint.LAST_SEPARATE) {
      // it's a EAST port
      node.getPosition().x = this.maxX + ARBITRARY_SPACING;
      const y = this.findYCoordinate(node, (e) => e.getSource()!.getNode()!);
      if (y !== null) {
        node.getPosition().y = y;
      }
      return;
    }

    const ilc = node.getProperty(InternalProperties.IN_LAYER_CONSTRAINT);
    if (ilc === InLayerConstraint.TOP) {
      this.setNorthSouthX(node);
      node.getPosition().y = this.minY - ARBITRARY_SPACING;
      return;
    }

    if (ilc === InLayerConstraint.BOTTOM) {
      this.setNorthSouthX(node);
      node.getPosition().y = this.maxY + ARBITRARY_SPACING;
    }
  }

  /** The Java's repeated `findNorthSouthPortXCoordinate(node).transform((x) -> node.getPosition().x = x + SPACING)`. */
  private setNorthSouthX(node: LNode): void {
    const x = this.findNorthSouthPortXCoordinate(node);
    if (x !== null) {
      node.getPosition().x = x + ARBITRARY_SPACING;
    }
  }

  /** Java returns inside the loop: only the first connected edge is ever looked at. */
  private findYCoordinate(dummy: LNode, funGetOtherNode: (e: LEdge) => LNode): number | null {
    for (const e of dummy.getConnectedEdges()) {
      const other = funGetOtherNode(e);
      return other.getPosition().y + other.getSize().y / 2;
    }

    return null;
  }

  private findNorthSouthPortXCoordinate(dummy: LNode): number | null {
    const port = dummy.getPorts()[0]!;

    if (port.getOutgoingEdges().length !== 0 && port.getIncomingEdges().length !== 0) {
      throw new IllegalStateException(
        'Interactive layout does not support ' + 'NORTH/SOUTH ports with incoming _and_ outgoing edges.',
      );
    }

    if (port.getOutgoingEdges().length !== 0) {
      // find the minimum position
      let min = Number.POSITIVE_INFINITY;
      for (const e of port.getOutgoingEdges()) {
        const n = e.getTarget()!.getNode()!;
        const margins = n.getProperty(LayeredOptions.MARGINS);
        min = Math.min(min, n.getPosition().x - margins.left);
      }
      return min;
    }

    if (port.getIncomingEdges().length !== 0) {
      // find the maximum value
      let max = Number.NEGATIVE_INFINITY;
      for (const e of port.getIncomingEdges()) {
        const n = e.getSource()!.getNode()!;
        const margins = n.getProperty(LayeredOptions.MARGINS);
        max = Math.max(max, n.getPosition().x + n.getSize().x + margins.right);
      }
      return max;
    }

    // we should never reach here
    return null;
  }
}
