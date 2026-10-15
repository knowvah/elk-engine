// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import type { RegionTrace } from './RegionTrace.js';

/**
 * Two segments of a {@link TextSegmentSet} conflict and could not be merged. The Java message appends a
 * `TextRegionsWithTitleToString` rendering of the traces (a debug printer, not ported): here each trace is one
 * line `<title> [offset,length]`. The message only reaches the exception handler (default: dropped).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/ConflictingRegionsException.java
 */
export class ConflictingRegionsException extends RuntimeException {
  private readonly traces: readonly RegionTrace[];
  private readonly baseMessage: string;

  constructor(message: string, cause: Error | null, traces: readonly RegionTrace[]) {
    super(message, cause === null ? undefined : { cause });
    this.name = 'ConflictingRegionsException';
    this.baseMessage = message;
    this.traces = traces;
    this.message = this.buildMessage();
  }

  getTraces(): readonly RegionTrace[] {
    return this.traces;
  }

  private buildMessage(): string {
    const lines = this.traces.map(
      (trace) => `${trace.message} [${trace.getRegion().getOffset()},${trace.getRegion().getLength()}]`,
    );
    return `${this.baseMessage}.\n${lines.join('\n')}`;
  }
}
