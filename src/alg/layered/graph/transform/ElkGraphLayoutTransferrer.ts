// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { SizeOptions } from '../../../../core/options/SizeOptions.js';
import { isElkNode, type ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { LEdge } from '../LEdge.js';
import type { LGraph } from '../LGraph.js';
import { LGraphUtil } from '../LGraphUtil.js';
import type { LNode } from '../LNode.js';
import type { LPadding } from '../LPadding.js';
import {
  applyEdgeLayout,
  applyNodeLayout,
  applyParentNodeLayout,
  originAsPort,
} from './ElkGraphLayoutTransferrerApply.js';
import { applyLayoutNonMutating } from './ElkGraphLayoutTransferrerNonMutating.js';
import {
  collectDescendingEdges,
  collectLeavingEdges,
  representsExternalPort,
  representsNode,
} from './ElkGraphLayoutTransferrerUtility.js';

/**
 * Implements the graph layout application aspect of `ElkGraphTransformer`.
 *
 * Facade over section modules (P1; sections never import the facade): `ElkGraphLayoutTransferrerApply`
 * (`applyNodeLayout`, `applyEdgeLayout`, `calculateHierarchicalOffset`, `applyParentNodeLayout`),
 * `ElkGraphLayoutTransferrerUtility` ("Utility Methods") and `ElkGraphLayoutTransferrerNonMutating`
 * ("Utility Methods for debugging").
 *
 * @author cds, sdo
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */
export class ElkGraphLayoutTransferrer {
  /**
   * Applies the layout information contained in the given LGraph to the ElkGraph elements it was
   * created from. All source ElkGraph elements are expected to be accessible through their LGraph
   * counterparts through the `InternalProperties.ORIGIN` property.
   *
   * @param lgraph the LGraph whose layout information to apply.
   */
  applyLayout(lgraph: LGraph): void {
    const graphOrigin = lgraph.getProperty(InternalProperties.ORIGIN);
    if (!isElkNode(graphOrigin)) {
      return;
    }

    // The ElkNode that represents this graph in the original ElkGraph
    const parentElkNode = graphOrigin;

    // The LNode that represents this graph in the upper hierarchy level, if any
    const parentLNode = lgraph.getParentNode();

    // Get the offset to be added to all coordinates
    const offset = new KVector(lgraph.getOffset());

    // Adjust offset (and with it the positions) by the requested padding
    const lPadding = lgraph.getPadding();
    offset.x += lPadding.left;
    offset.y += lPadding.top;

    // Set node padding, if it was computed during layout
    applyComputedPadding(parentElkNode, lPadding);

    // Along the way, we collect the list of edges to be processed later
    const edgeList: LEdge[] = [];

    // Process the nodes
    for (const lnode of lgraph.getLayerlessNodes()) {
      applyLayerlessNode(lgraph, lnode, parentLNode, offset);

      // Collect edges, except if they go into a nested subgraph (those edges need to be
      // processed during one of the recursive calls so that any additional offsets are applied
      // correctly)
      collectLeavingEdges(lnode, edgeList);
    }

    // Collect edges that go from the current graph's representing LNode down into its descendants
    if (parentLNode !== null) {
      collectDescendingEdges(parentLNode, edgeList);
    }

    // Iterate through all edges
    applyEdges(parentElkNode, edgeList, offset, lPadding);

    // Setup the parent node
    applyParentNodeLayout(lgraph);

    // Process nested subgraphs
    for (const lnode of lgraph.getLayerlessNodes()) {
      const nestedGraph = lnode.getNestedGraph();
      if (nestedGraph !== null) {
        this.applyLayout(nestedGraph);
      }
    }
  }

  /**
   * Debug method used to create an ElkGraph from an LGraph to log via the progress monitor.
   * This is done by executing the same steps as in {@link applyLayout}, but without mutating.
   *
   * @param lgraph The LGraph
   * @return The ElkNode to log.
   */
  static applyLayoutNonMutating(lgraph: LGraph): ElkNode {
    // The ElkNode that represents this graph in the original ElkGraph
    const parentElkNode = ElkGraphUtil.createGraph();

    // Apply the layout non-mutating
    return applyLayoutNonMutating(lgraph, parentElkNode);
  }
}

/** The per-node step of `applyLayout`'s node loop: nodes get their layout, top-level external ports their position. */
function applyLayerlessNode(lgraph: LGraph, lnode: LNode, parentLNode: LNode | null, offset: KVector): void {
  if (representsNode(lnode)) {
    applyNodeLayout(lnode, offset);
  } else if (representsExternalPort(lnode) && parentLNode === null) {
    // We have an external port here on the top-most hierarchy level of the current (possibly
    // hierarchical) layout run; set its position
    const elkport = originAsPort(lnode.getProperty(InternalProperties.ORIGIN))!;
    const portPosition = LGraphUtil.getExternalPortPosition(lgraph, lnode, elkport.getWidth(), elkport.getHeight());
    elkport.setLocation(portPosition.x, portPosition.y);
  }
}

/** The "Set node padding, if it was computed during layout" step of `applyLayout`. */
function applyComputedPadding(parentElkNode: ElkNode, lPadding: LPadding): void {
  const sizeOptions = parentElkNode.getProperty(LayeredOptions.NODE_SIZE_OPTIONS);
  if (sizeOptions.contains(SizeOptions.COMPUTE_PADDING)) {
    const padding = parentElkNode.getProperty(LayeredOptions.PADDING);
    padding.setBottom(lPadding.bottom);
    padding.setTop(lPadding.top);
    padding.setLeft(lPadding.left);
    padding.setRight(lPadding.right);
  }
}

/** The "Iterate through all edges" step of `applyLayout`. */
function applyEdges(parentElkNode: ElkNode, edgeList: readonly LEdge[], offset: KVector, lPadding: LPadding): void {
  const routing = parentElkNode.getProperty(LayeredOptions.EDGE_ROUTING);
  for (const ledge of edgeList) {
    applyEdgeLayout(ledge, routing, offset, lPadding);
  }
}
