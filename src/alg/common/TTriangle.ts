// SPDX-License-Identifier: EPL-2.0
import { fuzzyCompare } from '../../guava/DoubleMath.js';
import * as Lists from '../../guava/Lists.js';
import { KVector } from '../../core/math/KVector.js';
import { add as int32Add } from '../../java/lang/Int32.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { hashable } from '../../java/util/HashStrategy.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';
import { InternalProperties } from './spore/InternalProperties.js';
import { TEdge } from './TEdge.js';

/**
 * A triangle (a, b, c) with its circumscribed circle, used by the Bowyer-Watson triangulation.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/TTriangle.java
 */
export class TTriangle {
  /** vertex a. */
  readonly a: KVector;
  /** vertex b. */
  readonly b: KVector;
  /** vertex c. */
  readonly c: KVector;
  /** A list containing the three edges of the triangle. */
  readonly tEdges: TEdge[];
  /** A list containing the three vertices of the triangle. */
  readonly vertices: KVector[];
  /** The center of the circumscribed circle of the triangle. */
  private readonly circumcenter: KVector;

  /**
   * Creates a triangle (a,b,c).
   *
   * @param a first vertex
   * @param b second vertex
   * @param c third vertex
   */
  constructor(a: KVector, b: KVector, c: KVector) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.tEdges = Lists.newArrayListOf(new TEdge(a, b), new TEdge(b, c), new TEdge(c, a));
    this.vertices = Lists.newArrayListOf(a, b, c);
    this.circumcenter = this.calculateCircumcenter();
  }

  /**
   * The center of the circumscribed circle of the triangle.
   *
   * @returns the center point of the circumcircle
   */
  getCircumcenter(): KVector {
    return this.circumcenter;
  }

  /**
   * Determines the center of the circumscribed circle of the triangle.
   *
   * @returns the center point of the circumcircle
   */
  private calculateCircumcenter(): KVector {
    const ab = this.b.clone().sub(this.a);
    const ac = this.c.clone().sub(this.a);
    const bc = this.c.clone().sub(this.b);
    const e = ab.x * (this.a.x + this.b.x) + ab.y * (this.a.y + this.b.y);
    const f = ac.x * (this.a.x + this.c.x) + ac.y * (this.a.y + this.c.y);
    const g = 2 * (ab.x * bc.y - ab.y * bc.x);

    const px = (ac.y * e - ab.y * f) / g;
    const py = (ab.x * f - ac.x * e) / g;
    return new KVector(px, py);
  }

  /**
   * Check if v is located inside the circumcircle of the triangle.
   *
   * @param v point to check
   * @returns true if v lies in circumcircle
   */
  inCircumcircle(v: KVector): boolean {
    // Fuzziness prevents non-deterministic behavior caused by double imprecision e.g. let square a,b,c,d with d
    // not in circumcircle a,b,c then b should not be in circumcircle a,c,d.
    return (
      fuzzyCompare(this.circumcenter.distance(v), this.circumcenter.distance(this.a), InternalProperties.FUZZINESS) < 0
    );
  }

  /** Two TTriangles are equal, if they are described by the same vertices. */
  equals(obj: unknown): boolean {
    if (obj instanceof TTriangle) {
      const other: TTriangle = obj;
      return this.contains(other.a) && this.contains(other.b) && this.contains(other.c);
    } else {
      return false;
    }
  }

  hashCode(): number {
    // Note that the hash is independent of the vertex order to guarantee that equal triangles
    // yield identical hashes.
    return int32Add(int32Add(JavaObjects.hashCode(this.a), JavaObjects.hashCode(this.b)), JavaObjects.hashCode(this.c));
  }

  /**
   * Checks whether an edge is part of this triangle, or whether a vertex is part of this triangle
   * (Java overloads `contains(TEdge)` and `contains(KVector)`; told apart by `instanceof`).
   *
   * @param item the edge or vertex to check
   * @returns true if the item is equal to one of the triangle's edges or vertices and false otherwise
   */
  contains(item: TEdge | KVector): boolean {
    if (item instanceof TEdge) {
      return (
        JavaObjects.equals(item, this.tEdges[0]) ||
        JavaObjects.equals(item, this.tEdges[1]) ||
        JavaObjects.equals(item, this.tEdges[2])
      );
    }
    return (
      JavaObjects.equals(item, this.vertices[0]) ||
      JavaObjects.equals(item, this.vertices[1]) ||
      JavaObjects.equals(item, this.vertices[2])
    );
  }
}

/**
 * Key protocol for `JavaHashSet`/`JavaHashMap` sites keyed by {@link TTriangle} (V6, decision P2):
 * `TTriangle.hashCode` (vertex-order independent sum) and `TTriangle.equals`.
 */
export const TTRIANGLE_STRATEGY: HashStrategy<TTriangle> = hashable<TTriangle>();
