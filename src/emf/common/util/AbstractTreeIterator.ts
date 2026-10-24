// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { TreeIterator } from './TreeIterator.js';

/**
 * A JS iterator with Java's `hasNext`/`remove`: one element of lookahead. `remove` is delegated to
 * the wrapped iterator when it has one (JS iterators normally do not).
 */
export class ChildIterator<E> {
  readonly #delegate: Iterator<E>;
  #peeked: IteratorResult<E> | null = null;

  constructor(delegate: Iterator<E>) {
    this.#delegate = delegate;
  }

  /** Uses the delegate's own `hasNext` when it has one, so a peek never disturbs its `remove`. */
  hasNext(): boolean {
    const delegate = this.#delegate as { hasNext?: () => boolean };
    if (typeof delegate.hasNext === 'function') {
      return delegate.hasNext();
    }
    this.#peeked ??= this.#delegate.next();
    return this.#peeked.done !== true;
  }

  next(): E {
    if (!this.hasNext()) {
      throw new NoSuchElementException();
    }
    if (this.#peeked === null) {
      return this.#delegate.next().value as E;
    }
    const result = this.#peeked as IteratorResult<E, unknown>;
    this.#peeked = null;
    return result.value as E;
  }

  remove(): void {
    const delegate = this.#delegate as { remove?: () => void };
    if (typeof delegate.remove !== 'function') {
      throw new UnsupportedOperationException('remove');
    }
    delegate.remove();
  }
}

/**
 * A tree iterator that uses a stack of child iterators. The Java class extends `BasicEList` and uses
 * the list as the stack; here the stack is a private array plus a `#started` flag standing in for
 * Java's `data == null` (the stack has never been pushed to). Java's `next()` is `nextElement()`
 * because `next()` is the JS iterator protocol. EMF is EPL-2.0 (decision D1); source:
 * org.eclipse.emf.common 2.31.0 sources jar.
 *
 * @see org.eclipse.emf.common.util.AbstractTreeIterator
 */
export abstract class AbstractTreeIterator<E> implements TreeIterator<E>, Iterable<E> {
  protected includeRoot: boolean;
  protected object: unknown;
  protected nextPruneIterator: ChildIterator<E> | null = null;
  protected nextRemoveIterator: ChildIterator<E> | null = null;

  readonly #stack: (ChildIterator<E> | null)[] = [];
  #started = false;

  /** Java's `(E object)` constructor (includeRoot true) and `(Object, boolean)` constructor. */
  constructor(object: unknown, includeRoot = true) {
    this.object = object;
    this.includeRoot = includeRoot;
  }

  /** @see org.eclipse.emf.common.util.AbstractTreeIterator#getChildren(java.lang.Object) */
  protected abstract getChildren(object: unknown): Iterator<E>;

  #wrapChildren(object: unknown): ChildIterator<E> {
    return new ChildIterator(this.getChildren(object));
  }

  #push(iterator: ChildIterator<E>): void {
    this.#started = true;
    this.#stack.push(iterator);
  }

  #top(): ChildIterator<E> {
    return this.#stack[this.#stack.length - 1] as ChildIterator<E>;
  }

  hasNext(): boolean {
    if (!this.#started && !this.includeRoot) {
      return this.#hasAnyChildren();
    }
    return this.#hasMoreChildren();
  }

  #hasAnyChildren(): boolean {
    // Java declares a local `nextPruneIterator` here that shadows the field; the field stays unset.
    const nextPruneIterator = this.#wrapChildren(this.object);
    this.#push(nextPruneIterator);
    return nextPruneIterator.hasNext();
  }

  #hasMoreChildren(): boolean {
    // The stack is not created until the root has been returned by next once.
    return !this.#started || (this.#stack.length > 0 && this.#top().hasNext());
  }

  /** Java's `next()`. */
  nextElement(): E {
    if (!this.#started) {
      this.nextPruneIterator = this.#wrapChildren(this.object);
      this.#push(this.nextPruneIterator);
      if (this.includeRoot) {
        return this.object as E;
      }
    }
    if (this.#stack.length === 0) {
      throw new NoSuchElementException();
    }
    let currentIterator = this.#top();
    const result = currentIterator.next();
    this.nextRemoveIterator = currentIterator;

    const iterator = this.#wrapChildren(result);
    if (iterator.hasNext()) {
      this.nextPruneIterator = iterator;
      this.#push(iterator);
    } else {
      this.nextPruneIterator = null;
      while (!currentIterator.hasNext()) {
        this.#stack.pop();
        if (this.#stack.length === 0) {
          break;
        }
        currentIterator = this.#top();
      }
    }
    return result;
  }

  /** The JS iterator protocol over {@link hasNext} and {@link nextElement}. */
  next(): IteratorResult<E> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }
    return { done: false, value: this.nextElement() };
  }

  [Symbol.iterator](): this {
    return this;
  }

  remove(): void {
    if (this.nextRemoveIterator === null) {
      throw new IllegalStateException('There is no valid object to remove.');
    }
    this.nextRemoveIterator.remove();
  }

  prune(): void {
    if (this.nextPruneIterator !== null) {
      if (this.#stack.length > 0 && this.#top() === this.nextPruneIterator) {
        this.#stack.pop();
        while (this.#stack.length > 0 && !this.#top().hasNext()) {
          this.#stack.pop();
        }
      }
      // You can only prune once.
      this.nextPruneIterator = null;
    }
  }
}
