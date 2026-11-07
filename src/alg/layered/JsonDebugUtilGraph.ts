// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import type { LEdge } from './graph/LEdge.js';
import type { LGraph } from './graph/LGraph.js';
import { LNode } from './graph/LNode.js';
import { NodeType } from './graph/LNodeNodeType.js';
import { InternalProperties } from './options/InternalProperties.js';
import { writeEdges } from './JsonDebugUtilEdges.js';
import { writePorts, writeProperties } from './JsonDebugUtilProperties.js';
import {
  beginChildNodeList,
  dbl,
  endChildNodeList,
  indentOf,
  int,
  type JsonDebugUtilWriter,
} from './JsonDebugUtilWriter.js';

/*
 * The "graph, layer and node" writers of `JsonDebugUtil` (`:269-457`, `:626-653`). `writeLgraph` and `writeNodes` are
 * mutually recursive for nested graphs, so they live in one section file. Edges are collected as plain arrays in place of
 * `Lists.newLinkedList()` (only appended to and iterated: an `ArrayList` would do in Java, AD-10 is not concerned).
 */

/**
 * Writes the lgraph to the given writer.
 *
 * @param lgraph the graph to begin
 * @param writer the writer to write to.
 * @param indentation the indentation level to use.
 * @see JsonDebugUtil.java:290
 */
export function writeLgraph(lgraph: LGraph, writer: JsonDebugUtilWriter, indentation: number): void {
  const offset = new KVector(lgraph.getOffset()).add(lgraph.getPadding().left, lgraph.getPadding().top);

  const edges: LEdge[] = [];
  beginChildNodeList(writer, indentation);

  // Write layerless nodes and collect edges
  edges.push(...writeLayer(writer, -1, lgraph.getLayerlessNodes(), indentation + 1, offset));

  // Go through the layers
  let layerNumber = -1;
  const layersIterator = lgraph[Symbol.iterator]();
  let next = layersIterator.next();
  if (lgraph.getLayerlessNodes().length > 0 && next.done !== true) {
    writer.write(',');
  }
  while (next.done !== true) {
    const layer = next.value;
    next = layersIterator.next();
    layerNumber++;

    // Write the nodes and collect edges
    edges.push(...writeLayer(writer, layerNumber, layer.getNodes(), indentation + 1, offset));

    if (next.done !== true) {
      writer.write(',');
    }
  }

  endChildNodeList(writer, indentation);

  writeEdges(writer, edges, indentation, offset);
}

/**
 * Writes the given list of nodes and collects their edges.
 *
 * @param writer writer to write to.
 * @param layerNumber the layer number. `-1` for layerless nodes.
 * @param nodes the nodes in the layer.
 * @param indentation the indentation level to use.
 * @param offset the combined offset of the containing LGraph.
 * @return list of edges that need to be added to the graph.
 * @see JsonDebugUtil.java:376
 */
function writeLayer(
  writer: JsonDebugUtilWriter,
  layerNumber: number,
  nodes: readonly LNode[],
  indentation: number,
  offset: KVector,
): LEdge[] {
  if (nodes.length === 0) {
    return [];
  }

  writeNodes(writer, nodes, indentation, layerNumber, offset);

  const edges: LEdge[] = [];

  // Collect the edges
  for (const node of nodes) {
    // Go through all edges and collect those that have this node as their source
    for (const port of node.getPorts()) {
      edges.push(...port.getOutgoingEdges());
    }
  }

  return edges;
}

/**
 * Writes the nodes edges as JSON formatted string to the given writer.
 *
 * @param writer the writer to write to.
 * @param nodes the nodes to write.
 * @param indentation the indentation level to use.
 * @param layerNumber the layer number. `-1` for layerless nodes.
 * @param offset the combined offset of the containing LGraph.
 * @see JsonDebugUtil.java:413
 */
function writeNodes(
  writer: JsonDebugUtilWriter,
  nodes: readonly LNode[],
  indentation: number,
  layerNumber: number,
  offset: KVector,
): void {
  const indent0 = indentOf(indentation);
  let nodeNumber = -1;
  const nodesIterator = nodes[Symbol.iterator]();
  let next = nodesIterator.next();
  while (next.done !== true) {
    nodeNumber++;
    const node = next.value;
    next = nodesIterator.next();
    writer.write(nodeHeader(node, layerNumber, nodeNumber, indentation, offset));
    writeProperties(writer, node.getAllProperties(), indentation + 1);
    writer.write(',\n');
    writePorts(writer, node.getPorts(), indentation + 1);
    const nestedGraph = node.getNestedGraph();
    if (nestedGraph !== null) {
      writeLgraph(nestedGraph, writer, indentation + 1);
    }
    writer.write(`\n${indent0}}`);
    if (next.done !== true) {
      writer.write(',');
    }
  }
}

/** The text `writeNodes` writes before the node's properties (`JsonDebugUtil.java:420-429`). */
function nodeHeader(
  node: LNode,
  layerNumber: number,
  nodeNumber: number,
  indentation: number,
  offset: KVector,
): string {
  const indent0 = indentOf(indentation);
  const indent1 = indentOf(indentation + 1);
  const position = new KVector(node.getPosition()).add(offset);
  return (
    `\n${indent0}{\n` +
    `${indent1}"id": "n${int(identityHashCode(node))}",\n` +
    `${indent1}"labels": [ { "text": "${getNodeName(node, layerNumber, nodeNumber)}" } ],\n` +
    `${indent1}"width": ${dbl(node.getSize().x)},\n` +
    `${indent1}"height": ${dbl(node.getSize().y)},\n` +
    `${indent1}"x": ${dbl(position.x)},\n` +
    `${indent1}"y": ${dbl(position.y)},\n`
  );
}

/**
 * Returns the name of the node. The layer and index in the layer is added in parentheses. If its a dummy node, it get
 * a suffix `DUMMY: <NodeType>`.
 *
 * @param node the node whose name to get.
 * @param layer the layer of the node.
 * @param index the index inside the layer.
 * @return the nodes name.
 * @see JsonDebugUtil.java:626
 */
export function getNodeName(node: LNode, layer: number, index: number): string {
  let name = '';
  const designation = node.getDesignation();
  if (node.getType() === NodeType.NORMAL) {
    // Normal nodes display their name, if any
    if (designation !== null) {
      name = designation;
    }
    name += ` (${int(layer)},${int(index)})`;
  } else {
    // Dummy nodes show their name (if set), or their node ID
    name = designation !== null ? designation : `n_${int(node.id)}`;
    if (node.getType() === NodeType.NORTH_SOUTH_PORT) {
      const origin = node.getProperty(InternalProperties.ORIGIN);
      if (origin instanceof LNode) {
        name += `(${origin.toString()})`;
      }
    }
    name += ` (${int(layer)},${int(index)})`;
    name += ` [ DUMMY: ${node.getType().name()} ]`;
  }
  return name.replaceAll('"', '\\"').replaceAll('\n', '\\n');
}
