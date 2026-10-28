// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../src/core/options/PortSide.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import type { LShape } from '../../src/alg/layered/graph/LShape.js';
import { addNode } from './lgraph-builders.js';

/** Scenario builders for the oracle-site tests: they only set coordinates, they compute nothing. */

/** Sets position and size of a shape in one call. */
export function place<T extends LShape>(shape: T, x: number, y: number, width: number, height: number): T {
  shape.getPosition().x = x;
  shape.getPosition().y = y;
  shape.getSize().x = width;
  shape.getSize().y = height;
  return shape;
}

/** A layerless node of `width` x `height` at (x, y). */
export function nodeAt(graph: LGraph, x: number, y: number, width: number, height: number): LNode {
  return place(addNode(graph), x, y, width, height);
}

/** A port of `width` x `height` at (x, y), attached to `node` and then given `side`. */
export function portAt(node: LNode, side: PortSide, x: number, y: number, width = 4, height = 4): LPort {
  const port = place(new LPort(), x, y, width, height);
  port.setNode(node);
  port.setSide(side);
  return port;
}

/** A label with text, position and size, not yet attached. */
export function labelAt(text: string, x: number, y: number, width: number, height: number): LLabel {
  return place(new LLabel(text), x, y, width, height);
}

/** The `[x, y]` pair of a vector-like. */
export function xy(vector: { x: number; y: number }): [number, number] {
  return [vector.x, vector.y];
}
