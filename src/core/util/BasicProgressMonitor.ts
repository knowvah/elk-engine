// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { copyGraph } from '../../graph/util/ElkGraphCopy.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import * as Float32 from '../../java/lang/Float32.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';
import { LoggedGraph, LoggedGraphType } from './LoggedGraph.js';

/** indicates an infinite number of hierarchy levels for progress reporting. */
const INFINITE_HIERARCHY_LEVELS = -1;
/** factor for nanoseconds. */
const NANO_FACT = 1e-9;
/** Nanoseconds per millisecond: `performance.now()` replaces `System.nanoTime()` (M3). */
const NANOS_PER_MILLI = 1e6;

/** `System.nanoTime()` as a whole number of nanoseconds (Java `long`), from `performance.now()` (M3). */
function nanoTime(): number {
  return Math.trunc(performance.now() * NANOS_PER_MILLI);
}

/**
 * Java returns `null` from `getTaskName`, `getLogs` and `getLoggedGraphs` in some states; the shared interface
 * (`IElkProgressMonitor`) types them non-null, so the faithful `null` is cast at these sites only.
 */
const NULL_RESULT = null as never;

/**
 * Base class for implementations of progress monitors. This class performs execution time measurement, logs debug
 * output, keeps track of the amount of completed work, and handles sub-tasks properly.
 *
 * Log persistence (the `elkjs-exclude` blocks writing to the file system, M2) is dropped: logs stay in memory and
 * {@link getDebugFolder} is `null`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/BasicProgressMonitor.java
 */
export class BasicProgressMonitor implements IElkProgressMonitor {
  /** name of the parent folder for all debug data. */
  static readonly ROOT_DEBUG_FOLDER_NAME: string = 'logs';

  /** the parent monitor. */
  private parentMonitor: BasicProgressMonitor | null = null;
  /** list of child monitors. */
  private readonly children: IElkProgressMonitor[] = [];
  /** the maximal number of hierarchy levels for which progress is reported. */
  private maxLevels: number = INFINITE_HIERARCHY_LEVELS;

  /** the name of the associated task. */
  private taskName: string | null = null;
  /** indicates whether the monitor has been closed. */
  private closed = false;
  /** the number of work units that can be completed in total (Java `float`). */
  private totalWork = 0;
  /** the amount of work that is completed (Java `float`). */
  private completedWork = 0;
  /** the number of work units that will be consumed after completion of the currently active child task (`float`). */
  private currentChildWork = -1;

  /** whether logging should be enabled (if not, logging objects does nothing). */
  private recordLogs = false;
  /** whether logged data are saved on the file system (provided that logging itself is enabled). */
  private persistLogs = false;
  /** list of log messages (only non-null if logs are enabled). */
  private logMessages: string[] | null = null;
  /** list of logged graphs (only non-null if logs are enabled). */
  private logGraphs: LoggedGraph[] | null = null;
  // Java lines 93-98 (`debugFolder`, `logFile`; `elkjs-exclude`) are dropped.
  /** whether the execution time shall be measured when the task is done. */
  private recordExecutionTime = false;
  /** the start time of the associated task, in nanoseconds. */
  private startTime = 0;
  /** the total time of the associated task, in seconds. */
  private totalTime = 0;

  /** Creates a progress monitor with infinite number of hierarchy levels. */
  constructor();
  /**
   * Creates a progress monitor with the given maximal number of hierarchy levels. If the number is negative, the
   * hierarchy levels are infinite. Otherwise progress is reported to parent monitors only up to the specified
   * number of levels.
   *
   * @deprecated Use {@link withMaxHierarchyLevels} instead.
   */
  constructor(themaxLevels: number);
  constructor(themaxLevels?: number) {
    if (themaxLevels !== undefined) {
      this.withMaxHierarchyLevels(themaxLevels);
    }
  }

  /**
   * Configures the monitor for the given maximum number of hierarchy levels. If the number is negative, the hierarchy
   * levels are infinite. Otherwise, progress is reported to parent monitors only up to the specified number of
   * levels.
   */
  withMaxHierarchyLevels(levels: number): this {
    if (levels < 0) {
      this.maxLevels = INFINITE_HIERARCHY_LEVELS;
    } else {
      this.maxLevels = levels;
    }

    return this;
  }

