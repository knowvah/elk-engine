// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import type { KVectorChain } from '../../core/math/KVectorChain.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import type { LEdge } from './graph/LEdge.js';
import { InternalProperties } from './options/InternalProperties.js';
import { writeProperties } from './JsonDebugUtilProperties.js';
import { dbl, indentOf, int, type JsonDebugUtilWriter } from './JsonDebugUtilWriter.js';

/*
 * The "edges" writers of `JsonDebugUtil` (`:459-523`). `hashCode()` of `LEdge`, `LPort` and `LNode` is the identity hash
 * (none overrides it), printed through the `identityHashCode` shim (decision G3a).
 */

const hashOf = (o: object): string => int(identityHashCode(o));

/**
 * Writes the given edges as JSON formatted string to the given writer.
 *
 * @param writer the writer to write to.
 * @param edges the edges to write.
 * @param indentation the indentation level to use.
 * @param offset the combined offset of the containing LGraph.
 * @see JsonDebugUtil.java:459
 */
export function writeEdges(
  writer: JsonDebugUtilWriter,
  edges: readonly LEdge[],
  indentation: number,
  offset: KVector,
): void {
  const indent0 = indentOf(indentation);
  const indent1 = indentOf(indentation + 1);
  writer.write(`${indent0}"edges": [`);
  const edgesIterator = edges[Symbol.iterator]();
  let next = edgesIterator.next();
  while (next.done !== true) {
    const edge = next.value;
    next = edgesIterator.next();
    writeEdge(writer, edge, indentation, offset);
    writer.write(`\n${indent1}}`);
    if (next.done !== true) {
      writer.write(',');
    }
  }
  writer.write(`\n${indent0}]`);
}

/** The body of `writeEdges`' loop up to the closing brace (`JsonDebugUtil.java:466-485`). */
function writeEdge(writer: JsonDebugUtilWriter, edge: LEdge, indentation: number, offset: KVector): void {
  const indent1 = indentOf(indentation + 1);
  const indent2 = indentOf(indentation + 2);
  const source = new KVector(edge.getSource()!.getAbsoluteAnchor()).add(offset);
  const target = new KVector(edge.getTarget()!.getAbsoluteAnchor()).add(offset);
  const targetOffset = edge.getProperty(InternalProperties.TARGET_OFFSET);
  if (targetOffset !== null) {
    target.add(targetOffset);
  }
  writer.write(
    `\n${indent1}{\n` +
      `${indent2}"id": "e${hashOf(edge)}",\n` +
      `${indent2}"source": "n${hashOf(edge.getSource()!.getNode()!)}",\n` +
      `${indent2}"target": "n${hashOf(edge.getTarget()!.getNode()!)}",\n` +
      `${indent2}"sourcePort": "p${hashOf(edge.getSource()!)}",\n` +
      `${indent2}"targetPort": "p${hashOf(edge.getTarget()!)}",\n` +
      `${indent2}"sourcePoint": { "x": ${dbl(source.x)}, "y": ${dbl(source.y)} },\n` +
      `${indent2}"targetPoint": { "x": ${dbl(target.x)}, "y": ${dbl(target.y)} },\n`,
  );
  writeBendPoints(writer, edge.getBendPoints(), indentation + 2, offset);
  writer.write(',\n');
  writeProperties(writer, edge.getAllProperties(), indentation + 2);
}

/**
 * Writes the given bendpoints as JSON formatted string to the given writer.
 *
 * @param writer the writer to write to.
 * @param bendPoints the bendpoints to write.
 * @param indentation the indentation level to use.
 * @param offset the combined offset of the containing LGraph.
 * @see JsonDebugUtil.java:505
 */
function writeBendPoints(
  writer: JsonDebugUtilWriter,
  bendPoints: KVectorChain,
  indentation: number,
  offset: KVector,
): void {
  const indent0 = indentOf(indentation);
  const indent1 = indentOf(indentation + 1);
  writer.write(`${indent0}"bendPoints": [`);
  const pointsIterator = bendPoints[Symbol.iterator]();
  let next = pointsIterator.next();
  while (next.done !== true) {
    const point = new KVector(next.value).add(offset);
    next = pointsIterator.next();
    writer.write(`\n${indent1}{ "x": ${dbl(point.x)}, "y": ${dbl(point.y)}}`);
    if (next.done !== true) {
      writer.write(',');
    }
  }
  writer.write(`\n${indent0}]`);
}
