// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LPort } from '../graph/LPort.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { PortType } from '../options/PortType.js';

/**
 * A data holder used to pass information on hierarchy crossing edges from the `CompoundGraphPreprocessor` to the
 * `CompoundGraphPostprocessor`. Instances of this class are held in a multimap attached to the top-level graph via the
 * `CROSS_HIERARCHY_MAP` property.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CrossHierarchyEdge.java
 */
export class CrossHierarchyEdge {
  /** the edge used in the layered graph to compute a layout. */
  private readonly newEdge: LEdge;
  /** the layered graph in which the layout was computed. */
  private readonly graph: LGraph;
  /** the flow direction: input or output. */
  private readonly type: PortType;

  /**
   * Create a cross-hierarchy edge segment.
   *
   * @param newEdge the edge used in the layered graph to compute a layout
   * @param graph the layered graph in which the layout is computed
   * @param type the flow direction: input or output
   */
  constructor(newEdge: LEdge, graph: LGraph, type: PortType) {
    this.newEdge = newEdge;
    this.graph = graph;
    this.type = type;
  }

  toString(): string {
    return `${this.type.toString()}:${this.newEdge.toString()}`;
  }

  /** Return the dummy edge used to compute a layout in one segment of the cross-hierarchy edge. */
  getEdge(): LEdge {
    return this.newEdge;
  }

  /** Return the graph in which the dummy edge {@link getEdge} is used. */
  getGraph(): LGraph {
    return this.graph;
  }

  /**
   * Return the type of cross-hierarchy edge segment (input or output). An input segment is one that points to deeper
   * hierarchy levels, while an output segment is one that points to shallower hierarchy levels.
   */
  getType(): PortType {
    return this.type;
  }

  /**
   * Return the actual source port of the edge. In case the source port of the dummy edge is an external port, the
   * corresponding port of the containing node is returned.
   */
  getActualSource(): LPort {
    const source = this.newEdge.getSource()!;
    if (source.getNode()!.getType() === NodeType.EXTERNAL_PORT) {
      return source.getNode()!.getProperty(InternalProperties.ORIGIN) as LPort;
    }
    return source;
  }

  /**
   * Return the actual target port of the edge. In case the target port of the dummy edge is an external port, the
   * corresponding port of the containing node is returned.
   */
  getActualTarget(): LPort {
    const target = this.newEdge.getTarget()!;
    if (target.getNode()!.getType() === NodeType.EXTERNAL_PORT) {
      return target.getNode()!.getProperty(InternalProperties.ORIGIN) as LPort;
    }
    return target;
  }
}
