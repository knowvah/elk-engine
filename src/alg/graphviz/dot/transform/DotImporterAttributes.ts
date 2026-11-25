// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IPropertyHolder } from '../../../../graph/properties/IPropertyHolder.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import * as JavaBoolean from '../../../../java/lang/JavaBoolean.js';
import * as JavaDouble from '../../../../java/lang/JavaDouble.js';
import * as JavaFloat from '../../../../java/lang/JavaFloat.js';
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import * as JavaString from '../../../../java/lang/JavaString.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { StringIndexOutOfBoundsException } from '../../../../java/lang/StringIndexOutOfBoundsException.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import type { Attribute } from '../dot/Attribute.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { Attributes } from './Attributes.js';
import { Command } from './Command.js';
import { DotExporter } from './DotExporter.js';
import type { IDotTransformationData } from './IDotTransformationData.js';
import { PROP_DEF_HEIGHT, PROP_DEF_WIDTH } from './DotImporterProperties.js';

// DotImporter, part 1 of 4: `transformAttribute` and `trimValue`. The if-else chain of `transformAttribute` is split
// for the complexity limits (CCN 10) into the helpers below, named after it; the chain's order and every branch are
// the Java ones.

type TransData = IDotTransformationData<GraphvizModel, ElkNode>;

/** The algorithm id prefix of a Graphviz command. */
const GRAPHVIZ_ALGORITHM_PREFIX = 'org.eclipse.elk.algorithm.graphviz.';
/** The prefix of a random start value. */
const RANDOM = 'random';

