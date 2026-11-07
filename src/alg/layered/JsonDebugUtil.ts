// SPDX-License-Identifier: EPL-2.0
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import type { LGraph } from './graph/LGraph.js';
import { writeLgraph } from './JsonDebugUtilGraph.js';
import { writeProperties } from './JsonDebugUtilProperties.js';
import { calculateGraphSize } from './JsonDebugUtilSize.js';
import {
  beginChildNodeList,
  dbl,
  endChildNodeList,
  endGraph,
  INDENT,
  indentOf,
  int,
  JsonDebugUtilWriter,
} from './JsonDebugUtilWriter.js';
import type { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';
import type { HyperEdgeSegment } from './p5edges/orthogonal/HyperEdgeSegment.js';

/**
 * A utility class for debugging of ELK Layered: debug graphs in JSON format. The Java output is not valid JSON
 * (`},,` occurs) and is reproduced byte for byte. Java's `StringWriter` is a string accumulator
 * (`JsonDebugUtilWriter`); the sections of the class are the prefixed files `JsonDebugUtilSize` (graph size),
 * `JsonDebugUtilGraph` (graph, layer and node writers), `JsonDebugUtilEdges`, `JsonDebugUtilProperties` (ports and
 * properties) and `JsonDebugUtilJavaString` (`Object.toString()`). Identity hashes print through the
 * `identityHashCode` shim (decision G3a).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/JsonDebugUtil.java
 */
export class JsonDebugUtil {
  private constructor() {}

  /**
   * Output a representation of the given graph in JSON format.
   *
   * @param lgraph the layered graph
   * @return graph in JSON format.
   * @see JsonDebugUtil.java:60
   */
  static createDebugGraph(lgraph: LGraph): string {
    const writer = new JsonDebugUtilWriter();

    JsonDebugUtil.beginGraph(writer, lgraph);
    writeLgraph(lgraph, writer, 1);
    endGraph(writer);

    return writer.toString();
  }

  /**
   * Writes a debug graph for the given linear segments and their dependencies. Java's overload
   * `createDebugGraph(LGraph, List<LinearSegment>, List<List<LinearSegment>>)`.
   *
   * @param layeredGraph the layered graph.
   * @param segmentList the list of linear segments.
   * @param outgoingList the list of successors for each linear segment.
   * @return linear segment graph in JSON format.
   * @see JsonDebugUtil.java:82
   */
  static createDebugGraphSegments(
    layeredGraph: LGraph,
    segmentList: readonly LinearSegment[],
    outgoingList: readonly (readonly LinearSegment[])[],
  ): string {
    const writer = new JsonDebugUtilWriter();

    JsonDebugUtil.beginGraph(writer, layeredGraph);
    beginChildNodeList(writer, 1);

    const indent1 = indentOf(2);
    let edgeId = 0;

    let edges = '';

    // Both Java iterators advance in lockstep over the two lists.
    for (const [index, segment] of segmentList.entries()) {
      writer.write(JsonDebugUtil.segmentNode(segment.hashCode(), segment.toString()));
      if (index + 1 < segmentList.length) {
        writer.write(',');
      }

      for (const successor of outgoingList[index]!) {
        edges += JsonDebugUtil.segmentEdge(edgeId++, segment.hashCode(), successor.hashCode(), true);
      }
    }

    endChildNodeList(writer, 1);

    if (edges.length > 0) {
      edges = edges.slice(0, -1);
    }
    writer.write(`${INDENT}"edges": [${edges}\n${indent1}]`);

    endGraph(writer);

    return writer.toString();
  }

  /**
   * Writes a debug graph for the given list of hypernodes. Java's overload
   * `createDebugGraph(LGraph, List<HyperEdgeSegment>)`.
   *
   * @param layeredGraph the layered graph
   * @param hypernodes a list of hypernodes
   * @return hypernode graph in JSON format.
   * @see JsonDebugUtil.java:145
   */
  static createDebugGraphHyperedges(layeredGraph: LGraph, hypernodes: readonly HyperEdgeSegment[]): string {
    const writer = new JsonDebugUtilWriter();

    JsonDebugUtil.beginGraph(writer, layeredGraph);
    beginChildNodeList(writer, 1);

    const indent1 = indentOf(2);
    let edgeId = 0;

    let edges = '';

    for (const [index, hypernode] of hypernodes.entries()) {
      // `System.identityHashCode`, not `hashCode()`: HyperEdgeSegment overrides the latter
      writer.write(JsonDebugUtil.segmentNode(identityHashCode(hypernode), hypernode.toString()));
      if (index + 1 < hypernodes.length) {
        writer.write(',');
      }

      for (const dependency of hypernode.getOutgoingSegmentDependencies()) {
        edges += JsonDebugUtil.segmentEdge(
          edgeId++,
          identityHashCode(hypernode),
          identityHashCode(dependency.getTarget()!),
          false,
        );
      }
    }

    endChildNodeList(writer, 1);

    if (edges.length > 0) {
      edges = edges.slice(0, -1);
    }
    writer.write(`${INDENT}"edges": [${edges}\n${INDENT}]`);

    endGraph(writer);

    return writer.toString();
  }

  /**
   * The text both edge loops write per edge (`JsonDebugUtil.java:116-121` and `:178-184`): the segment overload's target
   * line ends with a comma (`trailingComma`), the hypernode overload's does not (as in the Java).
   */
  private static segmentEdge(edgeId: number, sourceId: number, targetId: number, trailingComma: boolean): string {
    const indent1 = indentOf(2);
    const indent2 = indentOf(3);
    return (
      `\n${indent1}{\n` +
      `${indent2}"id": "e${int(edgeId)}",\n` +
      `${indent2}"source": "n${int(sourceId)}",\n` +
      `${indent2}"target": "n${int(targetId)}"${trailingComma ? ',' : ''}\n` +
      `${indent1}},`
    );
  }

  /**
   * The text both node loops of the segment and hypernode overloads write per node (`JsonDebugUtil.java:100-106` and
   * `:163-169`, identical but for the id): the Java code repeats it inline.
   */
  private static segmentNode(id: number, text: string): string {
    const indent1 = indentOf(2);
    const indent2 = indentOf(3);
    return (
      `\n${indent1}{\n` +
      `${indent2}"id": "n${int(id)}",\n` +
      `${indent2}"labels": [ { "text": "${text}" } ],\n` +
      `${indent2}"width": 50,\n` +
      `${indent2}"height": 25\n` +
      `${indent1}}`
    );
  }

  /**
   * Begins a new graph by writing the root node, the graphs properties and the start of the child node list to the
   * writer.
   *
   * @param writer the writer to write to.
   * @param lgraph the graph to begin
   * @see JsonDebugUtil.java:269
   */
  private static beginGraph(writer: JsonDebugUtilWriter, lgraph: LGraph): void {
    const graphSize = calculateGraphSize(lgraph);
    writer.write(
      `{\n` +
        `${INDENT}"id": "root",\n` +
        `${INDENT}"x": ${dbl(graphSize.getFirst().x)},\n` +
        `${INDENT}"y": ${dbl(graphSize.getFirst().y)},\n` +
        `${INDENT}"width": ${dbl(graphSize.getLast().x)},\n` +
        `${INDENT}"height": ${dbl(graphSize.getLast().y)},\n`,
    );
    writeProperties(writer, lgraph.getAllProperties(), 1);
  }
}
