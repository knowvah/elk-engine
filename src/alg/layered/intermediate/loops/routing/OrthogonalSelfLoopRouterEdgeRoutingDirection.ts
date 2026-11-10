// SPDX-License-Identifier: EPL-2.0

/**
 * The direction in which an edge goes around a node in its quest to reach its target. Java nests this protected enum in
 * `OrthogonalSelfLoopRouter` (`OrthogonalSelfLoopRouter.EdgeRoutingDirection`); it lives in its own file here and
 * `OrthogonalSelfLoopRouter.ts` re-exports it. Only identity comparisons are made, so the constants are plain objects.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java#EdgeRoutingDirection
 */
export class EdgeRoutingDirection {
  /** Clockwise direction. */
  static readonly CLOCKWISE: EdgeRoutingDirection = new EdgeRoutingDirection('CLOCKWISE');
  /** Counter-clockwise direction. */
  static readonly COUNTER_CLOCKWISE: EdgeRoutingDirection = new EdgeRoutingDirection('COUNTER_CLOCKWISE');

  readonly #name: string;

  private constructor(name: string) {
    this.#name = name;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }
}
