// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { PortSide } from '../../../core/options/PortSide.js';
import type { EnumSet } from '../../../java/util/EnumSet.js';
import type { IComponent } from '../compaction/components/IComponent.js';
import type { IExternalExtension } from '../compaction/components/IExternalExtension.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Basically, this is a wrapper around an {@link LGraph} since the {@link LGraph} represents a connected
 * component, if the user desires to (i.e. `LayeredOptions.SEPARATE_CC` is true).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:620
 */
export class ComponentsCompactorInternalComponent implements IComponent<LNode, Set<LEdge>> {
  graph: LGraph;
  containsRegularNodes: boolean;

  rectilinearConvexHull: ElkRectangle[] = [];
  externalExtensions: IExternalExtension<Set<LEdge>>[] = [];

  constructor(graph: LGraph) {
    this.graph = graph;

    this.containsRegularNodes = false;
    for (const n of graph.getLayerlessNodes()) {
      this.containsRegularNodes = this.containsRegularNodes || n.getType() === NodeType.NORMAL;
    }
  }

  getExternalExtensionSides(): EnumSet<PortSide> {
    return this.graph.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
  }

  getHull(): ElkRectangle[] {
    return this.rectilinearConvexHull;
  }

  getExternalExtensions(): IExternalExtension<Set<LEdge>>[] {
    return this.externalExtensions;
  }

  getNodes(): LNode[] {
    return this.graph.getLayerlessNodes();
  }

  getExternalEdges(): LEdge[] {
    const edges: LEdge[] = [];
    for (const ee of this.externalExtensions) {
      edges.push(...ee.getRepresentative());
    }
    return edges;
  }
}