  /** Enable or disable logging on this monitor. */
  withLogging(enabled: boolean): this {
    this.recordLogs = enabled;

    if (this.recordLogs) {
      this.logMessages = [];
      this.logGraphs = [];
    } else {
      this.logMessages = null;
      this.logGraphs = null;
    }

    return this;
  }

  /** Enable or disable log persistence on this monitor. */
  withLogPersistence(enabled: boolean): this {
    this.persistLogs = enabled;
    return this;
  }

  /** Enable or disable execution time measurement on this monitor. */
  withExecutionTimeMeasurement(enabled: boolean): this {
    this.recordExecutionTime = enabled;
    return this;
  }

  begin(name: string, thetotalWork: number): boolean {
    if (this.closed) {
      throw new IllegalStateException('The task is already done.');
    } else if (this.taskName !== null) {
      return false;
    } else {
      if ((name as string | null) === null) {
        // Java: NullPointerException (D10: TypeError)
        throw new TypeError('name == null');
      }
      this.taskName = name;
      this.totalWork = Float32.fromDouble(thetotalWork);
      this.doBegin(name, this.totalWork, this.parentMonitor === null, this.maxLevels);
      if (this.recordExecutionTime) {
        this.startTime = nanoTime();
        // Java lines 216-221 also hold the GWT millisecond fallback (`elkjs-exclude`); dropped (M3).
      }
      return true;
    }
  }

  /**
   * Invoked when a task begins, to be overridden by subclasses. This implementation does nothing.
   *
   * @param _name task name
   * @param _newTotalWork total amount of work for the new task
   * @param _topInstance if true, this progress monitor is the top instance
   * @param _maxHierarchyLevels the maximal number of reported hierarchy levels, or -1 for infinite levels
   */
  protected doBegin(_name: string, _newTotalWork: number, _topInstance: boolean, _maxHierarchyLevels: number): void {}

  worked(work: number): void {
    if (work > 0 && !this.closed) {
      this.internalWorked(Float32.fromDouble(work));
    }
  }

  /** Sets the current work counters of this monitor and all parent monitors. */
  private internalWorked(work: number): void {
    if (this.totalWork > 0 && this.completedWork < this.totalWork) {
      this.completedWork = Float32.add(this.completedWork, work);
      this.doWorked(this.completedWork, this.totalWork, this.parentMonitor === null);
      const parent = this.parentMonitor;
      if (parent !== null && parent.currentChildWork > 0 && this.maxLevels !== 0) {
        parent.internalWorked(Float32.mul(Float32.div(work, this.totalWork), parent.currentChildWork));
      }
    }
  }

  /**
   * Invoked when work is done for this progress monitor, to be overridden by subclasses. This implementation does
   * nothing.
   *
   * @param _thecompletedWork total number of work that is done for this task
   * @param _thetotalWork total number of work that is targeted for completion
   * @param _topInstance if true, this progress monitor is the top instance
   */
  protected doWorked(_thecompletedWork: number, _thetotalWork: number, _topInstance: boolean): void {}

  done(): void {
    if (this.taskName === null) {
      throw new IllegalStateException('The task has not begun yet.');
    }
    if (!this.closed) {
      if (this.recordExecutionTime) {
        // Java lines 286-291 also hold the GWT millisecond fallback (`elkjs-exclude`); dropped (M3).
        const endTime = nanoTime();

        this.totalTime = (endTime - this.startTime) * NANO_FACT;
      }
      if (this.completedWork < this.totalWork) {
        this.internalWorked(Float32.sub(this.totalWork, this.completedWork));
      }
      this.doDone(this.parentMonitor === null, this.maxLevels);
      this.closed = true;
    }
  }

  /**
   * Invoked when a task ends, to be overridden by subclasses. This implementation does nothing.
   *
   * @param _topInstance if true, this progress monitor is the top instance
   * @param _maxHierarchyLevels the maximal number of reported hierarchy levels, or -1 for infinite levels
   */
  protected doDone(_topInstance: boolean, _maxHierarchyLevels: number): void {}

  isRunning(): boolean {
    return this.taskName !== null && !this.closed;
  }

