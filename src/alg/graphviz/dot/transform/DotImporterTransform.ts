// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IPropertyHolder } from '../../../../graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import * as JavaFloat from '../../../../java/lang/JavaFloat.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { AttributeType } from '../dot/AttributeType.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Statement } from '../dot/Statement.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { DotSwitch } from '../dot/util/DotSwitch.js';
import { Attributes } from './Attributes.js';
import { transformAttribute, trimValue } from './DotImporterAttributes.js';
import { transformEdge, transformNode, transformNodeStatement } from './DotImporterElements.js';
import { PROP_STATEMENT } from './DotImporterProperties.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

// DotImporter, part 3 of 4: the transformation of a statement list. The Java overload
// `transform(List<Statement>, ElkNode, IDotTransformationData, IPropertyHolder, IPropertyHolder)` is
// `transformStatements` (translation rule 6.5: the public `transform(IDotTransformationData)` has the same name and
// another visibility). Its anonymous `DotSwitch<Object>` is the class `StatementSwitch` (translation rule 6.4), which
// receives the captured locals through its constructor and keeps the `caseX` method names.

type TransData = IDotTransformationData<GraphvizModel, ElkNode>;

/** The message of both `catch` blocks of `caseAttribute`. */
function discardMargin(attribute: Attribute): string {
  return `Discarding attribute "${String(attribute.getName())}" since its value could not be parsed correctly.`;
}

/**
 * The anonymous `DotSwitch<Object>` of `transform(List<Statement>, ...)`: every case returns `null`, so the switch
 * goes on to `caseStatement` and `defaultCase`, which return `null` too.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
class StatementSwitch extends DotSwitch<unknown> {
  constructor(
    private readonly parent: ElkNode,
    private readonly transData: TransData,
    private readonly nodeProps: IPropertyHolder,
    private readonly edgeProps: IPropertyHolder,
  ) {
    super();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java */
  override caseNodeStatement(statement: NodeStatement): unknown {
    transformNodeStatement(statement, this.parent, this.transData, this.nodeProps);
    return null;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java */
  override caseEdgeStatement(statement: EdgeStatement): unknown {
    transformEdge(statement, this.parent, this.transData, this.edgeProps);
    return null;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java */
  override caseSubgraph(subgraph: Subgraph): unknown {
    let subElkNode = this.parent;
    if (subgraph.getName() !== null && (subgraph.getName() as string).startsWith('cluster')) {
      subElkNode = transformNode(subgraph.getName(), this.parent, this.transData);
      if (subElkNode.getProperty(PROP_STATEMENT) !== null) {
        this.transData.log(`Discarding cluster subgraph "${String(subgraph.getName())}" since its id is already used.`);
        return null;
      } else {
        // the subgraph inherits all settings of its parent
        subElkNode.copyProperties(this.parent);
        subElkNode.setProperty(PROP_STATEMENT, subgraph);
      }
    }
    const subNodeProps = new MapPropertyHolder();
    subNodeProps.copyProperties(this.nodeProps);
    const subEdgeProps = new MapPropertyHolder();
    subEdgeProps.copyProperties(this.edgeProps);
    transformStatements(subgraph.getStatements(), subElkNode, this.transData, subNodeProps, subEdgeProps);
    return null;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java */
  override caseAttributeStatement(statement: AttributeStatement): unknown {
    switch (statement.getType()) {
      case AttributeType.GRAPH:
        for (const attr of statement.getAttributes()) {
          this.caseAttribute(attr);
        }
        break;
      case AttributeType.NODE:
        for (const attr of statement.getAttributes()) {
          transformAttribute(this.nodeProps, attr, this.transData);
        }
        break;
      case AttributeType.EDGE:
        for (const attr of statement.getAttributes()) {
          transformAttribute(this.edgeProps, attr, this.transData);
        }
        break;
    }
    return null;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java */
  override caseAttribute(attribute: Attribute): unknown {
    if (Attributes.MARGIN === attribute.getName()) {
      const padding = this.parent.getProperty(CoreOptions.PADDING);
      if ((attribute.getValue() as string).indexOf(',') >= 0) {
        this.caseAttributeMarginVector(attribute, padding);
      } else {
        this.caseAttributeMarginValue(attribute, padding);
      }
    } else {
      transformAttribute(this.parent, attribute, this.transData);
    }
    return null;
  }

  /** The `margin` arm of `caseAttribute` for a value with a comma, split for the complexity limits. */
  private caseAttributeMarginVector(attribute: Attribute, padding: ElkPadding): void {
    const value = new KVector();
    try {
      value.parse(attribute.getValue() as string);
      padding.setLeft(Float32.fromDouble(value.x));
      padding.setRight(Float32.fromDouble(value.x));
      padding.setTop(Float32.fromDouble(value.y));
      padding.setBottom(Float32.fromDouble(value.y));
    } catch (exception) {
      if (!(exception instanceof IllegalArgumentException)) throw exception;
      this.transData.log(discardMargin(attribute));
    }
  }

  /** The `margin` arm of `caseAttribute` for a single value, split for the complexity limits. */
  private caseAttributeMarginValue(attribute: Attribute, padding: ElkPadding): void {
    try {
      const value = JavaFloat.parseFloat(trimValue(attribute));
      padding.setLeft(value);
      padding.setRight(value);
      padding.setTop(value);
      padding.setBottom(value);
    } catch (exception) {
      if (!(exception instanceof NumberFormatException)) throw exception;
      this.transData.log(discardMargin(attribute));
    }
  }
}

/**
 * Transform a Dot graph to a KNode (Java `transform(List<Statement>, ElkNode, IDotTransformationData,
 * IPropertyHolder, IPropertyHolder)`).
 *
 * @param statements a list of Dot statements
 * @param parent a KNode
 * @param transData transformation data instance
 * @param nodeProps properties that are applied to all nodes
 * @param edgeProps properties that are applied to all edges
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export function transformStatements(
  statements: Iterable<Statement>,
  parent: ElkNode,
  transData: TransData,
  nodeProps: IPropertyHolder,
  edgeProps: IPropertyHolder,
): void {
  const statementSwitch = new StatementSwitch(parent, transData, nodeProps, edgeProps);
  for (const statement of statements) {
    statementSwitch.doSwitch(statement);
  }
}
