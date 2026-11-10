// SPDX-License-Identifier: EPL-2.0

/**
 * Handles the events of a {@link Scanline} (Java nested interface `Scanline.EventHandler`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/recthull/Scanline.java
 */
export interface EventHandler<T> {
  /**
   * Handles the event of the scanline reaching the given point.
   *
   * @param p the point the scanline reached
   */
  handle(p: T): void;
}