/**
 * Apply the property given in the attribute to a property holder.
 *
 * @param target the property holder that receives the new property
 * @param attribute a Graphviz attribute that contains the property
 * @param transData transformation data
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformAttribute(target: IPropertyHolder, attribute: Attribute, transData: TransData): void {
  const name = attribute.getName();
  const value = trimValue(attribute);
  try {
    transformAttributeChain(target, name, value);
  } catch (exception) {
    if (exception instanceof NumberFormatException) {
      transData.log(
        `Discarding attribute ${String(attribute.getName())}=${String(attribute.getValue())}` +
          ' since its value could not be parsed correctly.',
      );
    } else if (exception instanceof IllegalArgumentException) {
      transData.log(
        `Discarding attribute ${String(attribute.getName())}=${String(attribute.getValue())}` +
          ' since its value could not be parsed correctly.',
      );
    } else {
      throw exception;
    }
  }
}

/**
 * The `try` block of `transformAttribute`: the first six arms of its if-else chain (`layout` to `pack`); the rest is
 * {@link transformAttributeChainRest}.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeChain(target: IPropertyHolder, name: string | null, value: string): void {
  if (Attributes.LAYOUT === name) {
    transformAttributeLayout(target, value);
  } else if (Attributes.WIDTH === name) {
    target.setProperty(PROP_DEF_WIDTH, Float32.mul(JavaFloat.parseFloat(value), DotExporter.DPI));
  } else if (Attributes.HEIGHT === name) {
    target.setProperty(PROP_DEF_HEIGHT, Float32.mul(JavaFloat.parseFloat(value), DotExporter.DPI));
  } else if (Attributes.FIXEDSIZE === name) {
    const fixedSize = JavaBoolean.valueOf(value);
    target.setProperty(
      CoreOptions.NODE_SIZE_CONSTRAINTS,
      fixedSize ? SizeConstraint.fixed() : EnumSet.of(SizeConstraint.MINIMUM_SIZE),
    );
  } else if (Attributes.NODESEP === name) {
    target.setProperty(CoreOptions.SPACING_NODE_NODE, JavaDouble.parseDouble(value));
  } else if (Attributes.PACK === name) {
    target.setProperty(CoreOptions.SEPARATE_CONNECTED_COMPONENTS, JavaBoolean.valueOf(value));
  } else {
    transformAttributeChainRest(target, name, value);
  }
}

/**
 * The remaining arms of the if-else chain of `transformAttribute` (`pad` to `weight`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeChainRest(target: IPropertyHolder, name: string | null, value: string): void {
  if (Attributes.PAD === name) {
    transformAttributePad(target, value);
  } else if (Attributes.RANKDIR === name) {
    transformAttributeRankdir(target, value);
  } else if (Attributes.SPLINES === name) {
    transformAttributeSplines(target, value);
  } else if (Attributes.START === name) {
    transformAttributeStart(target, value);
  } else if (Attributes.WEIGHT === name) {
    target.setProperty(CoreOptions.PRIORITY, d2i(JavaFloat.parseFloat(value)));
  }
}

/**
 * The `layout` arm of `transformAttribute`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeLayout(target: IPropertyHolder, value: string): void {
  const command = Command.parse(value);
  if (command !== Command.INVALID) {
    target.setProperty(CoreOptions.ALGORITHM, GRAPHVIZ_ALGORITHM_PREFIX + command.toString());
  } else {
    target.setProperty(CoreOptions.ALGORITHM, value);
  }
}

/**
 * The `pad` arm of `transformAttribute`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributePad(target: IPropertyHolder, value: string): void {
  if (value.indexOf(',') >= 0) {
    const pad = new KVector();
    pad.parse(value);
    const padding = new ElkPadding(pad.x / 2, pad.y / 2);
    target.setProperty(CoreOptions.PADDING, padding);
  } else {
    target.setProperty(CoreOptions.PADDING, new ElkPadding(JavaFloat.parseFloat(value)));
  }
}

/**
 * The `rankdir` arm of `transformAttribute`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeRankdir(target: IPropertyHolder, value: string): void {
  if (value === 'TB') {
    target.setProperty(CoreOptions.DIRECTION, Direction.DOWN);
  } else if (value === 'BT') {
    target.setProperty(CoreOptions.DIRECTION, Direction.UP);
  } else if (value === 'LR') {
    target.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
  } else if (value === 'RL') {
    target.setProperty(CoreOptions.DIRECTION, Direction.LEFT);
  }
}

/**
 * The `splines` arm of `transformAttribute`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeSplines(target: IPropertyHolder, value: string): void {
  if (value === 'spline' || value === 'true') {
    target.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.SPLINES);
  } else if (value === 'polyline' || value === 'line' || value === 'false') {
    target.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.POLYLINE);
  } else if (value === 'ortho') {
    target.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
  }
}

/**
 * The `start` arm of `transformAttribute`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
function transformAttributeStart(target: IPropertyHolder, value: string): void {
  if (value.startsWith(RANDOM)) {
    let random = 0;
    try {
      random = JavaInteger.valueOf(value.substring(RANDOM.length));
    } catch (e) {
      // ignore exception
      if (!(e instanceof NumberFormatException)) throw e;
    }
    target.setProperty(CoreOptions.RANDOM_SEED, random);
  }
}

/**
 * Remove the quote characters leading and trailing the attribute value.
 *
 * @param attribute an attribute
 * @return a trimmed value of the attribute
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function trimValue(attribute: Attribute): string {
  let value = attribute.getValue();
  if (value === null) {
    value = 'true';
  } else if (value.startsWith('"') && value.endsWith('"')) {
    return JavaString.trim(substring(value, 1, value.length - 1));
  }
  return value;
}

/**
 * Java `String.substring(beginIndex, endIndex)`: throws where JS `substring` would swap the bounds (the value `"`
 * of one quote character gives begin 1 > end 0).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#substring(int,int)
 */
function substring(s: string, beginIndex: number, endIndex: number): string {
  if (beginIndex < 0 || beginIndex > endIndex || endIndex > s.length) {
    throw new StringIndexOutOfBoundsException(`begin ${beginIndex}, end ${endIndex}, length ${s.length}`);
  }
  return s.substring(beginIndex, endIndex);
}