  /** This implementation always returns `false`. */
  isCanceled(): boolean {
    return false;
  }

  getTaskName(): string {
    return this.taskName ?? NULL_RESULT;
  }

  subTask(work: number): IElkProgressMonitor | null {
    if (!this.closed) {
      const subMonitor = this.doSubTask(work, this.maxLevels);
      this.children.push(subMonitor);
      subMonitor.parentMonitor = this;
      this.currentChildWork = Float32.fromDouble(work);
      return subMonitor;
    } else {
      return null;
    }
  }

  /**
   * Invoked when a sub-task is created, to be overridden by subclasses. Regarding debug logging, the new instance
   * should be configured just like the instance the method is called on. This implementation creates a new
   * `BasicProgressMonitor` instance.
   *
   * @param _work amount of work that is completed in the current monitor instance when the sub-task ends
   * @param maxHierarchyLevels the maximal number of reported hierarchy levels for the parent progress monitor, or -1
   *     for infinite levels
   * @returns a new progress monitor instance
   */
  protected doSubTask(_work: number, maxHierarchyLevels: number): BasicProgressMonitor {
    const newMaxHierarchyLevels = maxHierarchyLevels > 0 ? maxHierarchyLevels - 1 : maxHierarchyLevels;
    return new BasicProgressMonitor()
      .withMaxHierarchyLevels(newMaxHierarchyLevels)
      .withLogging(this.recordLogs)
      .withLogPersistence(this.persistLogs)
      .withExecutionTimeMeasurement(this.recordExecutionTime);
  }

  /** Returns a snapshot of the direct sub-task monitors (Java: an unmodifiable view). */
  getSubMonitors(): IElkProgressMonitor[] {
    return [...this.children];
  }

  getParentMonitor(): IElkProgressMonitor | null {
    return this.parentMonitor;
  }

  isLoggingEnabled(): boolean {
    return this.recordLogs;
  }

  isLogPersistenceEnabled(): boolean {
    return this.persistLogs;
  }

  log(object: unknown): void {
    if (this.recordLogs && object !== null && object !== undefined) {
      const logMessage = String(object);
      this.logMessages!.push(logMessage);

      // Java lines 403-419 (persist the message to `log.txt`; `elkjs-exclude`) are dropped (M2).
    }
  }

  getLogs(): string[] {
    return this.logMessages === null ? NULL_RESULT : [...this.logMessages];
  }

  logGraph(graph: ElkNode, tag: string): void;
  logGraph(graph: unknown, tag: string, graphType: LoggedGraphType): void;
  logGraph(graph: unknown, tag: string, graphType?: LoggedGraphType): void {
    if (graphType === undefined) {
      // Java overload `logGraph(ElkNode, String)`
      if (this.recordLogs && graph !== null && graph !== undefined) {
        this.logGraph(copyGraph(graph as ElkNode), tag, LoggedGraphType.ELK);
      }
    } else if (this.recordLogs && graph !== null && graph !== undefined && graphType !== null) {
      const loggedGraph = new LoggedGraph(graph, tag, graphType);
      this.logGraphs!.push(loggedGraph);

      // Java lines 443-462 (persist the graph into its own file; `elkjs-exclude`) are dropped (M2).
    }
  }

  getLoggedGraphs(): LoggedGraph[] {
    return this.logGraphs === null ? NULL_RESULT : [...this.logGraphs];
  }

  // Java lines 473-479 (`getDebugFolder`: `initDebugFolder(false)`, returns the `Path`; `elkjs-exclude`): with the
  // persistence code dropped the folder is never computed, so this is always `null` (C8, M2).
  getDebugFolder(): string | null {
    return null;
  }

  isExecutionTimeMeasured(): boolean {
    return this.recordExecutionTime;
  }

  getExecutionTime(): number {
    return this.totalTime;
  }

  // Java lines 495-627 (`initDebugFolder`, `initRootMonitorDebugFolder`, `initChildMonitorDebugFolder`,
  // `retrieveLogFilePath`, `retrieveFilePath`) compute and create debug folders and files. Their non-excluded
  // remainders (timestamp, random letters, the "Unnamed" fallback) only feed the excluded folder names, so no
  // caller exists in the port; all five are dropped (M2).
}
