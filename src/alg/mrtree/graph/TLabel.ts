// SPDX-License-Identifier: EPL-2.0
import type { TEdge } from './TEdge.js';
import { TShape } from './TShape.js';

/**
 * A label in the T graph.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TLabel.java
 */
export class TLabel extends TShape {
  /** the edge this label is associated to. */
  private readonly edge: TEdge;
  /** label text. */
  private readonly text: string | null;

  /**
   * Create a new label. The label is also put into the edge's list of labels.
   *
   * @param tedge edge corresponding to this label
   * @param text the text of the new label
   */
  constructor(tedge: TEdge, text: string | null) {
    super();
    this.edge = tedge;
    this.text = text;
    this.edge.getLabels().add(this);
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
  getEdge(): TEdge {
    return this.edge;
  }
}
