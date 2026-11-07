// SPDX-License-Identifier: EPL-2.0
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import type { LGraph } from './graph/LGraph.js';
import { LNode } from './graph/LNode.js';
import { NodeType } from './graph/LNodeNodeType.js';
import { InternalProperties } from './options/InternalProperties.js';
import type { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';
import type { HyperEdgeSegment } from './p5edges/orthogonal/HyperEdgeSegment.js';

/** The Java `String.replace("\"", "\\\"")`. */
const escapeQuotes = (text: string): string => text.replaceAll('"', '\\"');

/**
 * A utility class for debugging of ELK Layered: debug graphs in DOT format. Java's `StringWriter` is a string
 * accumulator here. Node ids are Java `hashCode()` values: the identity hash (`identityHashCode`, decision G3a) for
 * classes without a `hashCode` override (`LNode`), the class's own `hashCode()` for `LinearSegment` and
 * `HyperEdgeSegment`, printed in decimal as Java's string concatenation of an `int` does.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/DotDebugUtil.java
 */
export class DotDebugUtil {
  private constructor() {}

  /**
   * Output a representation of the given graph in dot format. The following conventions are used: standard nodes are
   * drawn as rectangles, dummy nodes as ellipses, and nodes have a color that depends on their node type.
   *
   * @param lgraph the layered graph
   * @return debug graph in DOT format.
   * @see DotDebugUtil.java:57
   */
  static createDebugGraph(lgraph: LGraph): string {
    let writer = '';

    // Begin the digraph
    writer += 'digraph {\n';

    // Digraph options
    writer += '    rankdir=LR;\n';

    // Write layerless nodes and edges
    writer += DotDebugUtil.writeLayer(-1, lgraph.getLayerlessNodes());

    // Go through the layers
    let layerNumber = -1;
    for (const layer of lgraph) {
      layerNumber++;

      // Write the nodes and edges
      writer += DotDebugUtil.writeLayer(layerNumber, layer.getNodes());
    }

    // Close the digraph. And the writer.
    writer += '}\n';

    return writer;
  }

  /**
   * Writes a debug graph for the given linear segments and their dependencies. Java's overload
   * `createDebugGraph(LGraph, List<LinearSegment>, List<List<LinearSegment>>)`.
   *
   * @param _layeredGraph the layered graph (unused, as in Java).
   * @param segmentList the list of linear segments.
   * @param outgoingList the list of successors for each linear segment.
   * @return segments graph in DOT format.
   * @see DotDebugUtil.java:90
   */
  static createDebugGraphSegments(
    _layeredGraph: LGraph,
    segmentList: readonly LinearSegment[],
    outgoingList: readonly (readonly LinearSegment[])[],
  ): string {
    let writer = '';

    writer += 'digraph {\n';

    // Both Java iterators advance in lockstep over the two lists.
    for (const [index, segment] of segmentList.entries()) {
      const successors = outgoingList[index]!;

      writer += `  ${String(segment.hashCode())}[label="${segment.toString()}"]\n`;

      for (const successor of successors) {
        writer += `  ${String(segment.hashCode())}->${String(successor.hashCode())}\n`;
      }
    }

    writer += '}\n';

    return writer;
  }

  /**
   * Writes a debug graph for the given list of hypernodes. Java's overload
   * `createDebugGraph(LGraph, List<HyperEdgeSegment>)`.
   *
   * @param _layeredGraph the layered graph (unused, as in Java)
   * @param hypernodes a list of hypernodes
   * @return hypernodes graph in DOT format.
   * @see DotDebugUtil.java:128
   */
  static createDebugGraphHyperedges(_layeredGraph: LGraph, hypernodes: readonly HyperEdgeSegment[]): string {
    let writer = '';

    writer += 'digraph {\n';

    // Write hypernode information
    for (const hypernode of hypernodes) {
      writer += `  ${String(hypernode.hashCode())}[label="${hypernode.toString()}"]\n`;
    }

    // Write dependency information
    for (const hypernode of hypernodes) {
      for (const dependency of hypernode.getOutgoingSegmentDependencies()) {
        writer +=
          `  ${String(hypernode.hashCode())}->${String(dependency.getTarget()!.hashCode())}` +
          `[label="${dependency.getType().name()} (${String(dependency.getWeight())})"]\n`;
      }
    }

    writer += '}\n';

    return writer;
  }

  /**
   * Writes the given list of nodes and their edges.
   *
   * @param layerNumber the layer number. `-1` for layerless nodes.
   * @param nodes the nodes in the layer.
   * @return the text the Java method writes to its writer
   * @see DotDebugUtil.java:159
   */
  private static writeLayer(layerNumber: number, nodes: readonly LNode[]): string {
    if (nodes.length === 0) {
      return '';
    }
    let writer = '';

    // Go through the layer's nodes
    let nodeNumber = -1;
    for (const node of nodes) {
      nodeNumber++;

      // The node's name in the output is its hash code (unique!)
      writer += `        ${String(identityHashCode(node))}`;

      // Options time!
      let options = DotDebugUtil.nodeLabel(node);
      options += `(${String(layerNumber)},${String(nodeNumber)})",`;

      // Node type
      if (node.getType() === NodeType.NORMAL) {
        options += 'shape=box,';
      } else {
        options += 'style="rounded,filled",';

        // `NodeType.getColor()` never returns null here (the Java guard `color != null` cannot fail)
        options += `color="${node.getType().getColor()}",`;
      }

      // Print options, if any
      options = options.slice(0, -1);
      if (options.length > 0) {
        writer += `[${options}]`;
      }

      // End the node line
      writer += ';\n';
    }

    // Write the edges
    writer += DotDebugUtil.writeLayerEdges(nodes);
    return writer;
  }

  /** The edge loop of `writeLayer` (`DotDebugUtil.java:215-229`). */
  private static writeLayerEdges(nodes: readonly LNode[]): string {
    let writer = '';
    for (const node of nodes) {
      // Go through all edges and output those that have this node as their source
      for (const port of node.getPorts()) {
        for (const edge of port.getOutgoingEdges()) {
          writer += `    ${String(identityHashCode(node))} -> ${String(identityHashCode(edge.getTarget()!.getNode()!))}`;
          writer += ';\n';
        }
      }
    }
    return writer;
  }

  /** The `label="` part of `writeLayer`'s options (`DotDebugUtil.java:178-199`). */
  private static nodeLabel(node: LNode): string {
    let options = 'label="';
    const designation = node.getDesignation();
    if (node.getType() === NodeType.NORMAL) {
      // Normal nodes display their name, if any
      if (designation !== null) {
        options += `${escapeQuotes(designation)} `;
      }
    } else {
      // Dummy nodes show their name (if set), or their node ID
      if (designation !== null) {
        options += `${escapeQuotes(designation)} `;
      } else {
        options += `n_${String(node.id)} `;
      }
      if (node.getType() === NodeType.NORTH_SOUTH_PORT) {
        const origin = node.getProperty(InternalProperties.ORIGIN);
        if (origin instanceof LNode) {
          options += `(${origin.toString()})`;
        }
      }
    }
    return options;
  }
}
