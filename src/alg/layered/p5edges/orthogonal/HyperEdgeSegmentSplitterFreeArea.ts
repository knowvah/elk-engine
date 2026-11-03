// SPDX-License-Identifier: EPL-2.0

/**
 * Represents a free area between two horizontal edge segments, which can be used to route new horizontal segments that
 * connect the two parts of a split {@link HyperEdgeSegment}. Java nested class `HyperEdgeSegmentSplitter.FreeArea`
 * (private there; the splitter reads its fields directly).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitter.java:430
 */
export class HyperEdgeSegmentSplitterFreeArea {
  /** Start of the free area. */
  readonly startPosition: number;
  /** End of the free area. */
  readonly endPosition: number;
  /** Convenience variable that stores the size of the area. */
  readonly size: number;

  constructor(startPosition: number, endPosition: number) {
    // HyperEdgeSegmentSplitter.java:440 `assert endPosition >= startPosition;` is omitted (Java assert, R6)

    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.size = endPosition - startPosition;
  }
}
