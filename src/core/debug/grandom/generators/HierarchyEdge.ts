// SPDX-License-Identifier: EPL-2.0

/**
 * A helper class for creating hierarchical graphs.
 *
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export class HierarchyEdge {
  /** the head */
  private head: number;
  /** the tail */
  private tail: number;
  /** the id */
  private id: number;
  /** the next edge (Java default `null`) */
  private next: HierarchyEdge | null = null;

  /**
   * Constructs a HierarchyEdge.
   *
   * @param head the head
   * @param tail the tail
   * @param id the id
   */
  constructor(head: number, tail: number, id: number) {
    this.head = head;
    this.tail = tail;
    this.id = id;
  }

  /** Returns the head. */
  getHead(): number {
    return this.head;
  }

  /** Returns the tail. */
  getTail(): number {
    return this.tail;
  }

  /** Returns the id. */
  getId(): number {
    return this.id;
  }

  /** Returns the next edge. */
  getNext(): HierarchyEdge | null {
    return this.next;
  }

  /** Sets the next edge. */
  setNext(next: HierarchyEdge | null): void {
    this.next = next;
  }
}
