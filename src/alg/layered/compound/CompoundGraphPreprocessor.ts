// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { Multimap } from '../../../guava/Multimap.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import type { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { processCompoundGraphPreprocessor } from './CompoundGraphPreprocessorSections.js';

/**
 * Preprocess a compound graph by splitting cross-hierarchy edges. The result is stored in
 * `LayeredOptions.CROSS_HIERARCHY_MAP`, which is attached to the top-level graph.
 *
 * This processor assumes that external port dummy nodes only occur on the uppermost level of hierarchy in the input
 * graph. In all deeper levels, it is the job of this processor to create external ports and associated dummy nodes.
 *
 * Implementation Notes
 *
 * Basically, the algorithm replaces cross-hierarchy edges by hierarchy-local edge segments. It distinguishes between
 * two types of segments: outer segments and inner segments. Outer segments are those two segments that connect to the
 * original source or target port of a hierarchical edge. Inner segments are the remaining segments between the two
 * outer segments.
 *
 * To split cross-hierarchy edges, the algorithm dives depth-first into the graph's hierarchy tree and begins working
 * its way from the deepest levels of hierarchy upwards. For each contained graph, it looks for cross-hierarchy edges
 * beginning or ending there and starts by splitting those up and thus creating the first outer segments. This will
 * result in external ports being created and added to the graph's parent node. Those are published to the upper level
 * of hierarchy.
 *
 * All external ports thus published by child nodes are then processed further. With all outer segments created, the
 * algorithm then creates required inner segments. To this end, it continues adding external ports and publishes them
 * to the upper level of hierarchy.
 *
 * Remember when graph layout was easy? Pepperidge Farm remembers...
 *
 * Precondition: a compound graph with no layers; no external port dummy nodes except on the uppermost hierarchy
 * level. Postcondition: a compound graph with no layers and no cross-hierarchy edges, but with external ports.
 *
 * The logic lives in the section modules `CompoundGraphPreprocessor{Sections,Segments,Dummies,ExternalPort}.ts`
 * (mission 7h, H11), which read and write the two fields below (Java: private fields of this class; public here so
 * the sections, the Java's methods of this class, can reach them).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export class CompoundGraphPreprocessor implements ILayoutProcessor<LGraph> {
  /** map of original edges to generated cross-hierarchy edges. */
  crossHierarchyMap: Multimap<LEdge, CrossHierarchyEdge> | null = null;
  /** map of ports to their assigned dummy nodes in the nested graphs. */
  readonly dummyNodeMap = new Map<LPort, LNode>();

  process(graph: LGraph, monitor: IElkProgressMonitor): void {
    processCompoundGraphPreprocessor(this, graph, monitor);
  }
}
