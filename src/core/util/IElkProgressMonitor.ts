// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IElkCancelIndicator } from './IElkCancelIndicator.js';
import type { LoggedGraph, LoggedGraphType } from './LoggedGraph.js';

/** constant indicating an unknown amount of work (Java interface field `UNKNOWN_WORK`). */
export const UNKNOWN_WORK = -1;

/**
 * Interface for monitors of progress of a job. Besides monitoring the progress of operations (and allowing clients to
 * cancel them), progress monitors also have debugging capabilities by providing execution time measurement as well as
 * ways to log messages and graphs.
 *
 * Java's overloaded `logGraph(ElkNode, String)` / `logGraph(Object, String, LoggedGraph.Type)` is a
 * single method here with an optional third parameter: omitting it selects the two-argument form,
 * which logs an ElkGraph (`LoggedGraph.Type.ELK`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IElkProgressMonitor.java
 */
export interface IElkProgressMonitor extends IElkCancelIndicator {
  /**
   * Notifies that the task will begin after this method has been called.
   *
   * @param name readable name of the new task
   * @param totalWork total amount of work units, or `UNKNOWN_WORK` if this is not specified
   * @returns true if the task has not begun before, false otherwise
   */
  begin(name: string, totalWork: number): boolean;

  /** Notifies that the given number of work units has been completed. No effect if the monitor is closed. */
  worked(work: number): void;

  /**
   * Notifies that the current task is done and closes the monitor. This method may be called
   * multiple times after the task has begun, without any effect after the first time.
   */
  done(): void;

  /** Returns true if the task has already begun and is not done yet. */
  isRunning(): boolean;

  /** Returns the name of the task associated with this progress monitor. */
  getTaskName(): string;

  /**
   * Creates a new sub-task that will complete the given amount of work units when it is done.
   *
   * @returns a progress monitor for the new sub-task, or null if the monitor is closed
   */
  subTask(work: number): IElkProgressMonitor | null;

  /** Returns a list of all monitors associated with direct sub-tasks. */
  getSubMonitors(): IElkProgressMonitor[];

  /** Returns the parent monitor, or null if there is none. */
  getParentMonitor(): IElkProgressMonitor | null;

  /** Returns whether the logging methods will log anything. */
  isLoggingEnabled(): boolean;

  /** Whether the progress monitor will save logged data on the file system (only if logging is enabled too). */
  isLogPersistenceEnabled(): boolean;

  /** Logs the given object. */
  log(object: unknown): void;

  /** Returns the collected logs for the task associated with this monitor. */
  getLogs(): string[];

  /**
   * Saves the given graph together with its tag and, if given, its type; without a type the graph is
   * an ElkGraph (Java overload `logGraph(ElkNode, String)`).
   *
   * @throws ClassCastException if `graph` does not conform to the expected type.
   */
  logGraph(graph: ElkNode, tag: string): void;
  logGraph(graph: unknown, tag: string, graphType: LoggedGraphType): void;

  /** Returns the collected intermediate graphs for the task associated with this monitor. */
  getLoggedGraphs(): LoggedGraph[];

  /**
   * Returns the path where this monitor would put debug files. Clients can put custom debug files
   * there as well. The path is `null` if {@link isLoggingEnabled} or {@link isLogPersistenceEnabled}
   * return `false`. If non-null, it is not required to exist yet.
   *
   * Divergence: Java returns `java.nio.file.Path` (inside `elkjs-exclude` markers); the browser-safe
   * port has no `Path`, so the path is a plain `string | null` (decision C8).
   */
  getDebugFolder(): string | null;

  /** Returns whether this monitor measures execution time. */
  isExecutionTimeMeasured(): boolean;

  /** Returns the measured execution time in seconds (implementations may return 0). */
  getExecutionTime(): number;
}
