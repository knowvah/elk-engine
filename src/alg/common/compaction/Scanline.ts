// SPDX-License-Identifier: EPL-2.0
import * as Lists from '../../../guava/Lists.js';
import type { EventHandler } from './ScanlineEventHandler.js';

/**
 * A generic scanline: sorts the points with a comparator, then moves over them in that order and
 * hands each one to every event handler. `Collections.sort` is a stable merge sort and so is
 * `Array.prototype.sort`: points that compare equal keep their input order.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/Scanline.java
 */
export class Scanline<T> {
  private readonly points: T[];
  private readonly comparator: (a: T, b: T) => number;
  private readonly eventHandlers: EventHandler<T>[];

  private constructor(points: T[], comparator: (a: T, b: T) => number, eventHandlers: Iterable<EventHandler<T>>) {
    this.comparator = comparator;
    this.points = points;
    this.eventHandlers = Lists.newArrayList(eventHandlers);
  }

  /**
   * Executes the scanline. The Java overloads taking an `Iterable` of handlers or a single handler
   * are one method; a single handler is told apart by not being iterable.
   *
   * @param points the points to sweep over (not modified)
   * @param comparator the order of the sweep
   * @param eventHandlers the handler or handlers called for each point
   */
  static execute<T>(
    points: Iterable<T>,
    comparator: (a: T, b: T) => number,
    eventHandlers: Iterable<EventHandler<T>> | EventHandler<T>,
  ): void {
    // copy the points! we will resort them!
    const copy: T[] = Lists.newArrayList(points);
    const handlers: Iterable<EventHandler<T>> = Symbol.iterator in eventHandlers ? eventHandlers : [eventHandlers];
    new Scanline<T>(copy, comparator, handlers).go();
  }

  private go(): void {
    // sort
    this.points.sort(this.comparator);

    // now move scanline
    for (const p of this.points) {
      for (const h of this.eventHandlers) {
        h.handle(p);
      }
    }
  }
}
