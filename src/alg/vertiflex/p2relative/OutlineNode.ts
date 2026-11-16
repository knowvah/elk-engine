// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../../../java/lang/DoubleToString.js';

/**
 * A point of an outline, kept as a linked list from the top of a subtree to its bottom.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/OutlineNode.java
 */
export class OutlineNode {
  /** X coordinates are maintained as relative coordinates with respect to their ancestors. */
  private relativeX: number = 0;
  /** Y coordinates are maintained as absolute coordinates that stem from the given vertical constraints. */
  private absoluteY: number = 0;
  private next: OutlineNode | null = null;

  constructor(relativeX: number, absoluteY: number, next: OutlineNode | null) {
    this.setRelativeX(relativeX);
    this.setAbsoluteY(absoluteY);
    this.setNext(next);
  }

  /** @returns the absoluteY */
  getAbsoluteY(): number {
    return this.absoluteY;
  }

  /** @param absoluteY the absoluteY to set */
  setAbsoluteY(absoluteY: number): void {
    this.absoluteY = absoluteY;
  }

  /** @returns the relativeX */
  getRelativeX(): number {
    return this.relativeX;
  }

  /** @param relativeX the relativeX to set */
  setRelativeX(relativeX: number): void {
    this.relativeX = relativeX;
  }

  /** @returns the next */
  getNext(): OutlineNode | null {
    return this.next;
  }

  /** @param next the next to set */
  setNext(next: OutlineNode | null): void {
    this.next = next;
  }

  /** @returns a string representation of this objects relative coordinates */
  toString(): string {
    return `X:${DoubleToString.toString(this.relativeX)},  Y:${DoubleToString.toString(this.absoluteY)}`;
  }

  /** @returns if this OutlineNode has no "next" */
  isLast(): boolean {
    return this.next === null;
  }

  /**
   * Print a full outline. The Java recursion is kept (TR7); `System.out.println` is `console.log`.
   */
  printFullOutline(): void {
    console.log(this.toString());
    if (!this.isLast()) {
      this.getNext()!.printFullOutline();
    }
  }
}
