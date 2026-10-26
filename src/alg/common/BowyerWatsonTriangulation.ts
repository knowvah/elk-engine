// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import * as Lists from '../../guava/Lists.js';
import * as Sets from '../../guava/Sets.js';
import type { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { TEDGE_STRATEGY } from './TEdge.js';
import type { TEdge } from './TEdge.js';
import { TTRIANGLE_STRATEGY, TTriangle } from './TTriangle.js';
import { SVGImage } from './utils/SVGImage.js';

/** The attributes of the shared triangle outline used by the debug output. */
const TRIANGLE_OUTLINE = 'stroke="black" fill="none" stroke-width="4"';

/** The attributes of a vertex circle used by the debug output. */
const VERTEX_CIRCLE = 'stroke="black" stroke-width="1" fill="lightgray"';

/**
 * This class creates a Delaunay triangulation for the given points that is represented by a list of edges.
 * The approach was devised independently by Bowyer, Adrian (1981) "Computing Dirichlet tessellations" and
 * Watson, David F. (1981) "Computing the n-dimensional Delaunay tessellation with application to Voronoi polytopes".
 * <p> precondition: All vertices have to be distinct.</p>
 * <p> postcondition: The returned edges form a connected graph that includes all input points without duplicate
 * edges.</p>
 *
 * The overloads `triangulate(vertices, debugOutputFile)` and `triangulate(vertices)` are one function with an
 * optional last parameter. The Java method body is split at its section boundaries (complexity limit).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/BowyerWatsonTriangulation.java
 */
export class BowyerWatsonTriangulation {
  /** Hidden constructor. */
  private constructor() {}

  /**
   * Triangulates a list of points.
   *
   * @param vertices the input points
   * @param debugOutputFile file name for debug SVG. Debug output will be deactivated if this is null.
   * @returns the edges of the triangulation, in the iteration order of the JVM's `HashSet`
   */
  static triangulate(vertices: readonly KVector[], debugOutputFile: string | null = null): JavaHashSet<TEdge> {
    /*d*/ const svg = new SVGImage(debugOutputFile);
    /*d*/ svg.addGroups('invalid', 'tri', 'bndry', 'done', 'new');

    /* preliminaries */

    const { topleft, bottomright } = BowyerWatsonTriangulation.boundingBox(vertices, svg);
    const size = new KVector(bottomright.x - topleft.x, bottomright.y - topleft.y);
    /*d*/ svg.g('bb').addRect(topleft.x, topleft.y, size.x, size.y, 'stroke="blue" stroke-width="4" fill="none"');

    const superTriangle = BowyerWatsonTriangulation.superTriangle(topleft, bottomright, size, svg);

    /* Bowyer Watson algorithm*/

    const triangulation = Sets.newHashSet<TTriangle>(TTRIANGLE_STRATEGY);
    const invalidTriangles: TTriangle[] = Lists.newArrayList<TTriangle>();
    const boundary: TEdge[] = Lists.newArrayList<TEdge>();
    triangulation.add(superTriangle);

    // incrementally adding vertices
    for (const vertex of vertices) {
      /*d*/ svg.g('done').addCircle(vertex.x, vertex.y, 18, VERTEX_CIRCLE);
      /*d*/ svg.g('new').addCircle(vertex.x, vertex.y, 18, 'stroke="black" stroke-width="1" fill="black"');

      BowyerWatsonTriangulation.gatherInvalidTriangles(triangulation, invalidTriangles, vertex, svg);
      BowyerWatsonTriangulation.calculateBoundary(invalidTriangles, boundary, svg);
      BowyerWatsonTriangulation.removeInvalidTriangles(triangulation, invalidTriangles, svg);
      BowyerWatsonTriangulation.triangulateBoundary(triangulation, boundary, vertex, svg);
    }

    return BowyerWatsonTriangulation.toEdgeSet(triangulation, superTriangle, svg);
  }

  /** Determines the bounding box of the given points (`// determine the bounding box of the given points`). */
  private static boundingBox(
    vertices: readonly KVector[],
    svg: SVGImage,
  ): { readonly topleft: KVector; readonly bottomright: KVector } {
    const topleft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const bottomright = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const v of vertices) {
      topleft.x = Math.min(topleft.x, v.x);
      topleft.y = Math.min(topleft.y, v.y);
      bottomright.x = Math.max(bottomright.x, v.x);
      bottomright.y = Math.max(bottomright.y, v.y);
      /*d*/ svg.g('bb').addCircle(v.x, v.y, 18, VERTEX_CIRCLE);
    }
    return { topleft, bottomright };
  }

  /** Finds a super-triangle spanning over all vertices. */
  private static superTriangle(topleft: KVector, bottomright: KVector, size: KVector, svg: SVGImage): TTriangle {
    const wiggleroom = 50;
    // This ensures that no vertices are too close to the edges of the super-triangle
    // because that would result in circumcircles that are so large that a double would not
    // be precise enough to compute the circumcircle criterion.
    const sa = new KVector(topleft.x - wiggleroom, topleft.y - size.x - wiggleroom);
    const sb = new KVector(topleft.x - wiggleroom, bottomright.y + size.x + wiggleroom);
    const sc = new KVector(bottomright.x + size.y / 2 + wiggleroom, topleft.y + size.y / 2);
    /*d*/ svg.g('bb').addPoly('stroke="gray" stroke-width="4" fill="none" stroke-dasharray="20,20"', sa, sb, sc, sa);
    const superTriangle = new TTriangle(sa, sb, sc);
    /*d*/ svg.setViewBox(sa.x, sa.y, sc.x - sa.x, sb.y - sa.y); // circumcircles will make it gigantic
    /*d*/ svg.isave();
    /*d*/ svg.removeGroup('bb');
    return superTriangle;
  }

  /** Gathers invalid triangles where the new vertex lies inside the circumcircle. */
  private static gatherInvalidTriangles(
    triangulation: JavaHashSet<TTriangle>,
    invalidTriangles: TTriangle[],
    vertex: KVector,
    svg: SVGImage,
  ): void {
    invalidTriangles.length = 0;
    for (const triangle of triangulation) {
      /*d*/ svg.g('tri').addPoly(TRIANGLE_OUTLINE, triangle.a, triangle.b, triangle.c, triangle.a);
      /*d*/ const c = triangle.getCircumcenter();
      /*d*/ svg
        .g('invalid')
        .addCircle(c.x, c.y, c.distance(triangle.a), 'stroke="orange" stroke-width="4" fill="none"');
      if (triangle.inCircumcircle(vertex)) {
        invalidTriangles.push(triangle);
        /*d*/ svg
          .g('invalid')
          .addPoly('stroke="none" fill="red" opacity="0.18"', triangle.a, triangle.b, triangle.c, triangle.a);
      }
    }
    /*d*/ svg.isave();
    /*d*/ svg.clearGroup('invalid');
  }

  /** Calculates the boundary of the invalid triangles. */
  private static calculateBoundary(invalidTriangles: TTriangle[], boundary: TEdge[], svg: SVGImage): void {
    boundary.length = 0;
    for (const triangle of invalidTriangles) {
      for (const tEdge of triangle.tEdges) {
        let onBoundary = true;
        // edges that are not shared with other invalid triangles are on the boundary
        for (const other of invalidTriangles) {
          if (other !== triangle && other.contains(tEdge)) {
            onBoundary = false;
          }
        }
        if (onBoundary) {
          boundary.push(tEdge);
          /*d*/ svg
            .g('bndry')
            .addLine(
              tEdge.u.x,
              tEdge.u.y,
              tEdge.v.x,
              tEdge.v.y,
              'stroke="purple" stroke-width="18" stroke-dasharray="20,20"',
            );
        }
      }
    }
    /*d*/ svg.isave();
  }

  /**
   * Removes the invalid triangles. `Set.removeAll` removes exactly the triangles equal to one of the list's
   * elements, so the table order of the survivors is the same whichever side `AbstractSet.removeAll` iterates.
   */
  private static removeInvalidTriangles(
    triangulation: JavaHashSet<TTriangle>,
    invalidTriangles: TTriangle[],
    svg: SVGImage,
  ): void {
    for (const triangle of invalidTriangles) {
      triangulation.remove(triangle);
    }
    /*d*/ svg.clearGroup('tri');
    /*d*/ for (const triangle of triangulation) {
      svg.g('tri').addPoly(TRIANGLE_OUTLINE, triangle.a, triangle.b, triangle.c, triangle.a);
    }
    /*d*/ svg.isave();
  }

  /** Triangulates the boundary. */
  private static triangulateBoundary(
    triangulation: JavaHashSet<TTriangle>,
    boundary: TEdge[],
    vertex: KVector,
    svg: SVGImage,
  ): void {
    for (const tEdge of boundary) {
      triangulation.add(new TTriangle(vertex, tEdge.u, tEdge.v));
      /*d*/ svg.g('tri').addPoly(TRIANGLE_OUTLINE, vertex, tEdge.u, tEdge.v, vertex);
    }
    /*d*/ svg.isave();
    /*d*/ svg.clearGroup('new');
    /*d*/ svg.clearGroup('bndry');
    /*d*/ svg.clearGroup('tri');
  }

  /**
   * Converts the triangulation to a set of edges. Because it's a set, edges that were redundant in the
   * triangulation exist only once in the set. Edges connected to the super triangle are removed (collected during
   * the iteration and removed afterwards, since `JavaHashSet` has no iterator `remove`; the survivors keep their
   * table order either way).
   */
  private static toEdgeSet(
    triangulation: JavaHashSet<TTriangle>,
    superTriangle: TTriangle,
    svg: SVGImage,
  ): JavaHashSet<TEdge> {
    const tEdges = Sets.newHashSet<TEdge>(TEDGE_STRATEGY);
    for (const triangle of triangulation) {
      tEdges.addAll(triangle.tEdges);
    }

    // remove edges connected to super triangle
    const connected: TEdge[] = [];
    for (const tEdge of tEdges) {
      if (superTriangle.contains(tEdge.u) || superTriangle.contains(tEdge.v)) {
        connected.push(tEdge);
      }
    }
    for (const tEdge of connected) {
      tEdges.remove(tEdge);
    }

    /*d*/ for (const tEdge of tEdges) {
      svg.addLine(tEdge.u.x, tEdge.u.y, tEdge.v.x, tEdge.v.y, 'stroke="black" stroke-width="4"');
    }
    /*d*/ svg.isave();

    return tEdges;
  }
}
