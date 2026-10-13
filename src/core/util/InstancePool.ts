// SPDX-License-Identifier: EPL-2.0
import { LinkedList } from '../../java/util/LinkedList.js';
import type { IFactory } from './IFactory.js';

/**
 * A pool for class instances. The pool can hold a configurable number of instances of the class. Note
 * that the number of instances created can well exceed the capacity of this pool. The capacity only
 * influences how many of those instances can be kept for later reuse.
 *
 * The Java `synchronized (lock)` blocks are dropped: JavaScript runs the instance methods to
 * completion on one thread.
 *
 * @param <T> the type of instances that are held by this pool
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/InstancePool.java
 */
export class InstancePool<T> {
  /** an infinite amount of instances. */
  static readonly INFINITE: number = -1;

  /** the instance factory to use for this pool. */
  private readonly factory: IFactory<T>;
  /** the list of currently held instances. */
  private readonly instances: LinkedList<T> = new LinkedList<T>();
  /** the configured instance limit. */
  private readonly limit: number;

  /**
   * Create an instance pool with the given capacity; covers both Java constructors, the
   * one-argument form having an infinite capacity.
   *
   * @param factory the instance factory
   * @param limit the maximal number of instances that shall be kept in the pool
   */
  constructor(factory: IFactory<T>, limit: number = InstancePool.INFINITE) {
    this.factory = factory;
    this.limit = limit;
  }

  /**
   * Fetch an instance from the pool. If no instance is available, a new one is created.
   *
   * @returns a class instance
   */
  fetch(): T {
    if (this.instances.isEmpty()) {
      return this.factory.create();
    }
    return this.instances.removeFirst();
  }

  /**
   * Release an instance into the pool to be used again unless the pool's capacity is already reached.
   * Only instances that are still usable may be released.
   *
   * @param obj a class instance
   */
  release(obj: T): void {
    if (this.limit < 0 || this.instances.size() < this.limit) {
      this.instances.addLast(obj);
    } else {
      this.factory.destroy(obj);
    }
  }

  /** Clear the instance pool by disposing all instances that are currently held. */
  clear(): void {
    for (const obj of this.instances) {
      this.factory.destroy(obj);
    }
    this.instances.clear();
  }
}
