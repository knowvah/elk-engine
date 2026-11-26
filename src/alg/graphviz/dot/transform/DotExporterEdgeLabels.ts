// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../../core/options/EdgeLabelPlacement.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkLabel } from '../../../../graph/ElkLabel.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../../../java/lang/Unbox.js';
import type { Attribute } from '../dot/Attribute.js';
import { Attributes } from './Attributes.js';
import { createAttribute, createAttributeInt, createString } from './DotExporterAttributes.js';
import { FONT_SIZE_MULT } from './DotExporterProperties.js';

/** The locals of `DotExporter.setEdgeLabels`: the three stacked labels and the chosen font. */
interface LabelStack {
  midLabel: string;
  headLabel: string;
  tailLabel: string;
  fontName: string | null;
  fontSize: number;
  isCenterFontName: boolean;
  isCenterFontSize: boolean;
}

type Buffer = 'midLabel' | 'headLabel' | 'tailLabel';

const ELK_LABEL = 'org.eclipse.elk.graph.ElkLabel';

/**
 * The body of the protected `DotExporter.setEdgeLabels` after its empty-label return, split off `DotExporter.ts` for
 * the 500-line limit and into its loop body and its attribute part for the function limits (statement order kept).
 * The class keeps `setEdgeLabels` itself, so subclasses override it as in Java. A Java `StringBuilder` is a string.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export const DotExporterEdgeLabels = {
  /**
   * The label loop of `setEdgeLabels`: stacks all labels into one per placement and picks the font.
   *
   * @param elkedge the edge, which has labels
   * @returns the stacked labels and the font
   */
  stack(elkedge: ElkEdge): LabelStack {
    const stack: LabelStack = {
      midLabel: '',
      headLabel: '',
      tailLabel: '',
      fontName: null,
      fontSize: 0,
      isCenterFontName: false,
      isCenterFontSize: false,
    };
    for (const label of elkedge.getLabels()) {
      takeLabel(label, stack);
    }
    return stack;
  },

  /**
   * The attribute part of `setEdgeLabels`: the padded mid label, the head and tail labels, the font name and size.
   *
   * @param elkedge the edge
   * @param attributes edge attribute list to which the labels are added
   * @param isVertical indicates whether vertical layout direction is active
   * @param stack the stacked labels and the font
   */
  addAttributes(elkedge: ElkEdge, attributes: EList<Attribute>, isVertical: boolean, stack: LabelStack): void {
    // set mid label: if empty, it is filled with a dummy string to avoid
    // edge overlapping
    if (stack.midLabel.length > 0) {
      let labelSpacing = elkedge.getProperty(CoreOptions.SPACING_EDGE_LABEL);
      if (labelSpacing < 1) {
        labelSpacing = 0;
      }
      const charsToAdd = Int32.sub(d2i(labelSpacing), 1);
      for (let i = 0; i < charsToAdd; i++) {
        stack.midLabel += isVertical ? 'O' : '\nO';
      }
      attributes.add(createAttribute(Attributes.LABEL, createString(stack.midLabel)));
    }
    // set head label
    if (stack.headLabel.length > 0) {
      attributes.add(createAttribute(Attributes.HEADLABEL, createString(stack.headLabel)));
    }
    // set tail label
    if (stack.tailLabel.length > 0) {
      attributes.add(createAttribute(Attributes.TAILLABEL, createString(stack.tailLabel)));
    }
    // set font name
    if (stack.fontName !== null && stack.fontName.length > 0) {
      attributes.add(createAttribute(Attributes.FONTNAME, `"${stack.fontName}"`));
    }
    // set font size
    if (stack.fontSize > 0) {
      attributes.add(createAttributeInt(Attributes.FONTSIZE, stack.fontSize));
    }
  },
} as const;

/** What the `switch (placement)` of the label loop chose: the buffer and whether to take the font. */
interface Take {
  readonly buffer: Buffer;
  readonly takeFontName: boolean;
  readonly takeFontSize: boolean;
}

/**
 * One pass of the label loop of `setEdgeLabels`: the placement switch, the buffer append, then the font. Split into
 * three functions for the function-length limit, statement order kept.
 */
function takeLabel(label: ElkLabel, stack: LabelStack): void {
  const take = takePlacement(label, stack);
  takeText(label, stack, take.buffer);
  takeFont(label, stack, take);
}

/**
 * The `switch (placement)` of the label loop of `setEdgeLabels`. The placement is never null: the option has a default
 * and `setProperty(key, null)` removes the entry, as in Java.
 */
function takePlacement(label: ElkLabel, stack: LabelStack): Take {
  const placement = label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT);
  switch (placement) {
    case EdgeLabelPlacement.HEAD:
      return { buffer: 'headLabel', takeFontName: stack.fontName === null, takeFontSize: stack.fontSize <= 0 };
    case EdgeLabelPlacement.TAIL:
      return { buffer: 'tailLabel', takeFontName: stack.fontName === null, takeFontSize: stack.fontSize <= 0 };
    default: {
      // CENTER
      const takeFontName = stack.fontName === null || !stack.isCenterFontName;
      stack.isCenterFontName = true;
      const takeFontSize = stack.fontSize <= 0 || !stack.isCenterFontSize;
      stack.isCenterFontSize = true;
      return { buffer: 'midLabel', takeFontName, takeFontSize };
    }
  }
}

/**
 * The buffer appends of the label loop of `setEdgeLabels`: `buffer.append(label.getText())` appends `"null"` for a
 * null text, as `StringBuilder.append(String)` does.
 */
function takeText(label: ElkLabel, stack: LabelStack, buffer: Buffer): void {
  if (stack[buffer].length > 0) {
    stack[buffer] += '\n';
  }
  stack[buffer] += String(label.getText());
}

/**
 * The font part of the label loop of `setEdgeLabels`. The `Integer` font size is unboxed, so a label without
 * `font.size` throws the NullPointerException of the Java (a `TypeError`); `fontSize *= FONT_SIZE_MULT` is an `int`
 * compound assignment, which narrows `(int) (fontSize * 1.4)`.
 */
function takeFont(label: ElkLabel, stack: LabelStack, take: Take): void {
  if (take.takeFontName) {
    stack.fontName = label.getProperty(CoreOptions.FONT_NAME);
  }
  if (take.takeFontSize) {
    stack.fontSize = unboxInteger(label.getProperty(CoreOptions.FONT_SIZE), PROPERTY_RETURN_VALUE(ELK_LABEL));
    // increase the font size to let Graphviz prepare more room for the label
    if (stack.fontSize > 0) {
      stack.fontSize = d2i(stack.fontSize * FONT_SIZE_MULT);
    }
  }
}
