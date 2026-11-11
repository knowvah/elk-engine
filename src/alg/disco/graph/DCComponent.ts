// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import type { DCElement } from './DCElement.js';

/**
 * Represents a connected component of a {@link DCGraph graph}.
 *
 * The constructor and `addElement(s)` are package-private in Java (used by `DCGraph`); TypeScript has no package
 * visibility, so they are public here and not called from outside `alg.disco/graph`.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
 */
export class DCComponent {
  /** Offset from original position, might be set by a class implementing `ICompactor`. */
  private offset: KVector;
  /**
   * All elements that are part of this component (e.g. nodes, edges, ...). AD-10 (FD4): Java's `HashSet` of
   * identity-hashed `DCElement`s; iterated by `update`, `intersects` and the `DCPolyomino` loop. A `Set`, insertion order.
   */
  private shapes: Set<DCElement>;
  /** Indicates whether some fields need to be updated. */
  private changed = true;
  /** dimensions of the bounding rectangle of this component. */
  private bounds: KVector | null = null;
  /** Upper left corner of the bounding rectangle of this component. */
  private minCornerOfBoundingRectangle: KVector | null = null;
  /** For debugging purposes only. */
  private id = -1;

  /**
   * Creates a new component with an offset of (0,0) and and no associated {@link DCElement DCElements}.
   *
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  constructor() {
    this.offset = new KVector(0, 0);
    this.shapes = new Set<DCElement>();
  }

  /**
   * Sets the offset of the {@link DCComponent}.
   *
   * @param offset New offset to add to the position of this {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  setOffset(offset: KVector): void {
    this.changed = true;
    this.offset = offset;
  }

  /**
   * Gets the offset of the {@link DCComponent}.
   *
   * @returns Offset to add to the position of this {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  getOffset(): KVector {
    return this.offset;
  }

  /**
   * Gets all {@link DCElement DCElements} associated with this {@link DCComponent}.
   *
   * @returns All {@link DCElement DCElements} of this {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  getElements(): Set<DCElement> {
    return this.shapes;
  }

  /**
   * Gets dimensions of the bounding rectangle of this {@link DCComponent}.
   *
   * @returns The bounding rectangle of this component
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  getDimensionsOfBoundingRectangle(): KVector {
    if (this.changed) {
      this.update();
    }
    return this.bounds!;
  }

  /**
   * Gets the position of the upper left corner of this {@link DCComponent}.
   *
   * @returns The position of the upper left corner of this component
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  getMinCorner(): KVector {
    if (this.changed) {
      this.update();
    }
    return this.minCornerOfBoundingRectangle!;
  }

  /**
   * Tests whether this {@link DCComponent} intersects with a rectangular area given by the four parameters of this
   * method.
   *
   * @returns true: rectangle intersects with this {@link DCComponent}; false: otherwise.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  intersects(rect: ElkRectangle): boolean {
    for (const elem of this.shapes) {
      if (elem.intersects(rect)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Adds a {@link DCElement} to this {@link DCComponent}.
   *
   * @param element The element to add to this {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  addElement(element: DCElement): void {
    this.changed = true;
    this.shapes.add(element);
    element.setComponent(this);
  }

  /**
   * Adds {@link DCElement DCElements} to this {@link DCComponent}.
   *
   * @param elements The elements to add to this {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  addElements(elements: Iterable<DCElement>): void {
    for (const elem of elements) {
      this.addElement(elem);
    }
  }

  /**
   * Updates the position and the dimensions of the bounding rectangle of this {@link DCComponent}. To be called
   * whenever the component has been modified and properties of the bounding rectangle are being requested.
   * `minPos`/`maxPos` are declared per branch (Java declares them once before the `if`) to stay within 30 NLOC.
   *
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  private update(): void {
    this.changed = false;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const elem of this.shapes) {
      const elemBounds = elem.getBounds();

      minX = Math.min(minX, elemBounds.x);
      maxX = Math.max(maxX, elemBounds.x + elemBounds.width);
      minY = Math.min(minY, elemBounds.y);
      maxY = Math.max(maxY, elemBounds.y + elemBounds.height);

      for (const ext of elem.getExtensions()) {
        const dir = ext.getDirection();

        if (dir.isHorizontal()) {
          const minPos = elemBounds.y + ext.getOffset().y;
          const maxPos = minPos + ext.getWidth();
          minY = Math.min(minY, minPos);
          maxY = Math.max(maxY, maxPos);
        } else {
          const minPos = elemBounds.x + ext.getOffset().x;
          const maxPos = minPos + ext.getWidth();
          minX = Math.min(minX, minPos);
          maxX = Math.max(maxX, maxPos);
        }
      }
    }

    this.bounds = new KVector(maxX - minX, maxY - minY);
    this.minCornerOfBoundingRectangle = new KVector(minX + this.offset.x, minY + this.offset.y);
  }

  /**
   * Gets the integer id of this {@link DCComponent}.
   *
   * @returns the id
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  getId(): number {
    return this.id;
  }

  /**
   * Sets the integer id of this {@link DCComponent}.
   *
   * @param id the id to set
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCComponent.java
   */
  setId(id: number): void {
    this.id = id;
  }
}
