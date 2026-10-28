// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LNodeAdapter } from './LGraphAdaptersLNodeAdapter.js';
import type { LGraph } from './LGraph.js';
import type { LNode } from './LNode.js';

/**
 * Adapter for {@link LGraph}s.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LGraphAdapter implements GraphAdapters.GraphAdapter<LGraph> {
  /** The wrapped element. */
  protected readonly element: LGraph;
  /** List of cached node adapters. */
  private nodeAdapters: GraphAdapters.NodeAdapter<unknown>[] | null = null;
  /** Whether to simulate that edges are directly connected to north south ports instead of to north/south dummies. */
  private readonly transparentNorthSouthEdges: boolean;
  /** Whether to include attached comment nodes currently not part of the graph. */
  private readonly transparentCommentNodes: boolean;
  /** Predicate that decides which of our children we make visible to clients. */
  private readonly nodeFilter: (node: LNode) => boolean;

  /**
   * Creates a new adapter for the given graph (Java: private; use `LGraphAdapters.adapt`).
   *
   * @param element the graph to be adapted.
   * @param transparentNorthSouthEdges whether to simulate that edges are directly connected to north south ports
   *   instead of to north/south port dummies.
   * @param transparentCommentNodes whether to include attached comment nodes currently not part of the graph.
   * @param nodeFilter predicate that decides which nodes are visible.
   */
  constructor(
    element: LGraph,
    transparentNorthSouthEdges: boolean,
    transparentCommentNodes: boolean,
    nodeFilter: (node: LNode) => boolean,
  ) {
    this.element = element;
    this.transparentNorthSouthEdges = transparentNorthSouthEdges;
    this.transparentCommentNodes = transparentCommentNodes;
    this.nodeFilter = nodeFilter;
  }

  getSize(): KVector {
    return this.element.getSize();
  }

  setSize(size: KVector): void {
    this.element.getSize().x = size.x;
    this.element.getSize().y = size.y;
  }

  getPosition(): KVector {
    throw new UnsupportedOperationException('Not supported by LGraph');
  }

  setPosition(_pos: KVector): void {
    throw new UnsupportedOperationException('Not supported by LGraph');
  }

  getProperty<P>(prop: IProperty<P>): P {
    return this.element.getProperty(prop);
  }

  hasProperty<P>(prop: IProperty<P>): boolean {
    return this.element.hasProperty(prop);
  }

  getNodes(): Iterable<GraphAdapters.NodeAdapter<unknown>> {
    if (this.nodeAdapters === null) {
      this.nodeAdapters = [];
      // We completely ignore layerless nodes here since they are currently not of interest
      // to anyone using these adapters
      for (const l of this.element.getLayers()) {
        for (const n of l.getNodes()) {
          if (this.nodeFilter(n)) {
            this.nodeAdapters.push(new LNodeAdapter(this, n, this.transparentNorthSouthEdges));

            if (this.transparentCommentNodes) {
              this.addCommentNodes(n);
            }
          }
        }
      }
    }
    return this.nodeAdapters;
  }

  /** The `if (transparentCommentNodes)` block of the Java `getNodes` (split out for the complexity limit). */
  private addCommentNodes(n: LNode): void {
    if (n.hasProperty(InternalProperties.TOP_COMMENTS)) {
      for (const comment of n.getProperty(InternalProperties.TOP_COMMENTS)) {
        this.nodeAdapters!.push(new LNodeAdapter(this, comment, false));
      }
    }

    if (n.hasProperty(InternalProperties.BOTTOM_COMMENTS)) {
      for (const comment of n.getProperty(InternalProperties.BOTTOM_COMMENTS)) {
        this.nodeAdapters!.push(new LNodeAdapter(this, comment, false));
      }
    }
  }

  getVolatileId(): number {
    return this.element.id;
  }

  setVolatileId(volatileId: number): void {
    this.element.id = volatileId;
  }
}
