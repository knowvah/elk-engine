// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { ForceOptions } from '../options/ForceOptions.js';
import type { FEdge } from './FEdge.js';
import { FParticle } from './FParticle.js';

/**
 * A label in the force graph.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FLabel.java
 */
export class FLabel extends FParticle {
  /** the edge this label is associated to. */
  private readonly edge: FEdge;
  /** label text. */
  private readonly text: string | null;

  /**
   * Create a new label. The label is also put into the edge's list of labels.
   *
   * @param fedge edge corresponding to this label
   * @param text the text of the new label
   */
  constructor(fedge: FEdge, text: string | null) {
    super();
    this.edge = fedge;
    this.text = text;
    this.edge.getLabels().push(this);
  }

  override toString(): string {
    if (this.text === null || this.text.length === 0) {
      return `l[${this.edge.toString()}]`;
    } else {
      return `l_${this.text}`;
    }
  }

  /**
   * Returns the text of this label.
   *
   * @return text of this label
   */
  getText(): string | null {
    return this.text;
  }

  /**
   * Returns the associated edge.
   *
   * @return edge this label is associated to.
   */
  getEdge(): FEdge {
    return this.edge;
  }

  /** Refresh the label position, that is, place it as specified by {@link ForceOptions.EDGE_LABELS_INLINE}. */
  refreshPosition(): void {
    const placeInline = this.getProperty(ForceOptions.EDGE_LABELS_INLINE);
    const src = this.edge.getSource()!.getPosition();
    const tgt = this.edge.getTarget()!.getPosition();

    if (placeInline) {
      const srcToTgt = tgt.clone().sub(src).scale(0.5);
      const toLabelCenter = this.getSize().clone().scale(0.5);
      const newLabelPosition = src.clone().add(srcToTgt).sub(toLabelCenter);
      this.getPosition().set(newLabelPosition);
    } else {
      this.placeBesideEdge(src, tgt);
    }
  }

  /**
   * The `else` arm of `refreshPosition` (`FLabel.java:87-113`), split out for the complexity limits: the label is placed
   * next to the middle of the edge, by the quadrant of the source relative to the target.
   */
  private placeBesideEdge(src: KVector, tgt: KVector): void {
    // TODO The spacing has to be retrieved from the surrounding node/graph
    const spacing = this.edge.getProperty(ForceOptions.SPACING_EDGE_LABEL);
    // TODO add support for head and tail labels
    const pos = this.getPosition();
    if (src.x >= tgt.x) {
      if (src.y >= tgt.y) {
        // CASE1, src top left, tgt bottom right
        pos.x = tgt.x + (src.x - tgt.x) / 2 + spacing;
        pos.y = tgt.y + (src.y - tgt.y) / 2 - spacing - this.getSize().y;
      } else {
        // CASE2, src bottom left, tgt top right
        pos.x = tgt.x + (src.x - tgt.x) / 2 + spacing;
        pos.y = src.y + (tgt.y - src.y) / 2 + spacing;
      }
    } else {
      if (src.y >= tgt.y) {
        // CASE2, src top right, tgt bottom left
        pos.x = src.x + (tgt.x - src.x) / 2 + spacing;
        pos.y = tgt.y + (src.y - tgt.y) / 2 + spacing;
      } else {
        // CASE1, src bottom right, tgt top left
        pos.x = src.x + (tgt.x - src.x) / 2 + spacing;
        pos.y = src.y + (tgt.y - src.y) / 2 - spacing - this.getSize().y;
      }
    }
  }
}
