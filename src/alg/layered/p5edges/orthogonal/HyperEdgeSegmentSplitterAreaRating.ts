// SPDX-License-Identifier: EPL-2.0

/**
 * An indication of what would happen if a given segment was connected to its split partner through this area. Java
 * nested class `HyperEdgeSegmentSplitter.AreaRating` (private there; the splitter reads and writes its fields
 * directly).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitter.java:452
 */
export class HyperEdgeSegmentSplitterAreaRating {
  /** The number of dependencies caused by using this area. */
  dependencies: number;
  /** The number of crossings using this area would cause. */
  crossings: number;

  constructor(dependencies: number, crossings: number) {
    this.dependencies = dependencies;
    this.crossings = crossings;
  }
}
