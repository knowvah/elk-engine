// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import type { LLabel } from '../graph/LLabel.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import * as Lists from '../../../guava/Lists.js';

/** What `placeLabelsForVerticalLayout` needs beyond the shared arguments (the Java passes them as parameters 5 and 6). */
export interface VerticalPlacementMode {
  readonly leftAligned: boolean;
  readonly layoutDirection: Direction;
}

/**
 * Places the labels one below the other, each centred horizontally in the label space.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummyRemover.java:135
 */
export function placeLabelsForHorizontalLayout(
  labels: LLabel[],
  labelPos: KVector,
  labelSpacing: number,
  labelSpace: KVector,
): void {
  for (const label of labels) {
    label.getPosition().x = labelPos.x + (labelSpace.x - label.getSize().x) / 2.0;
    label.getPosition().y = labelPos.y;

    labelPos.y += label.getSize().y + labelSpacing;
  }
}

/**
 * Places the labels next to each other, aligned by `mode` (the Java's trailing parameters `leftAligned` and
 * `layoutDirection` are one object here, for the five-parameter limit).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummyRemover.java:147
 */
export function placeLabelsForVerticalLayout(
  labels: LLabel[],
  labelPos: KVector,
  labelSpacing: number,
  labelSpace: KVector,
  mode: VerticalPlacementMode,
): void {
  // We may have to override the alignment if all labels here are inline labels
  const inline = labels.every((label) => label.getProperty(LayeredOptions.EDGE_LABELS_INLINE));

  // Due to the way layout directions work, we need to pay attention to the order in which we place labels. While
  // we can simply place them as they come for the DOWN direction, doing the same for the UP direction will
  // reverse the label order in the final result. Thus, in that case we iterate over the reversed label list
  const effectiveLabels: Iterable<LLabel> = mode.layoutDirection === Direction.UP ? Lists.reverse(labels) : labels;

  for (const label of effectiveLabels) {
    label.getPosition().x = labelPos.x;

    if (inline) {
      label.getPosition().y = labelPos.y + (labelSpace.y - label.getSize().y) / 2;
    } else if (mode.leftAligned) {
      label.getPosition().y = labelPos.y;
    } else {
      label.getPosition().y = labelPos.y + labelSpace.y - label.getSize().y;
    }

    labelPos.x += label.getSize().x + labelSpacing;
  }
}
