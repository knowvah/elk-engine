// SPDX-License-Identifier: EPL-2.0
import { add as int32Add } from '../../java/lang/Int32.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { hashable } from '../../java/util/HashStrategy.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';
import type { KVector } from '../../core/math/KVector.js';

/**
 * An edge (u, v), equal to the edge (v, u): the hash and `equals` ignore the vertex order.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/TEdge.java
 */
export class TEdge {
  /** vertex u. */
  readonly u: KVector;
  /** vertex v. */
  readonly v: KVector;

  /**
   * Creates an edge (u,v).
   *
   * @param u first vertex
   * @param v second vertex
   */
  constructor(u: KVector, v: KVector) {
    this.u = u;
    this.v = v;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof TEdge) {
      const other: TEdge = obj;
      return (
        (JavaObjects.equals(this.u, other.u) && JavaObjects.equals(this.v, other.v)) ||
        (JavaObjects.equals(this.u, other.v) && JavaObjects.equals(this.v, other.u))
      );
    } else {
      return false;
    }
  }

  /** `Objects.hashCode(u) + Objects.hashCode(v)` with `int` wrap-around. */
  hashCode(): number {
    return int32Add(JavaObjects.hashCode(this.u), JavaObjects.hashCode(this.v));
  }
}

/**
 * Key protocol for `JavaHashSet`/`JavaHashMap` sites keyed by {@link TEdge} (V7, decision P2):
 * `TEdge.hashCode` and `TEdge.equals`. `TEdge` is not `Comparable`, so there is no `compare`.
 */
export const TEDGE_STRATEGY: HashStrategy<TEdge> = hashable<TEdge>();
