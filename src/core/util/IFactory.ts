// SPDX-License-Identifier: EPL-2.0

/**
 * Interface for factories of class instances.
 *
 * @param <T> type of instances that are created by this factory
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IFactory.java
 */
export interface IFactory<T> {
  /**
   * Create an instance of the type that is managed by this factory.
   *
   * @returns a new instance
   */
  create(): T;

  /**
   * Destroy a given instance by freeing all resources that are contained.
   *
   * @param obj the instance to destroy
   */
  destroy(obj: T): void;
}
