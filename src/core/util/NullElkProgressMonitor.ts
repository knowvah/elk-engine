// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';
import type { LoggedGraph, LoggedGraphType } from './LoggedGraph.js';

/**
 * Java returns `null` from the getters below; the shared interface (`IElkProgressMonitor`) types them
 * non-null, so the faithful `null` is cast at these sites only.
 */
const NULL_RESULT = null as never;

/**
 * An implementation of {@link IElkProgressMonitor} which does not do anything. The primary purpose of this monitor is
 * for it to be used with unit tests. The only method which returns something sensible is {@link subTask}, which
 * simply returns the instance it was called on (since the progress monitor doesn't do anything anyway, we don't bother
 * creating a new instance).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/NullElkProgressMonitor.java
 */
export class NullElkProgressMonitor implements IElkProgressMonitor {
  isCanceled(): boolean {
    return false;
  }

  begin(_name: string, _totalWork: number): boolean {
    return false;
  }

  worked(_work: number): void {}

  done(): void {}

  isRunning(): boolean {
    return false;
  }

  getTaskName(): string {
    return NULL_RESULT;
  }

  subTask(_work: number): IElkProgressMonitor {
    return this;
  }

  getSubMonitors(): IElkProgressMonitor[] {
    return NULL_RESULT;
  }

  getParentMonitor(): IElkProgressMonitor | null {
    return null;
  }

  isLoggingEnabled(): boolean {
    return false;
  }

  isLogPersistenceEnabled(): boolean {
    return false;
  }

  log(_object: unknown): void {}

  getLogs(): string[] {
    return NULL_RESULT;
  }

  logGraph(graph: ElkNode, tag: string): void;
  logGraph(graph: unknown, tag: string, graphType: LoggedGraphType): void;
  logGraph(_graph: unknown, _tag: string, _graphType?: LoggedGraphType): void {}

  getLoggedGraphs(): LoggedGraph[] {
    return NULL_RESULT;
  }

  // Java lines 106-111 (`getDebugFolder`, inside an `elkjs-exclude` block, `Path` return) returns null (C8, M2).
  getDebugFolder(): string | null {
    return null;
  }

  isExecutionTimeMeasured(): boolean {
    return false;
  }

  getExecutionTime(): number {
    return 0;
  }
}
