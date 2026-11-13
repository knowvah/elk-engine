// SPDX-License-Identifier: EPL-2.0
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { Tree } from '../../common/Tree.js';
import { DepthFirstCompaction } from '../../common/spore/DepthFirstCompaction.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import type { Node } from '../../common/spore/Node.js';
import { SVGImage } from '../../common/utils/SVGImage.js';
import type { Graph } from '../graph/Graph.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * This phase compacts the {@link Graph} by shrinking the previously created {@link Tree}, i.e. shortening the
 * edges of the tree to reduce underlap of the nodes.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/ShrinkTreeCompactionPhase.java
 */
export class ShrinkTreeCompactionPhase implements ILayoutPhase<SPOrEPhases, Graph> {
  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/ShrinkTreeCompactionPhase.java:37 */
  getLayoutProcessorConfiguration(_graph: Graph): LayoutProcessorConfiguration<SPOrEPhases, Graph> {
    return LayoutProcessorConfiguration.create<SPOrEPhases, Graph>();
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/ShrinkTreeCompactionPhase.java:42 */
  process(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Shrinking tree compaction', 1);

    // `graph.tree` is set by the processing order phase (the Java would throw a NullPointerException otherwise)
    const tree = graph.tree!;
    if (graph.getProperty(InternalProperties.DEBUG_SVG)) {
      this.debugOut(tree);
      DepthFirstCompaction.compact(
        tree,
        graph.orthogonalCompaction,
        `${String(ElkUtil.debugFolderPath('spore'))}60compaction`,
      );
    } else {
      DepthFirstCompaction.compact(tree, graph.orthogonalCompaction);
    }

    progressMonitor.done();
  }

  //--- debug utils --------------------------------------

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/ShrinkTreeCompactionPhase.java:59 */
  private debugOut(tree: Tree<Node>): void {
    const svg = new SVGImage(`${String(ElkUtil.debugFolderPath('spore'))}30Tree`);
    svg.clear();
    svg.addCircle(tree.node.vertex.x, tree.node.vertex.y, 10, 'fill="lime"');
    this.draw(tree, svg);
    svg.save();
    svg.debug = false;
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/ShrinkTreeCompactionPhase.java:69 */
  private draw(t: Tree<Node>, svg: SVGImage): void {
    svg.addRect(t.node.rect, 'fill="none" stroke="black"');
    t.children.forEach((c) => {
      svg.addLine(t.node.vertex.x, t.node.vertex.y, c.node.vertex.x, c.node.vertex.y, 'stroke="blue"');
      const cv = t.node.vertex.clone().sub(c.node.vertex);
      cv.scaleToLength(t.node.distance(c.node, cv));
      svg.addLine(c.node.vertex.x, c.node.vertex.y, c.node.vertex.x + cv.x, c.node.vertex.y + cv.y, 'stroke="orange"');
      this.draw(c, svg);
    });
  }
}
