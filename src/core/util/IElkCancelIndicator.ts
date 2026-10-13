// SPDX-License-Identifier: EPL-2.0

/**
 * Interface for indicators of task cancelation. Possibly long-running tasks such as layout algorithms
 * should query the indicator from time to time in order to allow users to abort the process.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IElkCancelIndicator.java
 */
export interface IElkCancelIndicator {
  /**
   * Returns whether cancellation of the task has been requested.
   *
   * @returns true if cancellation has been requested
   */
  isCanceled(): boolean;
}
