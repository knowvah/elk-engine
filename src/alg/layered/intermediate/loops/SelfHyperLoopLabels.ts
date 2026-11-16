// SPDX-License-Identifier: EPL-2.0
import type { ILabelManager } from '../../../../core/labels/ILabelManager.js';
import { KVector } from '../../../../core/math/KVector.js';
import type { Direction } from '../../../../core/options/Direction.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LLabel } from '../../graph/LLabel.js';
import { LGraphUtil } from '../../graph/LGraphUtil.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LabelManagementProcessor } from '../LabelManagementProcessor.js';
import { Alignment } from './SelfHyperLoopLabelsAlignment.js';
import type { SelfHyperLoop } from './SelfHyperLoop.js';
import type { SelfLoopPort } from './SelfLoopPort.js';

export { Alignment };

/**
 * Represents the labels associated with a {@link SelfHyperLoop}. The labels are gathered as edges are added to the
 * hyper loop. Their actual position is determined by a port side and an alignment on that side.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfHyperLoopLabels.java
 */
export class SelfHyperLoopLabels {
  /** An ID that can be used arbitrarily. */
  id = 0;

  /** The labels represented by this instance. */
  private readonly lLabels: LLabel[] = [];
  /** The size required to place all labels. */
  private readonly size = new KVector();
  /** The position of our bounding box's top left corner. */
  private readonly position = new KVector();
  /** The graph's layout direction. Influences the way the labels will be placed. */
  private readonly layoutDirection: Direction;
  /** Space to leave between adjacent labels. */
  private readonly labelLabelSpacing: number;

  /** The side the label is placed on. */
  private side: PortSide | null = null;
  /** The label's alignment. */
  private alignment: Alignment | null = null;
  /** The port any non-center alignment is relative to. */
  private alignmentReferenceSLPort: SelfLoopPort | null = null;

  /** Creates a new instance for the given {@link SelfHyperLoop}. */
  constructor(slLoop: SelfHyperLoop) {
    // Initialize our properties from the graph
    const lNode = slLoop.getSLHolder().getLNode();

    this.layoutDirection = lNode.getGraph()!.getProperty(LayeredOptions.DIRECTION);
    // Java unboxes the nullable `Double` result: a missing value is a NullPointerException
    this.labelLabelSpacing = LGraphUtil.getIndividualOrInherited(lNode, LayeredOptions.SPACING_LABEL_LABEL)!;
  }

  // LLabel Access

  /** Adds the given collection of labels to this instance. */
  addLLabels(newLLabels: Iterable<LLabel>): void {
    for (const newLLabel of newLLabels) {
      this.lLabels.push(newLLabel);
      this.updateSize(newLLabel);
    }
  }

  /** Returns the labels represented by this instance. */
  getLLabels(): LLabel[] {
    return this.lLabels;
  }

  /** Updates our size under the assumption that the given label was just added to this instance. */
  private updateSize(newLLabel: LLabel): void {
    // (Java line 112 `assert lLabels.get(lLabels.size() - 1) == newLLabel` omitted: assertions are off.)
    const newLLabelSize = newLLabel.getSize();

    if (this.layoutDirection.isHorizontal()) {
      // The labels will be stacked vertically
      this.size.x = Math.max(this.size.x, newLLabelSize.x);
      this.size.y += newLLabelSize.y;

      // Add a label-label spacing if we already had labels
      if (this.lLabels.length > 1) {
        this.size.y += this.labelLabelSpacing;
      }
    } else {
      // The labels will be stacked horizontally
      this.size.x += newLLabelSize.x;
      this.size.y = Math.max(this.size.y, newLLabelSize.y);

      // Add a label-label spacing if we already had labels
      if (this.lLabels.length > 1) {
        this.size.x += this.labelLabelSpacing;
      }
    }
  }

  /** Applies label management with the given target width to our labels and updates our size. */
  applyLabelManagement(labelManager: ILabelManager, targetWidth: number): void {
    this.size.set(
      LabelManagementProcessor.doManageLabels(
        labelManager,
        this.lLabels,
        targetWidth,
        this.labelLabelSpacing,
        this.layoutDirection.isVertical(),
      ),
    );
  }

  /** Applies the bounding box placement to the individual labels. */
  applyPlacement(offset: KVector): void {
    if (this.layoutDirection.isHorizontal()) {
      this.applyPlacementForHorizontalLayout(offset);
    } else {
      this.applyPlacementVerticalForVerticalLayout(offset);
    }
  }

  private applyPlacementForHorizontalLayout(offset: KVector): void {
    const x = this.position.x;
    let y = this.position.y;

    for (const lLabel of this.lLabels) {
      const labelPos = lLabel.getPosition();

      // X coordinate depends on alignment and / or side
      if (this.alignment === Alignment.LEFT || this.side === PortSide.EAST) {
        labelPos.x = x;
      } else if (this.alignment === Alignment.RIGHT || this.side === PortSide.WEST) {
        labelPos.x = x + this.size.x - lLabel.getSize().x;
      } else {
        // Alignment is center
        labelPos.x = x + (this.size.x - lLabel.getSize().x) / 2;
      }

      labelPos.y = y;
      labelPos.add(offset);

      y += lLabel.getSize().y + this.labelLabelSpacing;
    }
  }

  private applyPlacementVerticalForVerticalLayout(offset: KVector): void {
    let x = this.position.x;
    const y = this.position.y;

    for (const lLabel of this.lLabels) {
      const labelPos = lLabel.getPosition();

      labelPos.x = x;

      // We always top-align, except for the northern side
      if (this.side === PortSide.NORTH) {
        labelPos.y = y + this.size.y - lLabel.getSize().y;
      } else {
        labelPos.y = y;
      }

      labelPos.add(offset);

      x += lLabel.getSize().x + this.labelLabelSpacing;
    }
  }

  // Label Placement

  /** The size of the box required to place the labels. Shouldn't be modified by clients. */
  getSize(): KVector {
    return this.size;
  }

  /** Position of the bounding box's top left corner. To be modified by clients. */
  getPosition(): KVector {
    return this.position;
  }

  /** Returns the side this label is placed on. May be `null` if the side was not determined yet. */
  getSide(): PortSide | null {
    return this.side;
  }

  /** Sets the side this label is placed on. */
  setSide(side: PortSide | null): void {
    this.side = side;
  }

  /** Returns this label's alignment May be `null` if the alignment was not determined yet. */
  getAlignment(): Alignment | null {
    return this.alignment;
  }

  /** Sets this label's alignment. */
  setAlignment(alignment: Alignment | null): void {
    this.alignment = alignment;
  }

  /**
   * Returns the port the alignment is relative to. This will only be non-`null` (and thus meaningful) if the alignment
   * is not {@link Alignment.CENTER}.
   */
  getAlignmentReferenceSLPort(): SelfLoopPort | null {
    return this.alignmentReferenceSLPort;
  }

  /**
   * Sets the port the alignment is relative to. Should only be called if the alignment is not
   * {@link Alignment.CENTER}.
   */
  setAlignmentReferenceSLPort(alignmentReferenceSLPort: SelfLoopPort | null): void {
    this.alignmentReferenceSLPort = alignmentReferenceSLPort;
  }
}
