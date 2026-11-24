// SPDX-License-Identifier: EPL-2.0
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import type { Tree } from '../../common/Tree.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import type { Node } from '../../common/spore/Node.js';
import { SVGImage } from '../../common/utils/SVGImage.js';
import { Utils } from '../../common/utils/Utils.js';
import type { Graph } from '../graph/Graph.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/** One level of the explicit stack of {@link GrowTreePhase.growAt}: the tree and its next child to enter. */
interface GrowFrame {
  readonly tree: Tree<Node>;
  next: number;
}

/** One suspended activation of {@link GrowTreePhase.drawTree}: the tree and its next child to draw. */
interface DrawFrame {
  readonly tree: Tree<Node>;
  next: number;
}

/**
 * This class implements the GTree algorithm of Nachmanson et al..
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java
 */
export class GrowTreePhase implements ILayoutPhase<SPOrEPhases, Graph> {
  private svg!: SVGImage;
  private root!: Tree<Node>;

  private overlapsExisted = false;

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:39 */
  getLayoutProcessorConfiguration(_graph: Graph): LayoutProcessorConfiguration<SPOrEPhases, Graph> {
    return LayoutProcessorConfiguration.create<SPOrEPhases, Graph>();
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:44 */
  process(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Grow Tree', 1);

    // `graph.tree` is set by the processing order phase (the Java would throw a NullPointerException otherwise)
    this.root = graph.tree!;

    if (graph.getProperty(InternalProperties.DEBUG_SVG)) {
      this.svg = new SVGImage(`${String(ElkUtil.debugFolderPath('spore'))}40or`);
      this.svg.addGroups('n', 'e', 'o');
      this.debugOut();
    } else {
      this.svg = new SVGImage(null);
    }

    this.overlapsExisted = false;
    this.growAt(graph.tree!);
    graph.setProperty(InternalProperties.OVERLAPS_EXISTED, this.overlapsExisted);
    progressMonitor.done();
  }

  /**
   * Traverses the Tree and elongates edges where needed. The Java is recursive (`growAt(c)` after each child's
   * update); an explicit stack visits the same nodes in the same order, so a path tree as deep as the 2,000-node
   * chain no longer exhausts V8's call stack together with the whole-tree `debugOut` of every step (mission 8c, PK6).
   * The verbatim recursive form is the reference of `GrowTreePhase.explicit-stack.test.ts`.
   * Also sets the overlapsExisted flag to true if any overlaps had to be removed.
   *
   * @param r the spanning tree
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:68
   */
  private growAt(r: Tree<Node>): void {
    const stack: GrowFrame[] = [{ tree: r, next: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const c = frame.tree.children[frame.next++]!;
        this.growChild(frame.tree, c);
        stack.push({ tree: c, next: 0 });
      } else {
        stack.pop();
      }
    }
  }

  /** The body of the `for` loop of {@link growAt} up to the recursive call: split out at the Java statement group. */
  private growChild(r: Tree<Node>, c: Tree<Node>): void {
    // update position of the child
    c.node.translate(r.node.vertex.clone().sub(r.node.originalVertex));

    // the elongation factor for an edge required to remove overlap
    const t = Utils.overlap(r.node.rect, c.node.rect);
    if (t > 1.0) {
      this.overlapsExisted = true;
    }

    // elongate the edge by factor t to remove overlap
    c.node.setCenterPosition(
      r.node.vertex.clone().add(c.node.originalVertex.clone().sub(r.node.originalVertex).scale(t)),
    );

    this.debugOut(r);
  }

  //--- debug utils --------------------------------------

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:96 */
  private debugOut(c: Tree<Node> | null = null): void {
    this.svg.clearGroup('n');
    this.svg.clearGroup('e');
    this.svg.clearGroup('o');
    this.drawTree(this.root, this.svg);
    this.svg.g('n').addRect(this.root.node.rect, 'fill="blue" stroke="none" opacity="0.2"');
    if (c !== null) {
      this.svg.g('o').addRect(c.node.rect, 'fill="red" stroke="none" opacity="0.2"');
    }
    this.svg.isave();
  }

  /**
   * Draws the tree. The Java recurses (`drawTree(c, img)` at GrowTreePhase.java:112, inside the `forEach` of :110-113).
   * AC6 (#76): explicit stack, same visit and side-effect order. A frame is one suspended Java activation: the tree and
   * its next child. The child's edge is drawn when its parent's frame advances to it, then the child's frame opens and
   * draws its rectangle, as the Java's activation does on entry; children in list order. The trees are not modified
   * while they are drawn, so iterating `children` by index is safe (as in {@link growAt}). The stack is depth-checked
   * after each push (`checkStackDepth` on its length): Java's `StackOverflowError`. The verbatim recursive form is the
   * reference of `GrowTreePhase.explicit-stack.test.ts`.
   *
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:108
   */
  private drawTree(t: Tree<Node>, img: SVGImage): void {
    const stack: DrawFrame[] = [];
    this.openDrawTree(stack, t, img);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const c = frame.tree.children[frame.next++]!;
        const tn = frame.tree.node;
        img.g('e').addLine(tn.vertex.x, tn.vertex.y, c.node.vertex.x, c.node.vertex.y, 'stroke="blue"');
        this.openDrawTree(stack, c, img);
      } else {
        stack.pop();
      }
    }
  }

  /** Entry of one {@link drawTree} activation (GrowTreePhase.java:109): frame, depth check, rectangle. */
  private openDrawTree(stack: DrawFrame[], t: Tree<Node>, img: SVGImage): void {
    stack.push({ tree: t, next: 0 });
    checkStackDepth(stack.length);
    img.g('n').addRect(t.node.rect, 'fill="none" stroke="black"');
  }
}
