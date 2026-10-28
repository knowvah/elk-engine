// SPDX-License-Identifier: EPL-2.0
import type { ElkLabel } from '../../../../graph/ElkLabel.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LLabel } from '../LLabel.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Label Transformation

/**
 * Transform the given `ElkLabel` into an `LLabel`.
 *
 * @param elklabel the label to transform.
 * @return the created `LLabel`.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function transformLabel(elklabel: ElkLabel): LLabel {
  const newLabel = new LLabel(elklabel.getText() as string); // every caller has checked the text is neither null nor empty

  newLabel.copyProperties(elklabel);
  newLabel.setProperty(InternalProperties.ORIGIN, elklabel);

  newLabel.getSize().x = elklabel.getWidth();
  newLabel.getSize().y = elklabel.getHeight();
  newLabel.getPosition().x = elklabel.getX();
  newLabel.getPosition().y = elklabel.getY();

  return newLabel;
}
