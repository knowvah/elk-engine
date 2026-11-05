// SPDX-License-Identifier: EPL-2.0
// `GraphTestUtils.haveOverlaps` (alg.test `GraphTestUtils.java`): whether any two shapes of a list overlap, on absolute
// rectangles. `Rectangle2D.intersects` is implemented from its Javadoc (`Shape.intersects(Rectangle2D)`: the interiors
// intersect), so an empty rectangle (width or height <= 0) has no interior and intersects nothing, and touching edges do
// not intersect.
import { ElkUtil } from '../../src/core/util/ElkUtil.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function isEmpty(rect: Rect): boolean {
  return rect.width <= 0 || rect.height <= 0;
}

/** `Rectangle2D.intersects(Rectangle2D)`: the interiors of two rectangles intersect. */
function intersects(first: Rect, second: Rect): boolean {
  if (isEmpty(first) || isEmpty(second)) {
    return false;
  }
  return (
    second.x + second.width > first.x &&
    second.y + second.height > first.y &&
    second.x < first.x + first.width &&
    second.y < first.y + first.height
  );
}

/** Returns whether any of the shapes in the list overlap. */
export function haveOverlaps(shapes: readonly ElkShape[]): boolean {
  // Obtain absolute rectangles for us to do the comparisons on
  const shapeRects: Rect[] = shapes.map((shape) => {
    const pos = ElkUtil.absolutePosition(shape)!;
    return { x: pos.x, y: pos.y, width: shape.getWidth(), height: shape.getHeight() };
  });

  for (let first = 0; first < shapeRects.length; first++) {
    for (let second = first + 1; second < shapeRects.length; second++) {
      if (intersects(shapeRects[first]!, shapeRects[second]!)) {
        return true;
      }
    }
  }

  return false;
}
