// SPDX-License-Identifier: EPL-2.0

/**
 * An iterator that can skip the children of the element it last returned. Java's `TreeIterator<E>
 * extends Iterator<E>`; here it extends the JS `Iterator<E>` and adds Java's `hasNext`.
 *
 * @see org.eclipse.emf.common.util.TreeIterator
 */
export interface TreeIterator<E> extends Iterator<E> {
  /** Whether {@link next} would yield another element. */
  hasNext(): boolean;

  /** Skips the children of the element most recently returned; callable once per element. */
  prune(): void;
}
