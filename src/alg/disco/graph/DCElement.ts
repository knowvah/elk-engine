// SPDX-License-Identifier: EPL-2.0
import { contains, intersects } from '../../../core/math/ElkMathGeometry.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import type { KVectorChain } from '../../../core/math/KVectorChain.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import type { DCComponent } from './DCComponent.js';
import type { DCExtension } from './DCExtension.js';

/**
 * Represents an element of a {@link DCGraph}. Expresses common graph features like nodes, edges, labels, ... simply as
 * polygons, as this abstraction is sufficient for the compaction of different connected components, whereas short
 * hierarchical edges are represented by {@link DCExtension DCExtensions}.
 *
 * `setComponent` and `intersects` are package-private in Java (used by `DCComponent`); TypeScript has no package
 * visibility, so they are public here and not called from outside `alg.disco/graph`.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
 */
export class DCElement extends MapPropertyHolder {
  /** Path representing this elements shape based on the positions of polygon vertices . */
  private readonly shape: KVectorChain;
  /** The bounding box of the {@link shape}. */
  private readonly bounds: ElkRectangle;
  /** The {@link DCComponent} this element belongs to. */
  private cp: DCComponent | null = null;
  /** Maintained for drawing purposes in the DisCoGraphRenderer of the DisCoDebugView. */
  private coords: number[] | null = null;
  /** Maintained for drawing purposes in the DisCoGraphRenderer of the DisCoDebugView. */
  private parentCoords: KVector | null = null;
  /** List holding all short hierarchical edges to or from the parent node (if this DCElement represents a node). */
  private extensions: DCExtension[] = [];

  /**
   * Constructs a {@link DCElement} from a list of of points representing the vertices of a closed polygonal path.
   * Typically invoked by a class implementing `IGraphTransformer`.
   *
   * @param polyPath Ordered list of points expressing the vertices of a Polygon
   */
  constructor(polyPath: KVectorChain) {
    super();
    this.shape = polyPath;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const v of polyPath) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    this.bounds = new ElkRectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Returns the offset which has to be added to the elements original position to reach its new position after
   * component compactions using a class implementing `ICompactor`.
   *
   * @returns Offset
   * @throws TypeError (Java: NullPointerException) when the element has no component yet
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  getOffset(): KVector {
    // cp is null before DCComponent.addElement ran: the Java dereference throws a NullPointerException, here a TypeError
    return this.cp!.getOffset();
  }

  /**
   * Used for debugging purposes in the DisCoDebugView. Returns the coordinates of the vertices of this element in an
   * easily paintable form.
   *
   * @returns coordinates in the form `(x_0, y_0, x_1, y_1, ..., x_n, y_n)` for points `p_i = (x_i, y_i)` representing a
   *     polygon (a closed path) p_0,p_1,...,p_n,p_0
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  getCoords(): number[] {
    if (this.coords !== null) {
      return this.coords;
    }

    const coords: number[] = new Array<number>(this.shape.size() * 2).fill(0);
    this.coords = coords;
    let i = 0;
    for (const c of this.shape) {
      coords[i] = c.x;
      coords[i + 1] = c.y;
      i += 2;
    }

    return coords;
  }

  /**
   * Adds an {@link DCExtension} to this element.
   *
   * @param extension {@link DCExtension} to add.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  addExtension(extension: DCExtension): void {
    this.extensions.push(extension);
  }

  /**
   * Returns the extensions of this element.
   *
   * @returns list of extensions
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  getExtensions(): DCExtension[] {
    return this.extensions;
  }

  /**
   * Gets the bounding rectangle of this element.
   *
   * @returns The bounding rectangle of this element
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  getBounds(): ElkRectangle {
    return this.bounds;
  }

  /**
   * Sets the coordinates of the surrounding parent of this element, Needed for the debug view, only.
   *
   * @param pCoords Coordinates of the parent of the element
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  setParentCoords(pCoords: KVector | null): void {
    this.parentCoords = pCoords;
  }

  /**
   * Returns the coordinates of the parent of this element for debugging purposes.
   *
   * @returns The coordinates of the surrounding parent of the element. `null` if not set.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  getParentcoords(): KVector | null {
    return this.parentCoords;
  }

  /**
   * Sets the {@link DCComponent} this element belongs to (package-private in Java).
   *
   * @param comp The {@link DCComponent} this element belongs to.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  setComponent(comp: DCComponent): void {
    this.cp = comp;
  }

  /**
   * Tests whether this {@link DCElement} intersects with, or fully contains, a rectangular area given by the four
   * parameters (package-private in Java).
   *
   * @returns true: rectangle intersects with this {@link DCElement}; false: otherwise.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCElement.java
   */
  intersects(rect: ElkRectangle): boolean {
    return intersects(rect, this.shape) || contains(rect, this.shape);
  }
}
